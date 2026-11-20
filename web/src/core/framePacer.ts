// El marcapasos de fotogramas. En una pantalla rápida (144 Hz) cada fotograma tiene ~6,9 ms; si el juego tarda casi eso
// en el hilo principal, unos fotogramas llegan a tiempo y otros no, y Chrome repite el anterior en la pantalla: la
// cámara salta aunque el contador marque 144. Cuando el trabajo no cabe con holgura, se dibuja en uno de cada N
// refrescos (144 → 72): cada imagen se ve el mismo tiempo y el movimiento es regular. Nunca baja de MIN_FPS.

export interface FramePacerOptions {
  /** Fracción del refresco que puede ocupar el trabajo de un fotograma antes de pasar a uno de cada N. */
  budget: number;
  /** Para volver a un divisor menor, el trabajo debe caber en esta fracción (histéresis: no oscila). */
  relaxBudget: number;
  /** Fotogramas por segundo por debajo de los que no se divide (en 60 Hz nunca se pasa a 30). */
  minFps: number;
  /** Muestras de trabajo con las que se decide. */
  windowFrames: number;
  /** Divisor fijo (para medir): si se da, no se adapta. */
  fixedDivisor?: number;
}

export const DEFAULT_PACER: Readonly<FramePacerOptions> = {
  budget: 0.75,
  relaxBudget: 0.55,
  minFps: 55,
  windowFrames: 90,
};

/** Un hueco entre refrescos mayor que esto (ms) fue un parón o la pestaña oculta: no cuenta para medir el refresco. */
const MAX_VSYNC_MS = 50;
const VSYNC_SAMPLES = 60;

export interface FramePacer {
  /** En cada refresco (marca del rAF, ms): true si en este toca calcular y dibujar. */
  shouldRun(timeMs: number): boolean;
  /** Tras dibujar: cuánto tardó el trabajo del fotograma (ms). */
  recordWork(ms: number): void;
  /** Se dibuja en uno de cada `divisor` refrescos. */
  readonly divisor: number;
  /** El refresco medido de la pantalla (ms). */
  readonly intervalMs: number;
  /** El percentil 90 del trabajo de la última ventana (ms). */
  readonly workMs: number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : (sorted[sorted.length >> 1] as number);
}

function percentile90(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : (sorted[Math.floor(sorted.length * 0.9)] as number);
}

/** Cuántos refrescos por imagen hacen falta para que el trabajo quepa, sin bajar de `minFps`. */
export function neededDivisor(
  workMs: number,
  intervalMs: number,
  options: Readonly<Pick<FramePacerOptions, 'budget' | 'minFps'>>,
): number {
  if (intervalMs <= 0) return 1;
  const most = Math.max(1, Math.floor(1000 / (options.minFps * intervalMs)));
  const needed = Math.max(1, Math.ceil(workMs / (options.budget * intervalMs)));
  return Math.min(needed, most);
}

export function createFramePacer(options: Partial<FramePacerOptions> = {}): FramePacer {
  const settings = { ...DEFAULT_PACER, ...options };
  const vsyncs: number[] = [];
  const work: number[] = [];
  let divisor = settings.fixedDivisor ?? 1;
  let intervalMs = 0;
  let workMs = 0;
  let lastVsync = Number.NaN;
  let lastRun = Number.NaN;

  const decide = (): void => {
    workMs = percentile90(work);
    if (settings.fixedDivisor !== undefined) return;
    const needed = neededDivisor(workMs, intervalMs, settings);
    if (needed > divisor) {
      divisor = needed;
      work.length = 0;
    } else if (
      divisor > 1 &&
      neededDivisor(workMs, intervalMs, { ...settings, budget: settings.relaxBudget }) < divisor
    ) {
      divisor -= 1;
      work.length = 0;
    }
  };

  return {
    shouldRun(timeMs) {
      const gap = timeMs - lastVsync;
      if (gap > 0 && gap < MAX_VSYNC_MS) {
        vsyncs.push(gap);
        if (vsyncs.length > VSYNC_SAMPLES) vsyncs.shift();
        intervalMs = median(vsyncs);
      }
      lastVsync = timeMs;
      if (divisor === 1 || !(intervalMs > 0) || !Number.isFinite(lastRun)) {
        lastRun = timeMs;
        return true;
      }
      // Por tiempo y no contando llamadas: si un refresco se saltó (el navegador iba tarde), no se espera de más.
      const elapsed = Math.round((timeMs - lastRun) / intervalMs);
      if (elapsed < divisor) return false;
      lastRun = timeMs;
      return true;
    },
    recordWork(ms) {
      if (!Number.isFinite(ms) || ms < 0) return;
      work.push(ms);
      if (work.length >= settings.windowFrames) {
        decide();
        work.length = 0;
      }
    },
    get divisor() {
      return divisor;
    },
    get intervalMs() {
      return intervalMs;
    },
    get workMs() {
      return workMs;
    },
  };
}
