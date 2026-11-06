// Las medidas del Archivo de las Puertas (Fase 11, por código): un planetoide oscuro de 30 m, fuera del tiempo, al
// otro lado del horizonte estable. Sus sitios (la llegada, las bocas de casa, el muro de los rastros, lo que dejaron
// los otros viajeros y la primera Puerta de los Ausentes) están en llano y unidos por senderos llanos: el andar no
// sube escalones. Mismos datos de raíz que puertas.glb (plan de la Fase 10D, todo 🟡).
import { Vector3 } from 'three';
import { angleBetween, clamp, direction, type Surface, type XYZ } from './kit';
import { createNoise, fbm } from './noise';

export const PUERTAS_ID = 'puertas';
export const PUERTAS_RADIUS = 30;
export const PUERTAS_GRAVITY = 0.5;
/** Fuera del tiempo, no hay ritmo propio: el de casa. */
export const PUERTAS_CLOCK = 1;
export const PUERTAS_AMBIENT = { strength: 0.7, color: '#8C96C8' } as const;

const RELIEF = 0.025;
const FREQUENCY = 1.1;

export interface PuertasSite {
  readonly lat: number;
  readonly lon: number;
  /** Radio del llano alrededor (m). */
  readonly clear: number;
}

/** Los sitios del Archivo: donde se despierta, las bocas de casa, el muro, las ofrendas y la primera Puerta. */
export const SITES = {
  llegada: { lat: 62, lon: 0, clear: 3.5 },
  casa: { lat: 32, lon: 0, clear: 9.5 },
  rastros: { lat: 45, lon: 60, clear: 7.5 },
  ofrendas: { lat: 30, lon: 40, clear: 4 },
  primera: { lat: 48, lon: -58, clear: 5.5 },
} as const satisfies Record<string, PuertasSite>;
export type SiteId = keyof typeof SITES;

/** Los senderos de luz que unen los sitios (llanos, 1,3 m a cada lado). */
export const PATHS: readonly (readonly [SiteId, SiteId])[] = [
  ['llegada', 'casa'],
  ['llegada', 'rastros'],
  ['llegada', 'primera'],
  ['rastros', 'ofrendas'],
  ['ofrendas', 'casa'],
];
const PATH_HALF_WIDTH = 1.3;

const noise = createNoise(11);

export function siteDirection(id: SiteId): Vector3 {
  const s = SITES[id];
  return direction(s.lat, s.lon);
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

function siteWeight(d: XYZ): number {
  let w = 0;
  for (const s of Object.values(SITES)) {
    const distance = angleBetween(d, direction(s.lat, s.lon)) * PUERTAS_RADIUS;
    w = Math.max(w, smooth(clamp(1 - (distance - s.clear) / 3, 0, 1)));
  }
  return w;
}

/** Distancia (m, sobre el suelo) de `d` al arco entre dos sitios, o Infinity si cae fuera de sus extremos. */
export function distanceToPath(d: XYZ, a: SiteId, b: SiteId): number {
  const v = new Vector3(d.x, d.y, d.z).normalize();
  const A = siteDirection(a);
  const B = siteDirection(b);
  const normal = A.clone().cross(B).normalize();
  const along = v.clone().addScaledVector(normal, -v.dot(normal)).normalize();
  const total = A.angleTo(B);
  if (along.angleTo(A) > total + 0.02 || along.angleTo(B) > total + 0.02) return Infinity;
  return Math.abs(Math.asin(clamp(v.dot(normal), -1, 1))) * PUERTAS_RADIUS;
}

function pathWeight(d: XYZ): number {
  let w = 0;
  for (const [a, b] of PATHS) {
    const off = distanceToPath(d, a, b);
    w = Math.max(w, smooth(clamp(1 - (off - PATH_HALF_WIDTH) / 1.8, 0, 1)));
  }
  return w;
}

/** Distancia del centro al suelo en la dirección unitaria `d`: relieve suave, llano en sitios y senderos. */
export function puertasGround(d: XYZ): number {
  const n = fbm(noise, d.x * FREQUENCY, d.y * FREQUENCY, d.z * FREQUENCY, 4);
  const rough = PUERTAS_RADIUS * (1 + n * RELIEF);
  const w = Math.max(siteWeight(d), pathWeight(d));
  return rough + (PUERTAS_RADIUS - rough) * w;
}

export const puertasSurface: Surface = { radius: PUERTAS_RADIUS, groundRadius: puertasGround };

/** ¿Está `d` lejos de todos los sitios y senderos (m de margen)? Para esparcir las bocas ajenas. */
export function awayFromSites(d: XYZ, margin: number): boolean {
  for (const s of Object.values(SITES)) {
    if (angleBetween(d, direction(s.lat, s.lon)) * PUERTAS_RADIUS < s.clear + margin) return false;
  }
  for (const [a, b] of PATHS) if (distanceToPath(d, a, b) < PATH_HALF_WIDTH + margin) return false;
  return true;
}
