// Los propulsores del Albatros II (Fase 11, decisión D2 de docs/plan-fase-11-nave.md): la nave solo se mueve y
// gira por lo que empujan sus toberas. Cada una tiene un sitio y una dirección en ejes de la nave, así que empuja
// (aceleración) y hace girar (par). El ordenador de vuelo pide una aceleración y un giro, y `allocateThrust` reparte
// el encargo entre las toberas (de 0 a 1 cada una, sin tirar nunca); lo que de verdad sale es la suma de lo que
// empujan, que es lo que se aplica a la nave y lo que se ve arder. Lógica pura, con tests.
//
// Ejes de la nave (como una cámara de Three.js): +X derecha, +Y arriba, −Z proa.
import { Vector3 } from 'three';
import {
  SHIP_INERTIA,
  SHIP_LIFT_THRUST,
  SHIP_MAIN_THRUST,
  SHIP_RCS_TANGENT_THRUST,
  SHIP_RCS_VERTICAL_THRUST,
  SHIP_RETRO_THRUST,
} from '../data/ship';

export type ThrusterGroup = 'main' | 'retro' | 'lift' | 'rcs';

export interface Thruster {
  /** Nombre corto para el modelo y los tests (`rcs_proa_arriba`, `main_babor`…). */
  readonly id: string;
  readonly group: ThrusterGroup;
  /** Dónde está la tobera (m, ejes de la nave). */
  readonly position: Vector3;
  /** Hacia dónde empuja a la nave (unitario); la llama sale al revés. */
  readonly direction: Vector3;
  /** Aceleración que da a pleno (m/s²). */
  readonly max: number;
}

/** El centro de masas (m, ejes de la nave): bajo, a la altura de los motores, que así empujan sin hacerla cabecear. */
export const CENTER_OF_MASS = new Vector3(0, -0.35, 0);
/** Separación de los motores y de los retrocohetes respecto al eje de proa a popa (m). */
export const ENGINE_OFFSET_X = 1.35;

/** Radio del anillo de toberas de maniobra y su altura (m): en el borde del disco. */
export const RCS_RING = 4.25;
export const RCS_HEIGHT = -0.45;

/** Los cuatro grupos de maniobra en el borde: proa, popa, babor y estribor, con su tangente (sentido +). */
const QUADS = [
  { name: 'proa', at: new Vector3(0, RCS_HEIGHT, -RCS_RING), tangent: new Vector3(1, 0, 0) },
  { name: 'popa', at: new Vector3(0, RCS_HEIGHT, RCS_RING), tangent: new Vector3(1, 0, 0) },
  { name: 'babor', at: new Vector3(-RCS_RING, RCS_HEIGHT, 0), tangent: new Vector3(0, 0, 1) },
  { name: 'estribor', at: new Vector3(RCS_RING, RCS_HEIGHT, 0), tangent: new Vector3(0, 0, 1) },
] as const;

function thruster(
  id: string,
  group: ThrusterGroup,
  position: Vector3,
  direction: Vector3,
  max: number,
): Thruster {
  return Object.freeze({
    id,
    group,
    position: position.clone(),
    direction: direction.clone().normalize(),
    max,
  });
}

