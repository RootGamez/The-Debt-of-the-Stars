// Dónde están la Cisterna del Fondo del Cañón (P4) y la Sala Cerrada con sus péndulos (P3) del Archivo (plan de
// historia y puzzles físicos, T7; 🟡). Latitud y longitud sobre el suelo de la Galería (grados); el resto, en metros,
// en el marco de cada sitio (Z arriba).
import { PENDULUMS } from '../../puzzles/pendulums';
import type { Triple } from './kit';

/** La cisterna: una pila de piedra junto a los registros del Fondo, en la parte llana. */
export const CISTERN_AT = { lat: 0, lon: -103.5 } as const;
export const BASIN = { radius: 1.3, height: 1.1 } as const;
/** La altura del agua (m sobre el suelo de la cisterna) para `parts` partes de piedra: a 7 llega al borde. */
export function waterHeight(parts: number): number {
  return 0.15 + parts * 0.1357;
}

/** Los montones de piedra y madera, junto a la cisterna. */
export const PILE_HOMES = {
  b1: { lat: 2.6, lon: -104.6 },
  b2: { lat: 2.6, lon: -102.4 },
  b3: { lat: 2.6, lon: -100.3 },
  wood: { lat: -2.6, lon: -102.2 },
} as const;
/** El tamaño de cada bloque (m) según sus partes de piedra, y el de un tablón. */
export const BLOCK_SIZE = { b1: 0.28, b2: 0.38, b3: 0.5 } as const;

/** La Sala Cerrada: una cámara sellada en el pasillo de los cajones (marco: Y al este, X al sur). */
export const CELL_AT = { lat: 0, lon: 178 } as const;
export const CELL = { half: 2.8, end: 3.2, wall: 0.4, height: 3.7 } as const;
/** A cuántos grados del centro de la cámara no hay paredes de cajones. */
export const CELL_CLEAR = 4.6;

/** La viga de cobre de los péndulos y dónde cuelga cada uno (x en el marco de la cámara). */
export const BEAM = { y: -0.4, z: 3.35 } as const;
/** Lo que mide cada muesca de largo de la vara (m). */
export const ROD_PER_NOTCH = 0.45;
export function pendulumX(index: number): number {
  return (index - (PENDULUMS.count - 1) / 2) * 0.9;
}

/** El anillo de la trampilla (en la sala del Índice, junto al pie de su muro) y su gemelo dentro de la cámara. */
export const TRAPDOOR_AT = { lat: -2.5, lon: 23 } as const;
export const CELL_RING: Triple = [0, 2.7, 0];

/** Dónde están las tres fuentes de la cámara (marco de la cámara). */
export const CELL_SOURCES = {
  informe: [-2.2, -1.9, 1.25],
  peticion: [0, -3.0, 1.5],
  modelo: [2.0, -1.9, 1.2],
  viga: [-2.45, BEAM.y, 2.4],
} as const satisfies Record<string, Triple>;
