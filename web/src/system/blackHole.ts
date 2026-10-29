// El tamaño del agujero negro en cada instante y lo que lo rodea, como funciones puras. Crece con la deuda de la
// red: al principio caen las Puertas cercanas y la deuda llega a chorro; al final apenas queda nada que descargar
// (curva que frena, 1 − (1 − p)²). No barre los mundos con su horizonte: los atrae y los estira (Fase 8C), así que
// nunca se ve tragado un mundo que aún vive. render/blackHoleView.ts lo dibuja.
import type { Chronology } from '../core/timeline';
import { BLACK_HOLE } from '../data/blackHole';

/** El evento de la cronología con el que nace. */
const BIRTH_EVENT = 'agujero_negro';

/** Cuándo nace, cuándo acaba de crecer (s del reloj de Umbral) y hasta qué radio (m). */
export interface HoleGrowth {
  born: number;
  end: number;
  maxRadius: number;
}

/**
 * El crecimiento según la cronología en uso: nace con su evento y acaba con el ciclo. Con `?ciclo=` (pruebas)
 * la cronología viene escalada y el agujero la sigue.
 */
export function growthFor(chronology: Chronology, hole: HoleGrowth = BLACK_HOLE): HoleGrowth {
  const birth = chronology.events.find((event) => event.id === BIRTH_EVENT);
  return { born: birth?.t ?? hole.born, end: chronology.duration, maxRadius: hole.maxRadius };
}

/** Radio del horizonte (m) en el instante `t` del reloj de Umbral; 0 antes de nacer. */
export function blackHoleRadius(t: number, hole: HoleGrowth = BLACK_HOLE): number {
  if (!Number.isFinite(t) || t < hole.born) return 0;
  const progress = hole.end > hole.born ? Math.min(1, (t - hole.born) / (hole.end - hole.born)) : 1;
  return hole.maxRadius * (1 - (1 - progress) ** 2);
}

/** El anillo de luz que se ve rodeando el horizonte (la esfera de fotones está a 1,5 radios). */
export function photonRingRadius(horizon: number): number {
  return horizon * 1.5;
}

/** Hasta dónde dobla la luz alrededor: el anillo de estrellas, un poco más allá del anillo de luz. */
const EINSTEIN_FACTOR = 2.6;
const MAX_EINSTEIN = Math.PI / 3;

/**
 * Radio angular (rad) del anillo de estrellas dobladas que se ve alrededor del agujero, desde `distance` metros.
 * Lo usa el sombreador del cielo con la misma cuenta que el Nudo (`lensedAngle`).
 */
export function holeEinstein(horizon: number, distance: number): number {
  if (!Number.isFinite(horizon) || !Number.isFinite(distance) || horizon <= 0) return 0;
  return Math.min(MAX_EINSTEIN, Math.atan((EINSTEIN_FACTOR * horizon) / Math.max(distance, 1)));
}

/** El disco que brilla alrededor (de 2,2 a 5 radios del horizonte). */
export function diskRadii(horizon: number): { inner: number; outer: number } {
  return { inner: horizon * 2.2, outer: horizon * 5 };
}
