// Los portales caídos (hito E4 de docs/plan-finales.md §3.2; ✅ la idea, 🟡 cómo se encienden, D3). La energía de la
// huida los apagó: cada uno tiene su reloj fuera de hora y solo se enciende poniéndolo en hora desde el lado de fuera.
// Encendido, deja pasar en los dos sentidos y se queda así el resto del ciclo; con cada ciclo vuelve a desfasarse.
// Lógica pura (con tests). Se enchufa a `game/teleporter.ts` por la `cerradura` del anillo PASO_ (`fallenGateOpen`).
import { BUBBLE } from '../data/bubble';
import { TELEPORTER, TRACK_ERROR, TRACK_TOLERANCE, TRACK_WHEELS } from './teleporter';

export type FallenWheel = 'minutes' | 'seconds';
export type CrossDirection = 'in' | 'out';

export interface FallenGateSpec {
  readonly id: string;
  /** La `cerradura` del anillo PASO_ de fuera (la que lee `fallenGateOpen`). */
  readonly lock: string;
  /** Evento de la cronología que además hace falta para encenderlo (el Taller: las 7:00). */
  readonly event?: string;
  /** Cuánto va adelantado su reloj al empezar cada ciclo (s en la escala del propio reloj). */
  readonly error: number;
  /** Margen para darlo por en hora (s en la escala del reloj). */
  readonly tolerance: number;
  /** Lo que mueve cada rueda por paso (s en la escala del reloj). */
  readonly wheels: Readonly<Record<FallenWheel, number>>;
  /** Cuántas veces corre su reloj respecto al de referencia (el Laboratorio, x5; el Taller, x1). */
  readonly rate: number;
}

/** Lo que el juego da en cada fotograma. `reference` es el reloj de fuera (s de máquina). */
export interface FallenGateClocks {
  readonly reference: number;
  readonly events?: readonly string[];
}

export interface FallenGateReading {
  /** La hora que debería marcar (la de fuera por su ritmo) y lo que marca. */
  target: number;
  shown: number;
  matched: boolean;
}

export interface FallenGate {
  readonly spec: FallenGateSpec;
  read(reference: number): FallenGateReading;
  turn(wheel: FallenWheel, steps: number): void;
  /** Una vez por fotograma: si está en hora (y su evento, si lo pide), se enciende y ya no se apaga este ciclo. */
  step(dt: number, clocks: FallenGateClocks): void;
  readonly isLit: boolean;
  /** Segundos que lleva encendido en este ciclo. */
  readonly litSeconds: number;
  /** Apagado no deja pasar en ningún sentido; encendido, en los dos. */
  canCross(direction: CrossDirection): boolean;
  /** Al empezar otro ciclo: se apaga y vuelve a desfasarse. */
  reset(): void;
}

/** El portal del centro del Taller: su reloj es el de la Pista y se enciende con la secuencia de las 7:00. */
export const TALLER_GATE: FallenGateSpec = {
  id: 'taller',
  lock: TELEPORTER.lock,
  event: TELEPORTER.event,
  error: TRACK_ERROR,
  tolerance: TRACK_TOLERANCE,
  wheels: TRACK_WHEELS,
  rate: 1,
};

/**
 * El portal del Laboratorio, en la cáscara del Nudo (🟡 números nuevos). Su reloj marca la hora de dentro, que corre
 * x5 (`BUBBLE.bench`): el error de 6 min 55 s son 83 s de fuera, y la hora que debe marcar es la de fuera por 5.
 */
export const LABORATORY_GATE: FallenGateSpec = {
  id: 'laboratorio',
  lock: 'nudo',
  error: 415,
  tolerance: TRACK_TOLERANCE,
  wheels: TRACK_WHEELS,
  rate: BUBBLE.bench,
};

export function createFallenGate(spec: FallenGateSpec): FallenGate {
  let offset = spec.error;
  let lit = false;
  let litSeconds = 0;
  const matched = (): boolean => Math.abs(offset) <= spec.tolerance;
  return {
    spec,
    read(reference) {
      const target = Math.max(0, reference * spec.rate);
      return { target, shown: Math.max(0, target + offset), matched: matched() };
    },
    turn(wheel, steps) {
      // Una vez encendido, el reloj ya no importa: no se puede volver a apagar.
      if (!lit) offset += spec.wheels[wheel] * steps;
    },
    step(dt, clocks) {
      if (lit) {
        litSeconds += Math.max(0, dt);
        return;
      }
      const eventOk = spec.event === undefined || (clocks.events?.includes(spec.event) ?? false);
      if (eventOk && matched()) lit = true;
    },
    get isLit() {
      return lit;
    },
    get litSeconds() {
      return litSeconds;
    },
    canCross() {
      return lit;
    },
    reset() {
      offset = spec.error;
      lit = false;
      litSeconds = 0;
    },
  };
}

/** Si el anillo con `lock` (de ida o de vuelta, da igual el sentido) deja pasar ahora. */
export function fallenGateOpen(lock: string, gates: readonly FallenGate[]): boolean {
  return gates.some((g) => g.spec.lock === lock && g.canCross('in'));
}
