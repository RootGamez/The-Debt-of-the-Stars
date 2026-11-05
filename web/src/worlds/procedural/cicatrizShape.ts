// La forma de Cicatriz por código (Fase 11H; ✅ la idea, Anthony 2026-11-04): un mundo hueco con un micro agujero
// negro en el centro, una cáscara mordida por cortes esféricos que la atraviesan (cada uno deja un «ojo» que da a la
// cavidad) y un anillo con lo que esos cortes arrancaron. Aquí van las medidas, las mordidas y dónde está cada
// sitio, sin construir mallas, para que los tests las usen. Marco de Blender (Z arriba, latitud y longitud en
// grados); los valores son 🟡, para ajustar jugando.
import { Vector3 } from 'three';
import { angleBetween, clamp, direction } from './kit';
import { createNoise, fbm, seededRandom } from './noise';

export const CICATRIZ_ID = 'cicatriz';
/** La cáscara por fuera (el radio del mundo de siempre) y la cara interior de la cavidad (m). */
export const OUTER_RADIUS = 80;
export const INNER_RADIUS = 60;
/** Bajo este radio la gravedad empuja hacia fuera (justo bajo la cara interior: el fondo de los cuencos tira al centro). */
export const CAVITY_LIMIT = 61;
/** La Sala del Motor: una banda (un trozo de esfera) alrededor del centro, que se camina por dentro. */
export const ENGINE_RADIUS = 12;
/** Media anchura de la banda (grados de latitud respecto a su eje). */
export const ENGINE_HALF_ANGLE = 22;
/** Altura de las barandas de la banda y del brocal del Pozo (m): más de lo que se salta. */
export const RAIL_HEIGHT = 1.9;
/** El anillo de fragmentos: de dónde a dónde (m del centro) y hacia dónde apunta su eje. */
export const RING_INNER = 108;
export const RING_OUTER = 152;
export const RING_AXIS = direction(64, 35);

/** Un corte esférico: el centro de la esfera que mordió (dirección y distancia) y su radio. */
export interface Bite {
  id: string;
  lat: number;
  lon: number;
  /** Distancia del centro del planeta al centro de la esfera del corte (m). */
  distance: number;
  /** Radio de la esfera del corte (m). */
  radius: number;
}

/** Un sitio (para dejarle sitio a las mordidas): dirección y cuánto espacio libre pide alrededor (grados). */
export interface Site {
  lat: number;
  lon: number;
  clear: number;
}

/** La Gran Mordida: la más grande, por cuyo ojo cabe la nave. Su eje es el de la Sala del Motor. */
export const GREAT_BITE: Bite = { id: 'gran', lat: 22, lon: -20, distance: 120, radius: 66 };
/** El eje de la Sala del Motor (y del camino de la nave hasta el centro). */
export const ENGINE_AXIS = direction(GREAT_BITE.lat, GREAT_BITE.lon);

/** Sitios de la superficie: aquí no cae ninguna mordida. */
export const OUTER_SITES = {
  puesto: { lat: 45, lon: 100, clear: 9 },
  primera: { lat: 4, lon: 70, clear: 13 },
  pozo: { lat: -36, lon: 12, clear: 8 },
  torres: { lat: -10, lon: 140, clear: 7 },
  campamento: { lat: 58, lon: 30, clear: 7 },
} as const satisfies Record<string, Site>;

/** Sitios de la cara interior: aquí no se abre ningún ojo. */
export const INNER_SITES = {
  /** El pie del Eje, en el plano de la banda (perpendicular al eje de la Sala). */
  eje: { lat: GREAT_BITE.lat - 90, lon: GREAT_BITE.lon, clear: 9 },
  fundicion: { lat: -14, lon: 42, clear: 11 },
  partidas: { lat: 10, lon: 150, clear: 10 },
  friso: { lat: -42, lon: -125, clear: 8 },
  dormideros: { lat: 50, lon: 168, clear: 8 },
  fondo: { lat: OUTER_SITES.pozo.lat, lon: OUTER_SITES.pozo.lon, clear: 7 },
} as const satisfies Record<string, Site>;

export const biteAxis = (b: Bite): Vector3 => direction(b.lat, b.lon);
export const biteCenter = (b: Bite): Vector3 => biteAxis(b).multiplyScalar(b.distance);

/**
 * Ángulo (radianes, desde el eje del corte) del círculo donde la esfera del corte corta la esfera de radio `r`.
 * `NaN` si no la corta.
 */
export function biteAngleAt(b: Bite, r: number): number {
  const c = (b.distance ** 2 + r ** 2 - b.radius ** 2) / (2 * b.distance * r);
  return c > 1 || c < -1 ? Number.NaN : Math.acos(c);
}

/** El borde del cuenco (en la cáscara de fuera) y el del ojo (en la cara interior). */
export const rimAngle = (b: Bite): number => biteAngleAt(b, OUTER_RADIUS);
export const eyeAngle = (b: Bite): number => biteAngleAt(b, INNER_RADIUS);

const DEG = Math.PI / 180;

/** Las mordidas: la grande y las demás, repartidas con una semilla para que no tapen los sitios. */
export const BITES: readonly Bite[] = makeBites();

