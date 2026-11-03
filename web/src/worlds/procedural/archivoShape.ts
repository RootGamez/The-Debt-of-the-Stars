// Las medidas del Archivo de agua (Fase 11E, docs/plan-fase-11-modelado-por-codigo.md): el mar, el fondo, el tubo
// de vidrio de la Galería alrededor del ecuador, su suelo (con el Fondo hundido), la esclusa y las torres. En el
// marco de Blender: Z arriba (el eje del tubo), el ecuador es el plano XY.

export const ARCHIVO_ID = 'archivo';
/** El radio del mundo es el del mar: la superficie del agua. */
export const SEA_LEVEL = 70;
/** El oleaje (🟡): altura máxima de la ola sobre el nivel (m) y semilla de sus direcciones. */
export const WAVE_HEIGHT = 0.45;
export const WAVE_SEED = 3;
/** El fondo de roca, de media (unos 14 m bajo el agua). */
export const SEABED = 56;
/** El tubo de la Galería: su anillo va por el nivel del agua (mitad fuera, mitad dentro). */
export const TUBE_MAJOR = SEA_LEVEL;
export const TUBE_MINOR = 9;
/** Distancia al centro del punto más bajo del tubo. */
export const TUBE_BOTTOM = TUBE_MAJOR - TUBE_MINOR;
/** Bajo el tubo el fondo no sube de aquí: se puede pasar buceando por debajo. */
export const SEABED_UNDER_TUBE = 57;
/** La franja de latitud (grados) que el fondo deja libre bajo el tubo. */
export const TUBE_BAND = 13;

/** El suelo de la Galería, dentro del tubo. */
export const FLOOR_RADIUS = 64.6;
/** El Fondo del Cañón: una parte del suelo hundida y oscura (✅ el sitio, 🟡 la forma). */
export const FONDO = { lon: -100.957, radius: 62.4, flat: 3, ramp: 5 } as const;
/** Lo que se separa el suelo del vidrio por los lados (m). */
const GLASS_MARGIN = 0.25;

/** La esclusa, única entrada (🟡): un pozo de piedra desde el fondo del mar hasta una cámara bajo el suelo. */
export const LOCK = {
  lon: 90,
  /** Medio lado del hueco del pozo y grosor de sus paredes (m). */
  half: 2,
  wall: 0.5,
  /** Alto de la puerta del pie del pozo. */
  door: 3.2,
  doorHalf: 1.1,
  /** Suelo de la cámara de la esclusa (distancia al centro). */
  chamber: 62,
} as const;

/** Las seis torres que sostienen el tubo, numeradas hacia el este desde la del Borde. */
export const TOWER_LONS = [-30, 30, 90, 150, -150, -90] as const;
/** Latitud de las patas de cada torre (a los dos lados del tubo). */
export const TOWER_LAT = 11.5;

const DEG = Math.PI / 180;

/** Diferencia de longitudes en (−180, 180]. */
export function lonDelta(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Distancia al centro del suelo de la Galería en una longitud (baja en el Fondo por dos rampas). */
export function floorRadius(lon: number): number {
  const d = Math.abs(lonDelta(lon, FONDO.lon));
  if (d <= FONDO.flat) return FONDO.radius;
  if (d >= FONDO.flat + FONDO.ramp) return FLOOR_RADIUS;
  const t = (d - FONDO.flat) / FONDO.ramp;
  return FONDO.radius + (FLOOR_RADIUS - FONDO.radius) * t;
}

/** Hasta qué latitud (grados) llega el suelo a esa distancia del centro sin tocar el vidrio. */
export function floorHalfLat(radius: number): number {
  const inner = TUBE_MINOR - GLASS_MARGIN;
  const cos =
    (radius * radius + TUBE_MAJOR * TUBE_MAJOR - inner * inner) / (2 * TUBE_MAJOR * radius);
  return Math.acos(Math.min(1, cos)) / DEG;
}

/** Si un punto (marco de Blender) está dentro del tubo de vidrio. */
export function insideTube(x: number, y: number, z: number): boolean {
  return Math.hypot(Math.hypot(x, y) - TUBE_MAJOR, z) < TUBE_MINOR;
}
