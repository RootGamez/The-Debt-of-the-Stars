// Cuánto manda cada mundo sobre ti: en qué marco estás (esfera de influencia), qué ritmo marca tu reloj
// y, en el espacio abierto, cuándo te alcanza la absorción. Todo son funciones puras del lugar y del tiempo.
import { MIN_RATE } from '../core/loopClock';
import { GRAVITY_RANGE_RADII } from '../data/movement';
import type { Vector3 } from 'three';

/** Esfera de influencia de un mundo: hasta donde llega su gravedad (radio + alcance), en radios. */
export const SPHERE_RADII = 1 + GRAVITY_RANGE_RADII;
/** El ritmo del reloj se mezcla hasta este número de radios por encima de la superficie. */
export const CLOCK_RANGE_RADII = 3;
/** Se conserva el marco actual hasta este margen por fuera de su esfera (sin parpadeos en el borde). */
const HYSTERESIS = 0.1;
/** Entre esferas que se solapan, el otro mundo debe ganar por esta ratio para cambiar de marco. */
const SWITCH_MARGIN = 0.25;

export interface Sphere {
  world: string;
  /** Centro en el marco del sistema. */
  center: Vector3;
  /** Radio de la esfera de influencia (m). */
  radius: number;
}

/**
 * Mundo cuyo marco manda en `position` (en el marco del sistema), o `undefined` en el espacio abierto.
 * `current` es el mundo de antes: da histéresis para que no se cambie de un lado a otro.
 */
export function pickReference(
  position: Vector3,
  spheres: readonly Sphere[],
  current?: string,
): string | undefined {
  let best: { world: string; ratio: number } | undefined;
  let currentRatio: number | undefined;
  for (const sphere of spheres) {
    const ratio = position.distanceTo(sphere.center) / sphere.radius;
    if (sphere.world === current) currentRatio = ratio;
    if (ratio < 1 && (best === undefined || ratio < best.ratio)) {
      best = { world: sphere.world, ratio };
    }
  }
  if (current !== undefined && currentRatio !== undefined && currentRatio < 1 + HYSTERESIS) {
    if (best === undefined || best.world === current || best.ratio > currentRatio - SWITCH_MARGIN) {
      return current;
    }
  }
  return best?.world;
}

export interface ClockBody {
  center: Vector3;
  radius: number;
  /** Ritmo del reloj en su superficie, ya con la curva del momento (Cicatriz baja con el ciclo). */
  rate: number;
}

/**
 * Ritmo del reloj en `position`: 1 lejos de todo y el del mundo en su superficie, con una mezcla
 * lineal en medio (`1 + Σ peso · (ritmo − 1)`). Así el reloj doble se separa al acercarte a un mundo lento.
 */
export function clockRateAt(position: Vector3, bodies: readonly ClockBody[]): number {
  let rate = 1;
  for (const body of bodies) {
    const above = position.distanceTo(body.center) - body.radius;
    const weight = Math.min(1, Math.max(0, 1 - above / (body.radius * CLOCK_RANGE_RADII)));
    rate += weight * (body.rate - 1);
  }
  return Math.max(MIN_RATE, rate);
}

/** Primer inicio y último final de las ventanas de absorción de todos los mundos. */
export function overallAbsorptionWindow(
  absorption: Record<string, readonly [number, number]>,
): readonly [number, number] | undefined {
  const windows = Object.values(absorption);
  if (windows.length === 0) return undefined;
  return [Math.min(...windows.map((w) => w[0])), Math.max(...windows.map((w) => w[1]))];
}

/** Radio del frente de absorción en el instante `t`: crece en línea recta durante la ventana. */
export function absorptionFrontRadius(
  window: readonly [number, number],
  t: number,
  maxRadius: number,
): number {
  const [start, end] = window;
  if (t < start) return 0;
  if (end <= start || t >= end) return maxRadius;
  return (maxRadius * (t - start)) / (end - start);
}

export function isEngulfed(position: Vector3, origin: Vector3, radius: number): boolean {
  return radius > 0 && position.distanceTo(origin) <= radius;
}
