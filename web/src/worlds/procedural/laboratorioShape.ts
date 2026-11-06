// La forma del Nudo y del Laboratorio Oculto por código (Fase 11; CONTEXTO_PLANETAS.md §8, ✅ que el Laboratorio está
// dentro del Nudo y se camina por la cara interior; 🟡 las medidas): una cáscara negra de 25 m y, dentro, una
// cavidad de 21 m donde la gravedad empuja hacia fuera. Las zonas del Laboratorio están en la cara interior (latitud
// y longitud), y por fuera, la Puerta de la cáscara y el muelle. Bajo cada zona el suelo es una esfera exacta: lo
// construido apoya sin escalones. Marco de Blender (Z arriba). Aparte de laboratorio.ts para los tests.
import { Matrix4, Vector3 } from 'three';
import { angleBetween, clamp, direction, Frame, type XYZ } from './kit';
import { createNoise, fbm } from './noise';

export const LABORATORIO_ID = 'laboratorio';
export const LAB_RADIUS = 25;
export const LAB_INNER_RADIUS = 21;
export const LAB_GRAVITY = 0.3;
export const LAB_CLOCK = 0.2;
const OUTER_RELIEF = 0.05;
const OUTER_FREQUENCY = 1.9;
const INNER_RELIEF = 0.02;
const INNER_FREQUENCY = 2.2;
const DEG = Math.PI / 180;

/** Zonas de la cara interior: latitud, longitud y el radio (m) del suelo llano que ocupan. */
export const INNER_SITES = {
  recibidor: { lat: -55, lon: 0, clear: 5 },
  sala: { lat: -18, lon: 0, clear: 5.5 },
  banco: { lat: -10, lon: 42, clear: 4 },
  esceptico: { lat: -12, lon: -42, clear: 4 },
  cruce: { lat: 5, lon: 0, clear: 2 },
  investigadora: { lat: 22, lon: 28, clear: 4.2 },
  dormitorio: { lat: 22, lon: -28, clear: 4.4 },
  camara: { lat: 58, lon: 0, clear: 5 },
  // Las salas de la vida de cada día (🟡, 2026-11-05): al otro lado de la esfera, unidas a las de trabajo.
  mediciones: { lat: -20, lon: 95, clear: 4.8 },
  radio: { lat: -24, lon: -95, clear: 4.2 },
  comedor: { lat: 30, lon: 88, clear: 4.8 },
  invernadero: { lat: 30, lon: -88, clear: 4.8 },
} as const;
export type InnerSiteId = keyof typeof INNER_SITES;

/** Por fuera: la Puerta de la cáscara (sobre el Recibidor) y el muelle donde posarse. */
export const OUTER_SITES = {
  puerta: { lat: -55, lon: 0, clear: 4.5 },
  muelle: { lat: -72, lon: 0, clear: 5.5 },
} as const;

/** Los senderos: de qué zona a qué zona. */
export const PATHS: readonly (readonly [InnerSiteId, InnerSiteId])[] = [
  ['recibidor', 'sala'],
  ['sala', 'banco'],
  ['sala', 'esceptico'],
  ['sala', 'cruce'],
  ['cruce', 'investigadora'],
  ['cruce', 'dormitorio'],
  ['cruce', 'camara'],
  ['banco', 'mediciones'],
  ['esceptico', 'radio'],
  ['investigadora', 'comedor'],
  ['dormitorio', 'invernadero'],
  ['mediciones', 'comedor'],
  ['radio', 'invernadero'],
];

const outerNoise = createNoise(41);
const innerNoise = createNoise(43);

/** Cuánto manda el suelo llano de un sitio (1 dentro, 0 lejos) en la dirección `d`, sobre una esfera de radio `r`. */
function flatWeight(
  d: XYZ,
  sites: readonly { lat: number; lon: number; clear: number }[],
  r: number,
): number {
  let w = 0;
  for (const s of sites) {
    const distance = angleBetween(d, direction(s.lat, s.lon)) * r;
    const t = clamp(1 - (distance - s.clear) / 3, 0, 1);
    w = Math.max(w, t * t * (3 - 2 * t));
  }
  return w;
}

/** Los senderos también son llanos: un pasillo de 1,4 m a cada lado del arco que une dos zonas. */
function pathWeight(d: XYZ): number {
  const v = new Vector3(d.x, d.y, d.z).normalize();
  let w = 0;
  for (const [a, b] of PATHS) {
    const A = direction(INNER_SITES[a].lat, INNER_SITES[a].lon);
    const B = direction(INNER_SITES[b].lat, INNER_SITES[b].lon);
    const normal = A.clone().cross(B).normalize();
    const off = Math.abs(Math.asin(clamp(v.dot(normal), -1, 1))) * LAB_INNER_RADIUS;
    // Solo entre los dos extremos del arco.
    const along = v.clone().addScaledVector(normal, -v.dot(normal)).normalize();
    const total = A.angleTo(B);
    if (along.angleTo(A) > total + 0.02 || along.angleTo(B) > total + 0.02) continue;
    const t = clamp(1 - (off - 1.4) / 1.6, 0, 1);
    w = Math.max(w, t * t * (3 - 2 * t));
  }
  return w;
}

