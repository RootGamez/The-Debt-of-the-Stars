// Las salas del Archivo por dentro (plan de historia y puzzles físicos, §7.2; 🟡 todas): el tubo de vidrio se corta con
// mamparos de piedra en ocho salas con su luz, su suelo y su mobiliario. Aquí solo los datos y la geometría pura de
// las paredes (con tests); lo que se dibuja está en archivoRooms.ts. Longitudes en grados, hacia el este.
import { FONDO, TUBE_MINOR, lonDelta } from './archivoShape';

export interface Room {
  id: string;
  /** Desde dónde hasta dónde llega (el mamparo está en `from`). */
  from: number;
  to: number;
  /** El color de sus luces y el de la franja de su suelo. */
  light: string;
  path: string;
  /** Cuánto brillan sus farolas (1 = lo normal). */
  glow: number;
}

/** De la esclusa hacia el este, vuelta entera: ocho salas. */
export const ROOMS: readonly Room[] = [
  { id: 'vestibulo', from: 78, to: 92, light: '#CFE8FF', path: '#B9CBD6', glow: 0.9 },
  { id: 'ranura', from: 92, to: 110, light: '#8FA0BC', path: '#6F7C90', glow: 0.35 },
  { id: 'cajones', from: 110, to: -115, light: '#E8D8B4', path: '#B7AA8C', glow: 0.8 },
  { id: 'fondo', from: -115, to: -60, light: '#CFE8FF', path: '#8C98A6', glow: 0.6 },
  { id: 'relojes', from: -60, to: -25, light: '#D6E8B8', path: '#C4CFA6', glow: 1 },
  { id: 'nave', from: -25, to: 5, light: '#FFF3D8', path: '#EFE6CF', glow: 1.3 },
  { id: 'indice', from: 5, to: 30, light: '#FFE2A0', path: '#E8D9AE', glow: 1 },
  { id: 'archivista', from: 30, to: 78, light: '#FFC878', path: '#E0C99A', glow: 1.1 },
];

/** Cuánto va de `from` a `to` (grados, hacia el este). */
function span(from: number, to: number): number {
  return (((to - from) % 360) + 360) % 360;
}

/** La sala de una longitud. */
export function roomAt(lon: number): Room {
  const found = ROOMS.find((room) => span(room.from, lon) < span(room.from, room.to));
  return found ?? (ROOMS[0] as Room);
}

/** Dónde están los mamparos: al principio de cada sala. */
export const BULKHEAD_LONS: readonly number[] = ROOMS.map((room) => room.from);

/** Lo que el mamparo respira de grosor (m) y su puerta: alto y medio ancho (m). */
export const BULKHEAD_THICK = 0.6;
export const DOOR = { height: 3.2, half: 1.5 } as const;
/** El pasillo de los cajones es estrecho: medio ancho entre sus paredes de cajones (m). */
export const CORRIDOR_HALF = 2.4;

/** Si una longitud está en el pasillo de los cajones. */
export function inCorridor(lon: number): boolean {
  return roomAt(lon).id === 'cajones';
}

/** Si una longitud queda a menos de `degrees` de algún mamparo. */
export function nearBulkhead(lon: number, degrees: number): boolean {
  return BULKHEAD_LONS.some((b) => Math.abs(lonDelta(lon, b)) < degrees);
}

/** Si una longitud cae sobre la parte hundida del Fondo (con sus rampas). */
export function onFondo(lon: number): boolean {
  return Math.abs(lonDelta(lon, FONDO.lon)) < FONDO.flat + FONDO.ramp + 1;
}

export interface WallStrip {
  /** Centro y alto de la franja a lo largo del eje que sale del planeta (m, desde el centro del tubo). */
  x: number;
  height: number;
  /** Centro y ancho a lo ancho del tubo (m). */
  z: number;
  width: number;
}

/** El grueso de cada franja horizontal de la pared (4 franjas hacen la puerta). */
const STRIP = DOOR.height / 4;
/** Lo que se separa la pared del vidrio (m). */
const GLASS_GAP = 0.2;

/**
 * Las franjas de piedra que cierran la sección del tubo desde el suelo (a `floor` m del centro del tubo, hacia
 * dentro) hasta arriba, menos la puerta del medio. Cada franja se queda dentro del vidrio.
 */
export function bulkheadStrips(floor: number): WallStrip[] {
  const radius = TUBE_MINOR - GLASS_GAP;
  const strips: WallStrip[] = [];
  const start = floor - 0.3;
  for (let lo = start, row = 0; lo < radius - 0.05; lo += STRIP, row++) {
    const hi = Math.min(lo + STRIP, radius);
    const far = Math.max(Math.abs(lo), Math.abs(hi));
    const half = Math.sqrt(Math.max(0, radius * radius - far * far));
    if (half <= 0.05) break;
    const x = (lo + hi) / 2;
    const height = hi - lo;
    // La puerta ocupa las cuatro franjas de arriba del suelo (la primera, la de la base, llega al suelo mismo).
    if (row < 4 && half > DOOR.half) {
      const width = half - DOOR.half;
      strips.push({ x, height, z: -(DOOR.half + width / 2), width });
      strips.push({ x, height, z: DOOR.half + width / 2, width });
    } else strips.push({ x, height, z: 0, width: half * 2 });
  }
  return strips;
}
