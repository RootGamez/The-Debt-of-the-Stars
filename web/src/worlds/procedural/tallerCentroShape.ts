// La casa del escéptico en la Sala del Centro del Taller (plan de finales, E5): dónde está cada cosa sobre el núcleo de
// roca y cuánto mide. Aparte de tallerCentro.ts para que los tests lo usen sin construir nada. Marco de Blender del
// Taller (Z arriba, centro del gigante en el origen); latitud y longitud en grados sobre el núcleo. Todo 🟡.
//
// La Cámara está en el polo del núcleo; a su alrededor, la casa: el catre, la mesa con las páginas y las cartas, el
// anillo por el que se llega (su obra) y, cerrando, un corro de muros de piedra llenos de rayas, una por vuelta.
import { CORE_RADIUS } from './tallerShape';

export interface Spot {
  lat: number;
  lon: number;
  /** Rumbo (grados desde el norte): 0 mira hacia el polo, hacia la Cámara. */
  heading: number;
}

/** La Cámara: en el polo. */
export const CAMARA: Spot = { lat: 90, lon: 0, heading: 0 };
/** Altura del centro de la fuente de poder sobre el suelo (m) y su radio. */
export const SOURCE_HEIGHT = 1.78;
export const SOURCE_RADIUS = 0.26;
/** Radio del pie escalonado de la Cámara (m): por aquí no se pasa. */
export const CAMARA_FOOT = 1.55;
/** Los dos anillos cruzados: radio (m) e inclinación (rad) de cada uno; giran en sentidos contrarios. */
export const CAMARA_RINGS = [
  { radius: 0.98, tilt: 0.62, speed: 0.34 },
  { radius: 0.84, tilt: -0.62, speed: -0.47 },
] as const;

/** El anillo por el que se llega desde la Pista: mira a la Cámara, así que se aparece delante, de cara a ella. */
export const GATE: Spot = { lat: 38, lon: 0, heading: 0 };

/** El catre (3,3 × 1,15 m; el asiento a 0,45 m, como `DEFAULT_SEAT` de la pose `slumped`). */
export const COT: Spot = { lat: 48, lon: 128, heading: 0 };
export const COT_SIZE = { length: 3.3, width: 1.15, seat: 0.45 } as const;
/** Dónde se sienta él, en el marco del catre (hacia los pies, en el borde que mira a la Cámara). */
export const SKEPTIC_SEAT: readonly [number, number, number] = [0.75, 0.22, 0];

/** La mesa (hecha a su medida: más alta que la de un Ool), con su taburete. */
export const TABLE: Spot = { lat: 47, lon: 232, heading: 0 };
export const TABLE_SIZE = { length: 1.7, width: 0.9, height: 1.15 } as const;

/** Los muros: a esta colatitud (grados desde la Cámara), cada uno entre dos longitudes y con su alto. */
export const WALL_COLATITUDE = 63;
export const WALL_THICKNESS = 0.36;
export interface WallSpec {
  from: number;
  to: number;
  height: number;
}
export const WALLS: readonly WallSpec[] = [
  { from: 14, to: 60, height: 3.9 },
  { from: 70, to: 112, height: 4.3 },
  { from: 121, to: 168, height: 4.1 },
  { from: 178, to: 218, height: 3.8 },
  { from: 228, to: 272, height: 4.2 },
  { from: 282, to: 322, height: 4.0 },
  { from: 331, to: 352, height: 3.6 },
];
/** El muro que aún se está llenando (la cuenta sigue): su cara de dentro, hasta esta fracción. */
export const OPEN_WALL = 2;
export const OPEN_WALL_FILL = 0.63;

/** Las rayas: cada grupo de cinco ocupa este ancho y cada fila este alto (m); deja este margen arriba y a los lados. */
export const TALLY_GROUP = 0.46;
export const TALLY_ROW = 0.36;
export const TALLY_ROWS = 9;
export const TALLY_MARGIN = 0.25;
/** Un trazo largo por cada mil vueltas: uno cada doscientos grupos de cinco. */
export const TALLY_THOUSAND = 200;

const DEG = Math.PI / 180;

/** Distancia por el suelo (m) entre dos sitios del núcleo. */
export function groundDistance(a: Pick<Spot, 'lat' | 'lon'>, b: Pick<Spot, 'lat' | 'lon'>): number {
  const [la, lb] = [a.lat * DEG, b.lat * DEG];
  const cos =
    Math.sin(la) * Math.sin(lb) + Math.cos(la) * Math.cos(lb) * Math.cos((a.lon - b.lon) * DEG);
  return Math.acos(Math.min(1, Math.max(-1, cos))) * CORE_RADIUS;
}

/**
 * Cuánto baja el suelo del núcleo (m) a `x`, `y` del pie de un marco: un mueble recto sobre una bola tan pequeña
 * necesita las patas de los extremos más largas.
 */
export function floorDrop(x: number, y: number): number {
  const r2 = CORE_RADIUS * CORE_RADIUS - x * x - y * y;
  return r2 > 0 ? CORE_RADIUS - Math.sqrt(r2) : CORE_RADIUS;
}

/** Cuántos grupos de cinco caben en una fila de un muro de este ancho (m). */
export function tallyGroupsPerRow(width: number): number {
  return Math.max(0, Math.floor((width - 2 * TALLY_MARGIN) / TALLY_GROUP));
}

/** Ancho de un muro por el suelo (m). */
export function wallWidth(wall: WallSpec): number {
  return (wall.to - wall.from) * DEG * CORE_RADIUS * Math.sin(WALL_COLATITUDE * DEG);
}

/** Las vueltas que caben en las dos caras de todos los muros (el muro abierto, solo hasta donde va). */
export function lapsOnWalls(): number {
  let groups = 0;
  WALLS.forEach((wall, i) => {
    const full = tallyGroupsPerRow(wallWidth(wall)) * TALLY_ROWS;
    groups += full + (i === OPEN_WALL ? Math.floor(full * OPEN_WALL_FILL) : full);
  });
  return groups * 5;
}