/** Distancia del centro a la cáscara de fuera en la dirección unitaria `d`. */
export function outerGround(d: XYZ): number {
  const n = fbm(outerNoise, d.x * OUTER_FREQUENCY, d.y * OUTER_FREQUENCY, d.z * OUTER_FREQUENCY, 4);
  const rough = LAB_RADIUS * (1 + n * OUTER_RELIEF);
  const w = flatWeight(d, Object.values(OUTER_SITES), LAB_RADIUS);
  return rough + (LAB_RADIUS - rough) * w;
}

/** Distancia del centro a la cara interior (el suelo de dentro) en la dirección unitaria `d`. */
export function innerGround(d: XYZ): number {
  const n = fbm(innerNoise, d.x * INNER_FREQUENCY, d.y * INNER_FREQUENCY, d.z * INNER_FREQUENCY, 3);
  const rough = LAB_INNER_RADIUS * (1 + n * INNER_RELIEF);
  const w = Math.max(flatWeight(d, Object.values(INNER_SITES), LAB_INNER_RADIUS), pathWeight(d));
  return rough + (LAB_INNER_RADIUS - rough) * w;
}

/** ¿Cae la dirección en una de las franjas oscuras (los estratos, cada 30° de latitud)? */
export function inStratum(d: XYZ): boolean {
  const lat = Math.asin(clamp(d.z / Math.hypot(d.x, d.y, d.z), -1, 1)) / DEG;
  const k = Math.round(lat / 30) * 30;
  return Math.abs(lat - k) < 1.6 && Math.abs(k) < 90;
}

/** Ejes del sitio: arriba, norte y este (como en Blender: el este es norte × arriba). */
function axes(up: Vector3): { north: Vector3; east: Vector3 } {
  let north = new Vector3(0, 0, 1).addScaledVector(up, -up.z);
  if (north.lengthSq() < 1e-12) north = new Vector3(1, 0, 0);
  north.normalize();
  return { north, east: north.clone().cross(up).normalize() };
}

/** Marco con Z arriba en `up`, +Y hacia el rumbo (grados desde el norte) y el origen a `radius` del centro. */
function siteFrame(out: Vector3, up: Vector3, radius: number, heading: number): Frame {
  const { north, east } = axes(up);
  const h = heading * DEG;
  const forward = north.multiplyScalar(Math.cos(h)).addScaledVector(east, Math.sin(h)).normalize();
  const right = forward.clone().cross(up).normalize();
  return new Frame(
    new Matrix4().makeBasis(right, forward, up).setPosition(out.clone().multiplyScalar(radius)),
  );
}

/** Un sitio de la cara interior: Z hacia el centro (la semilla queda arriba), sobre el suelo de dentro. */
export function insideFrame(lat: number, lon: number, heading = 0): Frame {
  const out = direction(lat, lon);
  return siteFrame(out, out.clone().negate(), innerGround(out), heading);
}

/** Un sitio de la cáscara de fuera: Z hacia fuera. */
export function outsideFrame(lat: number, lon: number, heading = 0): Frame {
  const out = direction(lat, lon);
  return siteFrame(out, out.clone(), outerGround(out), heading);
}

/** Rumbo (grados) en la cara interior para ir de un sitio a otro. */
export function insideHeading(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): number {
  const a = direction(from.lat, from.lon);
  const b = direction(to.lat, to.lon);
  const up = a.clone().negate();
  const { north, east } = axes(up);
  const t = b.sub(a);
  t.addScaledVector(up, -t.dot(up));
  return Math.atan2(t.dot(east), t.dot(north)) / DEG;
}

/** El punto (lat, lon) a una fracción `f` del arco entre dos sitios. */
export function along(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  f: number,
): { lat: number; lon: number } {
  const a = direction(from.lat, from.lon);
  const b = direction(to.lat, to.lon);
  const angle = a.angleTo(b);
  const s = Math.sin(angle);
  const d =
    s < 1e-6
      ? a
      : a
          .multiplyScalar(Math.sin((1 - f) * angle) / s)
          .addScaledVector(b, Math.sin(f * angle) / s)
          .normalize();
  return { lat: Math.asin(clamp(d.z, -1, 1)) / DEG, lon: Math.atan2(d.y, d.x) / DEG };
}
