// La forma de Hogar rehecho por código (Fase 11G; ✅ la idea, Anthony 2026-11-03): el mar, las tierras y dónde va
// cada lugar. Aparte de hogar.ts para que los tests las usen sin construir el mundo. Marco de Blender (Z arriba,
// latitud y longitud en grados); los valores son 🟡, para ajustar jugando.
//
// La Brasa de casa queda al este (lon 80) y la Luna al oeste (lon −17,5), las dos en el ecuador (sistema-hogar.json):
// el Instituto, en (30, 25), ve el sol de media mañana a unos 30° y la Luna a unos 40°, hacia el suroeste. La cara de
// día es la del continente de casa; la de noche, unas islas sueltas con lo que solo encuentra quien se aleja.
import { angleBetween, direction, smoothstep, type Surface, type XYZ } from './kit';
import { createNoise, fbm } from './noise';

export const HOGAR_ID = 'hogar';
/** Radio de referencia (gravedad, aire, órbita): el de siempre. */
export const HOGAR_RADIUS = 120;
/** El nivel del mar (m desde el centro), sus olas y el fondo. */
export const SEA_LEVEL = 119.5;
export const WAVE_HEIGHT = 0.18;
export const WAVE_SEED = 5;
export const SEABED = 113.5;
/** La tierra baja: un metro largo por encima del agua. */
export const LOWLAND = 120.7;

export type SiteId =
  | 'instituto'
  | 'aldea'
  | 'huertos'
  | 'terrazas'
  | 'ciudad'
  | 'embarcadero'
  | 'motor'
  | 'chatarra'
  | 'albatros'
  | 'primera_piedra'
  | 'astronoma'
  | 'prado_luces';

export interface Site {
  lat: number;
  lon: number;
  /** Radio del llano (m): dentro, el suelo está a `height` justa (0: no se allana, la orilla queda como está). */
  pad: number;
  /** Altura del llano (m desde el centro). */
  height: number;
}

/** Los lugares. Los de la cara de noche (los cuatro últimos) son para los curiosos. */
export const SITES: Readonly<Record<SiteId, Site>> = {
  instituto: { lat: 30, lon: 25, pad: 27, height: 126 },
  aldea: { lat: 50, lon: 6, pad: 22, height: 121 },
  huertos: { lat: 8, lon: 4, pad: 24, height: 120.9 },
  terrazas: { lat: 46, lon: 50, pad: 15, height: 121.4 },
  ciudad: { lat: 2, lon: 36, pad: 26, height: 121 },
  embarcadero: { lat: -15, lon: 44, pad: 0, height: 120.2 },
  motor: { lat: 17, lon: 60, pad: 17, height: 122.6 },
  chatarra: { lat: 34, lon: 63, pad: 12, height: 121.2 },
  albatros: { lat: 10, lon: -150, pad: 9, height: 120.9 },
  primera_piedra: { lat: -30, lon: -165, pad: 10, height: 121.2 },
  astronoma: { lat: -25, lon: -95, pad: 9, height: 122.5 },
  prado_luces: { lat: 50, lon: -120, pad: 14, height: 120.9 },
};

export function siteOf(id: SiteId): Site {
  return SITES[id];
}

/** Las tierras: discos (centro y radio en m) que se unen; fuera, el fondo del mar. */
const LANDS: readonly { lat: number; lon: number; radius: number }[] = [
  // El continente de casa.
  { lat: 30, lon: 25, radius: 80 },
  { lat: 5, lon: 32, radius: 64 },
  { lat: 50, lon: 5, radius: 54 },
  { lat: 16, lon: 56, radius: 42 },
  { lat: 36, lon: 58, radius: 32 },
  { lat: 8, lon: 2, radius: 42 },
  // Las islas de la cara de noche y alguna suelta por el camino.
  { lat: 10, lon: -150, radius: 32 },
  { lat: -30, lon: -165, radius: 34 },
  { lat: -25, lon: -95, radius: 36 },
  { lat: 50, lon: -120, radius: 38 },
  { lat: 22, lon: -60, radius: 26 },
  { lat: -12, lon: 130, radius: 28 },
  { lat: 30, lon: 170, radius: 24 },
];
/** Lo que tarda el borde de un llano en llegar al suelo de alrededor (m). */
export const PAD_EDGE = 7;
/** Lo que tarda la ladera de la colina del Instituto en bajar de la cima al llano (m). */
export const HILL_SLOPE = 22;
/** Lo que tarda la costa en bajar de la tierra al fondo (m). */
const COAST = 22;

