// La fuente de poder de la Cámara del Centro del Taller y el corte del bucle (plan de finales, §3.4 y §3.5).
// Mientras la fuente está en su sitio el bucle gira y cada ciclo lo devuelve todo a su lugar. Cuando sale de él
// (entregada y encajada en el Contrapeso, o perdida) el bucle se corta: las 15:00 dejan de reiniciar y la fuente ya
// no vuelve. Nada de esto se guarda (nada de objetos persiste): al recargar, la fuente vuelve a su sitio.
// Lógica pura e inmutable: devuelve estados nuevos. Quien la usa (main.ts) avisa al director con `cutLoop()`.
import { MIN_RATE } from '../core/loopClock';
import type { DeathCause } from '../core/loopDirector';
import { horizonRate } from '../system/blackHole';

/** Dónde está la fuente: en su sitio, encajada en el Contrapeso, o perdida. */
export type PowerSourceState = 'inPlace' | 'inContrapeso' | 'lost';

export interface LoopCore {
  readonly source: PowerSourceState;
}

export function createLoopCore(): LoopCore {
  return Object.freeze({ source: 'inPlace' });
}

/** El bucle está cortado en cuanto la fuente sale de su sitio. */
export function isLoopCut(core: LoopCore): boolean {
  return core.source !== 'inPlace';
}

/**
 * Mueve la fuente. Solo vale salir de su sitio (a la que sea) o pasar de encajada a perdida; no hay vuelta atrás.
 * Una orden que no cambia nada devuelve el mismo estado.
 */
export function moveSource(core: LoopCore, to: PowerSourceState): LoopCore {
  if (core.source === to || to === 'inPlace') return core;
  if (core.source === 'lost') return core;
  return Object.freeze({ source: to });
}

/** Cada ciclo lo vuelve todo a su sitio mientras el bucle no esté cortado; cortado, deja de reiniciar. */
export function restartLoopCore(core: LoopCore): LoopCore {
  return isLoopCut(core) ? core : createLoopCore();
}

// ---------------------------------------------------------------------------------------------------------------
// Bajar al horizonte estable sin haber cortado el bucle (propuesta): el reloj de fuera se acelera y las 15:00
// llegan antes que tú.

/** El hecho del cuaderno (se añadirá al grafo de pistas en E6). */
export const HORIZON_LATE_FACT = 'bucle.horizonte_tarde';

export interface HorizonDescent {
  /** Tiempo de Umbral ahora (s). */
  t: number;
  /** Duración del ciclo (s). */
  duration: number;
  /** Ritmo del reloj del sitio sin contar el horizonte (1 en el espacio abierto). */
  baseRate: number;
  /** Distancia actual al centro del horizonte (m) y su radio. */
  distance: number;
  radius: number;
  /** Velocidad de acercamiento (m/s). */
  speed: number;
}

const DESCENT_STEP = 0.1;
const MAX_DESCENT_STEPS = 200_000;

/**
 * ¿Llegan las 15:00 antes de cruzar el horizonte? Sigue el descenso a velocidad constante con el mismo reloj que el
 * director (modo B: el tiempo de fuera avanza `1 / ritmo`, y el ritmo se hunde al acercarse). Sin ir hacia dentro
 * (velocidad nula) no hay cruce que llegue tarde.
 */
export function horizonArrivesLate(descent: HorizonDescent): boolean {
  const { duration, baseRate, radius, speed } = descent;
  let { t, distance } = descent;
  if (t >= duration) return true;
  if (!(speed > 0) || !(radius > 0)) return false;
  for (let i = 0; i < MAX_DESCENT_STEPS && distance > radius; i++) {
    const rate = Math.max(MIN_RATE, baseRate * horizonRate(distance, radius));
    t += DESCENT_STEP / rate;
    if (t >= duration) return true;
    distance -= speed * DESCENT_STEP;
  }
  return false;
}

/**
 * Qué pasa al llegar al horizonte estable: con el bucle cortado se cruza (el epílogo); sin cortar, las 15:00 llegan
 * antes que tú (el ciclo acaba y despiertas en Umbral) por deprisa que bajes.
 */
export function horizonCrossing(loopCut: boolean): 'cross' | 'late' {
  return loopCut ? 'cross' : 'late';
}

export interface HorizonLateCheck {
  cause: DeathCause | undefined;
  loopCut: boolean;
  /** Lo cerca que estabas del horizonte al acabar el ciclo (0–1, `horizon.closeness`). */
  closeness: number;
}

/** El hecho que anota el cuaderno si el ciclo acabó (`fin`) cerca del horizonte con el bucle sin cortar. */
export function horizonLateFact(check: HorizonLateCheck): string | undefined {
  if (check.loopCut || check.cause !== 'fin' || !(check.closeness > 0)) return undefined;
  return HORIZON_LATE_FACT;
}