function makeBites(): Bite[] {
  const random = seededRandom(1107);
  const bites: Bite[] = [GREAT_BITE];
  const outer = Object.values(OUTER_SITES);
  const inner = Object.values(INNER_SITES);
  const wanted = 18;
  for (let attempt = 0; attempt < 20000 && bites.length < wanted; attempt++) {
    const z = random() * 2 - 1;
    const lon = random() * 360 - 180;
    const lat = Math.asin(z) / DEG;
    // Cuantos más se ponen, más pequeños: las primeras grandes, las últimas, pozos estrechos.
    const size = 1 - bites.length / wanted;
    const distance = 76 + random() * (12 + 22 * size);
    const bottom = 54 + random() * 4;
    const candidate: Bite = {
      id: `m${String(bites.length)}`,
      lat,
      lon,
      distance,
      radius: distance - bottom,
    };
    const axis = biteAxis(candidate);
    const rim = rimAngle(candidate);
    const eye = eyeAngle(candidate);
    if (!Number.isFinite(rim) || !Number.isFinite(eye)) continue;
    const apart = bites.every(
      (other) => angleBetween(axis, biteAxis(other)) > rim + rimAngle(other) + 2.5 * DEG,
    );
    const outerFree = outer.every(
      (s) => angleBetween(axis, direction(s.lat, s.lon)) > rim + s.clear * DEG,
    );
    const innerFree = inner.every(
      (s) => angleBetween(axis, direction(s.lat, s.lon)) > eye + s.clear * DEG,
    );
    if (apart && outerFree && innerFree) bites.push(candidate);
  }
  return bites;
}

const relief = createNoise(81);
const innerRelief = createNoise(82);

/** Dónde corta un rayo desde el centro (dirección `d`) la esfera de un corte: la entrada, o `NaN`. */
function biteEntry(b: Bite, d: Vector3): number {
  const c = biteCenter(b);
  const along = d.dot(c);
  const disc = along * along - b.distance ** 2 + b.radius ** 2;
  // Solo hacia delante: un rayo que se aleja del corte también cruzaría su esfera (por detrás del centro).
  return disc < 0 || along <= 0 ? Number.NaN : along - Math.sqrt(disc);
}

/** El suelo de fuera en una dirección: su radio y si ahí se abre un ojo (el cuenco ya no tiene fondo). */
export interface OuterGround {
  radius: number;
  hole: boolean;
  /** La mordida en cuyo cuenco está, si está en uno. */
  bite: Bite | undefined;
}

/** Altura de la roca de fuera sin mordidas: lomas suaves y un labio levantado alrededor de cada cuenco. */
function crust(d: Vector3): number {
  let h = fbm(relief, d.x * 3.1, d.y * 3.1, d.z * 3.1, 4) * 2.4;
  for (const b of BITES) {
    const a = angleBetween(d, biteAxis(b));
    const rim = rimAngle(b);
    const past = (a - rim) / (0.09 * (b.radius / 40));
    if (past > -0.2 && past < 3) h += 1.6 * Math.exp(-((past - 0.4) ** 2) * 2.2);
  }
  return OUTER_RADIUS + h;
}

export function outerGround(d: Vector3): OuterGround {
  let radius = crust(d);
  let bite: Bite | undefined;
  for (const b of BITES) {
    const entry = biteEntry(b, d);
    if (Number.isFinite(entry) && entry < radius) {
      radius = entry;
      bite = b;
    }
  }
  return { radius: Math.max(radius, INNER_RADIUS), hole: radius < INNER_RADIUS, bite };
}

/** Radio del suelo de fuera (para colocar cosas): en un ojo, el labio de la cara interior. */
export function outerGroundRadius(d: Vector3): number {
  return outerGround(d).radius;
}

/** La mordida en cuyo ojo cae esa dirección (la cara interior no existe ahí), si cae en alguno. */
export function eyeAt(d: Vector3): Bite | undefined {
  return BITES.find((b) => angleBetween(d, biteAxis(b)) < eyeAngle(b));
}

/**
 * La cara interior: a `INNER_RADIUS` menos unas rocas que sobresalen hacia el centro, que se allanan cerca de los
 * ojos (el labio de cada ojo queda justo a 60 m, donde lo enmarca su anillo).
 */
export function innerGroundRadius(d: Vector3): number {
  let calm = 1;
  for (const b of BITES) {
    const a = angleBetween(d, biteAxis(b)) - eyeAngle(b);
    calm = Math.min(calm, clamp(a / (6 * DEG), 0, 1));
  }
  const bump = Math.max(0, fbm(innerRelief, d.x * 4.2, d.y * 4.2, d.z * 4.2, 4)) * 2.2;
  return INNER_RADIUS - bump * calm;
}

/** El marco de la banda de la Sala del Motor: su eje y dos direcciones perpendiculares. */
export function engineBasis(): { axis: Vector3; u: Vector3; v: Vector3 } {
  const axis = ENGINE_AXIS.clone();
  const u = direction(INNER_SITES.eje.lat, INNER_SITES.eje.lon);
  u.addScaledVector(axis, -u.dot(axis)).normalize();
  const v = axis.clone().cross(u).normalize();
  return { axis, u, v };
}

/** Un punto de la banda: `phi` alrededor del eje (grados, 0 hacia el Eje) y `beta` hacia el eje (grados). */
export function enginePoint(phi: number, beta: number, radius = ENGINE_RADIUS): Vector3 {
  const { axis, u, v } = engineBasis();
  const p = phi * DEG;
  const b = beta * DEG;
  return u
    .clone()
    .multiplyScalar(Math.cos(p) * Math.cos(b))
    .addScaledVector(v, Math.sin(p) * Math.cos(b))
    .addScaledVector(axis, Math.sin(b))
    .multiplyScalar(radius);
}
