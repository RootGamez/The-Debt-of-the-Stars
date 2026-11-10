// La luz de la estrella a distintas distancias (lógica pura). Con `caida` 0 todos los mundos reciben lo mismo; con
// 0,5 la luz cae como 1/√d: el Taller, a 500 m, recibe casi el doble que Umbral, y el Observatorio algo menos.
// Umbral (el mundo de referencia) queda como estaba.
import type { StarSpec } from './systemData';

type Falloff = Pick<StarSpec, 'intensity' | 'falloff'>;

/** Cuánta luz hay a `distance` respecto de la que hay a `reference` (1 = la de referencia). */
export function relativeBrightness(star: Falloff, reference: number, distance: number): number {
  return (reference / Math.max(distance, 1)) ** star.falloff;
}

/** Intensidad de la PointLight (con `decay = caida`) para que a `reference` valga `star.intensity`. */
export function sourceIntensity(star: Falloff, reference: number): number {
  return star.intensity * reference ** star.falloff;
}
