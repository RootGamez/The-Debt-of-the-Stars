// Las medidas de los dos bancos de pruebas físicas (plan de historia y puzzles físicos, T8; 🟡): la Balanza del
// Contrapeso en la isla de la Cuna del Taller y la placa que canta en la Fundición de Cicatriz. Metros, en el marco
// de cada sitio (Z arriba). Las comparten la geometría y la vista.
import { BALANCE } from '../../puzzles/balance';
import { PLATE } from '../../puzzles/chladni';

/** La balanza: el eje de la viga (x, y) en el marco de la isla, a qué altura gira y lo que separa cada muesca. */
export const BALANCE_AT = { x: 0, y: 5.5 } as const;
export const BEAM_HEIGHT = 1.4;
/** Lo que mide cada «medida» de distancia a lo largo de la viga (m). */
export const MEASURE = 0.5;
/** Los extremos de la viga: de la maqueta (a la izquierda) a la última muesca. */
export const BEAM_SPAN = {
  left: -BALANCE.model.distance * MEASURE - 0.3,
  right: BALANCE.notches * MEASURE + 0.3,
};
/** A qué altura están las marcas de las muescas (bajo la viga). */
export const NOTCH_MARK_HEIGHT = 1.0;
/** Las tres pesas, en su sitio de la isla (x, y). */
export const WEIGHT_HOMES: Readonly<Record<1 | 2 | 3, readonly [number, number]>> = {
  1: [-4, 4],
  2: [-4, 5.5],
  3: [-4, 7],
};
export const WEIGHT_MARK_HEIGHT = 1.1;
/** El lado de la pesa según lo que pesa (m). */
export const WEIGHT_SIZE: Readonly<Record<1 | 2 | 3, number>> = { 1: 0.18, 2: 0.24, 3: 0.3 };

/** La placa de bronce de la Fundición (en el marco de la Fundición): centro, lado y altura de la tapa. */
export const PLATE_AT = { x: -5.5, y: 0 } as const;
export const PLATE_SIZE = 1.8;
export const PLATE_TOP = 1.05;
/** El radio al que están los agujeros y lo que sube su marca de interacción. */
export const HOLE_RADIUS = 0.62;
export const HOLE_MARK_LIFT = 0.3;
/** La posición (x, y, relativa al centro de la placa) del agujero `hole` (1–6). */
export function holeOffset(hole: number): readonly [number, number] {
  const angle = ((hole - 1) / PLATE.holes) * Math.PI * 2;
  return [Math.cos(angle) * HOLE_RADIUS, Math.sin(angle) * HOLE_RADIUS];
}