function layout(): readonly Thruster[] {
  const list: Thruster[] = [];
  // Dos motores principales en la popa: empujan hacia la proa.
  const sides = [
    ['babor', -ENGINE_OFFSET_X],
    ['estribor', ENGINE_OFFSET_X],
  ] as const;
  for (const [side, x] of sides) {
    list.push(
      thruster(
        `main_${side}`,
        'main',
        new Vector3(x, CENTER_OF_MASS.y, 4.05),
        new Vector3(0, 0, -1),
        SHIP_MAIN_THRUST,
      ),
    );
  }
  // Dos retrocohetes en la proa, bajo el ventanal: empujan hacia la popa (frenan) y su fuego sale por delante.
  for (const [side, x] of sides) {
    list.push(
      thruster(
        `retro_${side}`,
        'retro',
        new Vector3(x, CENTER_OF_MASS.y, -4.05),
        new Vector3(0, 0, 1),
        SHIP_RETRO_THRUST,
      ),
    );
  }
  // Cuatro toberas de sustentación en la panza: empujan hacia arriba.
  for (const [name, x, z] of [
    ['proa_babor', -1.7, -1.7],
    ['proa_estribor', 1.7, -1.7],
    ['popa_babor', -1.7, 1.7],
    ['popa_estribor', 1.7, 1.7],
  ] as const) {
    list.push(
      thruster(
        `lift_${name}`,
        'lift',
        new Vector3(x, -1.3, z),
        new Vector3(0, 1, 0),
        SHIP_LIFT_THRUST,
      ),
    );
  }
  // En cada grupo de maniobra: arriba, abajo y a los dos lados del borde.
  for (const { name, at, tangent } of QUADS) {
    list.push(
      thruster(`rcs_${name}_arriba`, 'rcs', at, new Vector3(0, 1, 0), SHIP_RCS_VERTICAL_THRUST),
      thruster(`rcs_${name}_abajo`, 'rcs', at, new Vector3(0, -1, 0), SHIP_RCS_VERTICAL_THRUST),
      thruster(`rcs_${name}_mas`, 'rcs', at, tangent, SHIP_RCS_TANGENT_THRUST),
      thruster(`rcs_${name}_menos`, 'rcs', at, tangent.clone().negate(), SHIP_RCS_TANGENT_THRUST),
    );
  }
  return Object.freeze(list);
}

export const THRUSTERS: readonly Thruster[] = layout();

/** Por debajo de este nivel la tobera apenas empuja: no se ve su llama ni cuenta como encendida. */
export const VISIBLE_THRUST = 0.05;

/**
 * Cuánto pesa el giro frente al empuje al repartir (m/s² por rad/s²): sin esto, el reparto sacrificaría los giros,
 * que en números son más pequeños.
 */
const TURN_WEIGHT = 4;
/** Vueltas de reparto por paso. */
const SWEEPS = 24;
/** Lo que cuesta encender una tobera: así no arden dos opuestas para nada. */
const FUEL_COST = 0.02;

/** Componentes de lo que hace cada tobera: 3 de aceleración y 3 de giro (ya ponderado). */
const ROW = 6;
const COUNT = THRUSTERS.length;
/** Lo que hace cada tobera a pleno, en filas de 6 seguidas (tobera i: posiciones 6i a 6i + 5). */
const columns = new Float64Array(COUNT * ROW);
/** El cuadrado de la longitud de cada fila. */
const columnNorms = new Float64Array(COUNT);
THRUSTERS.forEach((t, i) => {
  const arm = t.position.clone().sub(CENTER_OF_MASS);
  const torque = new Vector3().crossVectors(arm, t.direction).multiplyScalar(t.max);
  const row = [
    t.direction.x * t.max,
    t.direction.y * t.max,
    t.direction.z * t.max,
    (torque.x / SHIP_INERTIA.x) * TURN_WEIGHT,
    (torque.y / SHIP_INERTIA.y) * TURN_WEIGHT,
    (torque.z / SHIP_INERTIA.z) * TURN_WEIGHT,
  ];
  columns.set(row, i * ROW);
  columnNorms[i] = row.reduce((sum, v) => sum + v * v, 0);
});
const residual = new Float64Array(ROW);

/**
 * Parejas de toberas que hacen justo lo contrario (empuje y giro): un motor de popa y el retrocohete de su lado, o
 * las dos de un grupo de maniobra que miran a lados opuestos. Cada pareja: [i, j, cuánto vale un nivel de j en
 * niveles de i].
 */
const opposites: [number, number, number][] = [];
for (let i = 0; i < COUNT; i++) {
  for (let j = i + 1; j < COUNT; j++) {
    let dot = 0;
    for (let k = 0; k < ROW; k++) dot += get(columns, i * ROW + k) * get(columns, j * ROW + k);
    const norms = Math.sqrt(get(columnNorms, i) * get(columnNorms, j));
    if (norms > 0 && dot / norms < -1 + 1e-9)
      opposites.push([i, j, Math.sqrt(get(columnNorms, j) / get(columnNorms, i))]);
  }
}

