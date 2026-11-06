// La cara de noche helada de Umbral (Fase 12, ✅ Anthony 2026-11-06): con la rotación bloqueada, la cara que nunca ve
// la Brasa está siempre helada. La escarcha empieza poco después del terminador y es hielo del todo más allá.
import type { XYZ } from './kit';

/** Cuánto pasado el terminador (seno de la altura de la Brasa bajo el horizonte) empieza la escarcha y acaba el hielo. */
export const FROST = { start: 0.12, full: 0.4 } as const;

/**
 * 0 donde da la Brasa, 1 en el hielo de la cara de noche. `wobble` (en las mismas unidades) mueve el borde para que
 * no sea una línea recta.
 */
export function frostAmount(d: XYZ, sun: XYZ, wobble = 0): number {
  const below = -(d.x * sun.x + d.y * sun.y + d.z * sun.z) + wobble;
  const t = Math.min(1, Math.max(0, (below - FROST.start) / (FROST.full - FROST.start)));
  return t * t * (3 - 2 * t);
}
