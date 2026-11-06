// La forma del Observatorio por código (Fase 11): un asteroide alargado (1,25 × 0,9 × 0,8 de su radio) con cráteres
// y poco más, donde van la cúpula, la caseta del turno y el Mirador de la punta (CONTEXTO_PLANETAS.md §7). Aparte
// de observatorio.ts para que los tests las usen sin construir el mundo. Marco de Blender (Z arriba, latitud y
// longitud en grados); los valores son 🟡.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { Frame, angleBetween, clamp, type Surface, type XYZ } from './kit';
import { sunInWorld } from './sun';
import { createNoise, fbm, seededRandom } from './noise';

export const OBSERVATORIO_ID = 'observatorio';
export const OBSERVATORIO_RADIUS = 30;
export const OBSERVATORIO_GRAVITY = 0.2;
export const OBSERVATORIO_CLOCK = 1.15;
/** Cuánto sube y baja el suelo sobre el radio (fracción) y la frecuencia del ruido. */
export const OBSERVATORIO_RELIEF = 0.12;
const NOISE_FREQUENCY = 1.0;
/** El alargado: más largo en X (la punta del Mirador), más bajo en Z. */
export const STRETCH = new Vector3(1.25, 0.9, 0.8);
const CRATERS = 6;

interface Crater {
  direction: Vector3;
  /** Radio angular (rad). */
  radius: number;
  depth: number;
}

const noise = createNoise(61);

const craters: readonly Crater[] = (() => {
  const random = seededRandom(67);
  return Array.from({ length: CRATERS }, () => {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    return {
      direction: new Vector3(ring * Math.cos(angle), ring * Math.sin(angle), z),
      radius: 0.12 + random() * 0.18,
      depth: 0.4 + random() * 0.5,
    };
  });
})();

/**
 * Lo alto que está la Brasa en el cielo de la cúpula (rad). El Observatorio tiene la rotación bloqueada, así que la
 * Brasa está siempre en el mismo sitio de su cielo: el edificio se puso donde se ve a esta altura, y el telescopio y
 * la ranura miran hacia ella.
 */
export const TELESCOPE_ELEVATION = (52 * Math.PI) / 180;

/** Relieve (−1 a 1) en una dirección de la esfera de la que sale la forma: ruido y cráteres con borde. */
export function observatorioRelief(d: XYZ): number {
  let h = fbm(noise, d.x * NOISE_FREQUENCY, d.y * NOISE_FREQUENCY, d.z * NOISE_FREQUENCY, 4) * 0.9;
  for (const crater of craters) {
    const x = angleBetween(d, crater.direction) / crater.radius;
    if (x < 1) h += crater.depth * (x * x - 1);
    else if (x < 1.4) h += crater.depth * 0.3 * (1 - (x - 1) / 0.4);
  }
  return clamp(h, -1, 1);
}

/** La dirección de la esfera de la que sale la forma que cae en la dirección `u` del espacio (`d ∝ S⁻¹u`). */
function sphereDirection(u: XYZ): Vector3 {
  return new Vector3(u.x / STRETCH.x, u.y / STRETCH.y, u.z / STRETCH.z).normalize();
}

/** El relieve (−1 a 1) del suelo en la dirección `u` del espacio. */
export function observatorioReliefAt(u: XYZ): number {
  return observatorioRelief(sphereDirection(u));
}

/**
 * Distancia del centro a la roca sin tallar en una dirección unitaria. La roca es la esfera de relieve estirada: el
 * punto de la dirección `d` de la esfera queda en `S·d · r`, así que en la dirección `u` del espacio se busca la `d`
 * que cae ahí (`d ∝ S⁻¹u`).
 */
export function observatorioRock(u: XYZ): number {
  const d = sphereDirection(u);
  const radius = OBSERVATORIO_RADIUS * (1 + observatorioRelief(d) * OBSERVATORIO_RELIEF);
  return radius * new Vector3(d.x * STRETCH.x, d.y * STRETCH.y, d.z * STRETCH.z).length();
}

// ---- La terraza ---------------------------------------------------------------------------------------------
// Los Ausentes tallaron la roca donde la Brasa se ve alta para poner el observatorio: donde está el edificio, la roca es una
// esfera perfecta (radio TERRACE.radius), así que se anda a nivel por todo el edificio y nada queda en alto ni se
// sostiene en pilares. El edificio se diseña en un plano (el "mapa", en metros desde la cúpula, +Y al norte) y
// luego se dobla sobre esa esfera (observatorioDrape.ts): lo vertical sigue vertical y lo que está a ras de suelo,
// a ras de suelo.

/** La Brasa, vista desde el Observatorio (marco de Blender). */
const SUN = sunInWorld(OBSERVATORIO_ID).normalize();
/** La vertical de la cúpula: la Brasa queda a TELESCOPE_ELEVATION sobre su horizonte, hacia el norte del asteroide. */
const TERRACE_UP = (() => {
  const pole = new Vector3(0, 0, 1).addScaledVector(SUN, -SUN.z).normalize();
  const tilt = Math.PI / 2 - TELESCOPE_ELEVATION;
  return SUN.clone()
    .multiplyScalar(Math.cos(tilt))
    .addScaledVector(pole, Math.sin(tilt))
    .normalize();
})();
/** El +Y del mapa (lo que se llama "norte" del edificio): hacia la Brasa, por donde mira el telescopio. */
const TERRACE_NORTH = SUN.clone().addScaledVector(TERRACE_UP, -SUN.dot(TERRACE_UP)).normalize();
const TERRACE_RIGHT = TERRACE_NORTH.clone().cross(TERRACE_UP).normalize();

