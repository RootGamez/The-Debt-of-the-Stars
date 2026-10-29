// El tamaño del agujero negro en cada instante y lo que lo rodea, como funciones puras. Crece con la deuda de la
// red: al principio caen las Puertas cercanas y la deuda llega a chorro; al final apenas queda nada que descargar
// (curva que frena, 1 − (1 − p)²). No barre los mundos con su horizonte: los atrae y los estira (Fase 8C), así que
// nunca se ve tragado un mundo que aún vive. render/blackHoleView.ts lo dibuja.
import { BLACK_HOLE } from '../data/blackHole';

/** Radio del horizonte (m) en el instante `t` del reloj de Umbral; 0 antes de nacer. */
export function blackHoleRadius(t: number, hole = BLACK_HOLE): number {
  if (!Number.isFinite(t) || t < hole.born) return 0;
  const progress = Math.min(1, (t - hole.born) / (hole.end - hole.born));
  return hole.maxRadius * (1 - (1 - progress) ** 2);
}

/** El anillo de luz que se ve rodeando el horizonte (la esfera de fotones está a 1,5 radios). */
export function photonRingRadius(horizon: number): number {
  return horizon * 1.5;
}

/** El disco que brilla alrededor (de 2,2 a 5 radios del horizonte). */
export function diskRadii(horizon: number): { inner: number; outer: number } {
  return { inner: horizon * 2.2, outer: horizon * 5 };
}