/** Lo que dos toberas opuestas se anulan entre sí no empuja nada: se apaga en las dos (sale lo mismo, gasta menos). */
function cancelOpposites(levels: Float32Array): void {
  for (const [i, j, ratio] of opposites) {
    const shared = Math.min(get(levels, i), get(levels, j) * ratio);
    if (shared <= 0) continue;
    levels[i] = get(levels, i) - shared;
    levels[j] = get(levels, j) - shared / ratio;
  }
}

/** Lee un valor de un vector tipado (0 fuera de rango). */
function get(array: Float64Array | Float32Array, index: number): number {
  return array[index] ?? 0;
}

/** Toberas apagadas: un nivel por tobera, de 0 a 1. */
export function createThrustLevels(): Float32Array {
  return new Float32Array(THRUSTERS.length);
}

/** Lo que sale de verdad: aceleración (m/s²) y aceleración de giro (rad/s²), en ejes de la nave. */
export interface ThrustOutput {
  linear: Vector3;
  angular: Vector3;
}

export function createThrustOutput(): ThrustOutput {
  return { linear: new Vector3(), angular: new Vector3() };
}

/** Suma lo que empujan las toberas con esos niveles. */
export function thrustOf(levels: Float32Array, out: ThrustOutput): ThrustOutput {
  out.linear.set(0, 0, 0);
  out.angular.set(0, 0, 0);
  for (let i = 0; i < COUNT; i++) {
    const level = get(levels, i);
    if (level === 0) continue;
    const base = i * ROW;
    out.linear.x += get(columns, base) * level;
    out.linear.y += get(columns, base + 1) * level;
    out.linear.z += get(columns, base + 2) * level;
    out.angular.x += (get(columns, base + 3) / TURN_WEIGHT) * level;
    out.angular.y += (get(columns, base + 4) / TURN_WEIGHT) * level;
    out.angular.z += (get(columns, base + 5) / TURN_WEIGHT) * level;
  }
  return out;
}

/**
 * Reparte el encargo (aceleración `linear` y giro `angular`, en ejes de la nave) entre las toberas: ajusta `levels`
 * para acercarse todo lo posible sin pasar de 0 a 1, y devuelve en `out` lo que sale
 * de verdad. Si se pide más de lo que dan, sale lo más parecido que pueden.
 */
export function allocateThrust(
  linear: Vector3,
  angular: Vector3,
  levels: Float32Array,
  out: ThrustOutput,
): ThrustOutput {
  const wanted = [
    linear.x,
    linear.y,
    linear.z,
    angular.x * TURN_WEIGHT,
    angular.y * TURN_WEIGHT,
    angular.z * TURN_WEIGHT,
  ];
  for (let k = 0; k < ROW; k++) {
    const value = wanted[k] ?? 0;
    residual[k] = Number.isFinite(value) ? value : 0;
  }
  // Se empieza de cero en cada paso: así nunca arden dos toberas opuestas a la vez.
  levels.fill(0);
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    // Una vuelta de ida y otra de vuelta: recorrerlas siempre igual favorece a las primeras y tuerce el reparto.
    for (let n = 0; n < COUNT; n++) {
      const i = sweep % 2 === 0 ? n : COUNT - 1 - n;
      const base = i * ROW;
      let along = 0;
      for (let k = 0; k < ROW; k++) along += get(columns, base + k) * get(residual, k);
      const old = get(levels, i);
      const next = Math.min(1, Math.max(0, old + (along - FUEL_COST) / get(columnNorms, i)));
      if (next === old) continue;
      levels[i] = next;
      const change = next - old;
      for (let k = 0; k < ROW; k++)
        residual[k] = get(residual, k) - get(columns, base + k) * change;
    }
    cancelOpposites(levels);
  }
  return thrustOf(levels, out);
}