const noise = createNoise(23);
const DIRS = new Map<string, XYZ>();
function dirOf(lat: number, lon: number): XYZ {
  const key = `${String(lat)},${String(lon)}`;
  let d = DIRS.get(key);
  if (!d) {
    d = direction(lat, lon);
    DIRS.set(key, d);
  }
  return d;
}

/** Distancia por la superficie (m) entre una dirección y un punto de latitud y longitud. */
export function surfaceDistance(d: XYZ, lat: number, lon: number): number {
  return angleBetween(d, dirOf(lat, lon)) * HOGAR_RADIUS;
}

/** Cuánto es tierra (0 mar abierto, 1 tierra) en una dirección. */
export function landShare(d: XYZ): number {
  const wobble = fbm(noise, d.x * 5 + 3, d.y * 5, d.z * 5, 3) * 9;
  let share = 0;
  for (const land of LANDS) {
    const distance = surfaceDistance(d, land.lat, land.lon) + wobble;
    share = Math.max(share, 1 - smoothstep(land.radius - COAST, land.radius, distance));
  }
  return share;
}

/** Distancia del centro al suelo en una dirección unitaria. */
export function hogarGround(d: XYZ): number {
  const land = landShare(d);
  const hills = fbm(noise, d.x * 3.2, d.y * 3.2 + 9, d.z * 3.2, 4);
  let r = SEABED + fbm(noise, d.x * 4, d.y * 4, d.z * 4 + 5, 3) * 1.4;
  const ground = LOWLAND + Math.max(0, hills) * 3.2;
  r += (ground - r) * land;
  // La colina del Instituto: una cima llana con laderas suaves.
  const hill = SITES.instituto;
  const hillDistance = surfaceDistance(d, hill.lat, hill.lon);
  if (hillDistance < hill.pad + HILL_SLOPE) {
    const t = 1 - smoothstep(hill.pad, hill.pad + HILL_SLOPE, hillDistance);
    r = Math.max(r, r + (padRadius(d, hill) - r) * t);
  }
  // Los llanos de cada lugar. Donde el borde de uno toca el de otro, manda el que está más cerca de su llano:
  // ninguno recorta el de al lado (los llanos no se pisan; lo comprueban los tests).
  let best: Site | undefined;
  let bestT = 0;
  for (const site of Object.values(SITES)) {
    if (site.pad === 0) continue;
    const distance = surfaceDistance(d, site.lat, site.lon);
    if (distance > site.pad + PAD_EDGE) continue;
    const t = 1 - smoothstep(site.pad, site.pad + PAD_EDGE, distance);
    if (t > bestT) {
      best = site;
      bestT = t;
    }
  }
  if (best) r += (padRadius(d, best) - r) * bestT;
  return r;
}

/**
 * El suelo de un llano es un plano tangente (no una esfera): el mismo plano que el marco del lugar (kit.frameAt), así
 * que todo lo que se construye en él a z = 0 apoya en el suelo, también lejos del centro.
 */
function padRadius(d: XYZ, site: Site): number {
  const c = dirOf(site.lat, site.lon);
  const cos = d.x * c.x + d.y * c.y + d.z * c.z;
  return site.height / Math.max(0.5, cos);
}

export const hogarSurface: Surface = { radius: HOGAR_RADIUS, groundRadius: hogarGround };
