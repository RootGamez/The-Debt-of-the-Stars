// Las mareas (plan de la Fase 7, decisión 8): cerca de una masa enorme el cuerpo se estira y moverse cuesta.
// La marea es un número de 0 a ~1,4 que frena y deforma la vista; la tensión es lo que se acumula mientras la
// marea pasa de un umbral, y al llenarse mata (muerte `marea`). Se aprende a medir cuánto se aguanta: la
// tensión baja al alejarse. Tres fuentes: el Borde de Cicatriz (crece con el ciclo), la semilla del Nudo
// (al subir hacia el centro de la cavidad) y la cáscara del Nudo (se nota, pero no hace daño: hay que posarse
// en ella para entrar). Lógica pura; game/tideEffects.ts la aplica.

/** Por encima de esta marea la tensión empieza a acumularse. */
export const DAMAGE_FROM = 0.5;
/** Cuánto se acumula por segundo y por unidad de marea sobre el umbral, y cuánto se recupera por segundo. */
const STRAIN_RATE = 0.6;
const RECOVERY = 0.25;

/** El Borde: hasta dónde llega (m) y cómo crece con el reloj de Umbral (s → fuerza junto al Borde). */
const EDGE_RANGE = 35;
const EDGE_CURVE: readonly (readonly [number, number])[] = [
  [0, 0.35],
  [810, 1.0], // 13:30: nace el agujero negro
  [900, 1.3],
];

/** La semilla: desde qué altura sobre la cara interior se nota y en cuántos metros llega a 1. */
const SEED_FROM = 3.5;
const SEED_SPAN = 6;
const MAX_TIDE = 1.4;

/** La cáscara del Nudo: hasta dónde se nota (m sobre su superficie) y su fuerza máxima. */
const SHELL_RANGE = 35;
const SHELL_MAX = 0.3;

/** Cuánto frena la marea como mucho (a marea 1 o más se anda al 40 %). */
const MAX_SLOWDOWN = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function curveAt(curve: readonly (readonly [number, number])[], t: number): number {
  const first = curve[0];
  const last = curve.at(-1);
  if (!first || !last) return 0;
  if (!Number.isFinite(t) || t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (a && b && t <= b[0]) return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
  }
  return last[1];
}

/** Marea junto al Borde de Cicatriz, a `distance` metros de él y en el instante `loopTime` del ciclo. */
export function edgeTide(distance: number, loopTime: number): number {
  if (!Number.isFinite(distance)) return 0;
  const near = clamp(1 - distance / EDGE_RANGE, 0, 1) ** 1.5;
  return near * curveAt(EDGE_CURVE, loopTime);
}

/** Marea de la semilla a `height` metros sobre la cara interior (hacia el centro). */
export function seedTide(height: number): number {
  return clamp((height - SEED_FROM) / SEED_SPAN, 0, MAX_TIDE);
}

/** Marea de la cáscara del Nudo a `distance` metros de su centro (radio de la cáscara `radius`). */
export function shellTide(distance: number, radius: number): number {
  const above = Math.max(0, distance - radius);
  return SHELL_MAX * clamp(1 - above / SHELL_RANGE, 0, 1);
}

/** Factor de la velocidad al andar contra la marea. */
export function speedFactor(tide: number): number {
  return 1 - MAX_SLOWDOWN * clamp(tide, 0, 1);
}

/** La tensión acumulada (0 a 1). Al llegar a 1, la marea mata. */
export class TideStrain {
  private strain = 0;

  get value(): number {
    return this.strain;
  }

  /** Avanza `dt` segundos con esa marea; devuelve si la tensión llegó al máximo. */
  update(tide: number, dt: number): boolean {
    if (!Number.isFinite(tide) || !Number.isFinite(dt) || dt <= 0) return this.strain >= 1;
    if (tide > DAMAGE_FROM) this.strain += (tide - DAMAGE_FROM) * STRAIN_RATE * dt;
    else this.strain -= RECOVERY * dt;
    this.strain = clamp(this.strain, 0, 1);
    return this.strain >= 1;
  }

  reset(): void {
    this.strain = 0;
  }
}