/** La terraza tallada: su centro (la cúpula), sus ejes (+Y hacia la Brasa) y el radio de la esfera del suelo. */
export const TERRACE = {
  up: TERRACE_UP,
  north: TERRACE_NORTH,
  right: TERRACE_RIGHT,
  /** El suelo de la terraza: a la altura de la roca en el centro de la cúpula. */
  radius: observatorioRock(TERRACE_UP),
  /** Cuánto se extiende lo tallado más allá del edificio, y en cuánto se funde con la roca de alrededor (m). */
  margin: 1.6,
  blend: 5,
} as const;

/** Lo que ocupa el edificio en el mapa (m): círculos [x, y, r] y rectángulos [x0, y0, x1, y1]. */
export const TERRACE_ZONES = {
  circles: [[0, 0, 6.4]] as readonly (readonly [number, number, number])[],
  rects: [
    // La esclusa y el hangar, al sur.
    [-2.0, -9.0, 2.0, -5.2],
    [-7.6, -22.8, 7.6, -8.5],
    // El cuarto del turno, al este, y la Sala de las Fluctuaciones, al oeste.
    [4.9, -2.8, 10.9, 2.8],
    [-13.6, -3.6, -4.9, 3.6],
  ] as readonly (readonly [number, number, number, number])[],
};

/** El marco plano del mapa: origen en el suelo de la terraza bajo la cúpula, Z arriba y +Y al norte. */
export function terraceFrame(): Frame {
  const { right, north, up, radius } = TERRACE;
  return new Frame(
    new Matrix4().makeBasis(right, north, up).setPosition(up.clone().multiplyScalar(radius)),
  );
}

/** Dónde cae en el mapa (x, y en metros a lo largo del suelo) la dirección `u` desde el centro del asteroide. */
export function mapOf(u: XYZ): [number, number] {
  const v = new Vector3(u.x, u.y, u.z).normalize();
  const along = clamp(v.dot(TERRACE.up), -1, 1);
  const tangent = v.clone().addScaledVector(TERRACE.up, -along);
  const length = tangent.length();
  if (length < 1e-9) return [0, 0];
  const arc = Math.acos(along) * TERRACE.radius;
  return [(tangent.dot(TERRACE.right) / length) * arc, (tangent.dot(TERRACE.north) / length) * arc];
}

/** La dirección (desde el centro del asteroide) del punto (x, y) del mapa. */
export function mapDirection(x: number, y: number): Vector3 {
  const rho = Math.hypot(x, y);
  if (rho < 1e-9) return TERRACE.up.clone();
  const angle = rho / TERRACE.radius;
  return TERRACE.up
    .clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(TERRACE.right, (x / rho) * Math.sin(angle))
    .addScaledVector(TERRACE.north, (y / rho) * Math.sin(angle))
    .normalize();
}

/** El punto del mapa (x, y, altura sobre el suelo) doblado sobre la terraza. */
export function mapPoint(x: number, y: number, z: number): Vector3 {
  return mapDirection(x, y).multiplyScalar(TERRACE.radius + z);
}

/** El giro que lleva la vertical del centro de la cúpula a la vertical del punto (x, y) del mapa. */
export function mapTurn(x: number, y: number): Quaternion {
  return new Quaternion().setFromUnitVectors(TERRACE.up, mapDirection(x, y));
}

/** Distancia (m, en el mapa) del punto al edificio: 0 dentro. */
function zoneDistance(x: number, y: number): number {
  let best = Infinity;
  for (const [cx, cy, r] of TERRACE_ZONES.circles) {
    best = Math.min(best, Math.max(0, Math.hypot(x - cx, y - cy) - r));
  }
  for (const [x0, y0, x1, y1] of TERRACE_ZONES.rects) {
    const dx = Math.max(x0 - x, 0, x - x1);
    const dy = Math.max(y0 - y, 0, y - y1);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/** Cuánto manda la terraza en la dirección `u`: 1 bajo el edificio y su orilla, 0 en la roca sin tocar. */
export function terraceWeight(u: XYZ): number {
  const v = new Vector3(u.x, u.y, u.z).normalize();
  // Solo el lado del edificio (lo demás queda muy lejos y el mapa se deforma).
  if (v.dot(TERRACE.up) < 0.2) return 0;
  const [x, y] = mapOf(v);
  const d = zoneDistance(x, y) - TERRACE.margin;
  if (d <= 0) return 1;
  if (d >= TERRACE.blend) return 0;
  const s = 1 - d / TERRACE.blend;
  return s * s * (3 - 2 * s);
}

/** Distancia del centro al suelo en una dirección unitaria: la roca, tallada en esfera donde está el edificio. */
export function observatorioGround(u: XYZ): number {
  const rock = observatorioRock(u);
  const w = terraceWeight(u);
  return w > 0 ? rock + (TERRACE.radius - rock) * w : rock;
}

export const observatorioSurface: Surface = {
  radius: OBSERVATORIO_RADIUS,
  groundRadius: observatorioGround,
};
