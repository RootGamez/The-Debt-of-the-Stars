// Registrador de tirones de cámara (solo depuración): cada fotograma anota cuánto tardó, cuánto giró la vista (ratón)
// y cuánto avanzó la cámara, y resume la última ventana para ver de qué lado está el salto: ritmo de fotogramas
// irregular, mirada a golpes o avance a trompicones.

export interface JitterSample {
  /** Segundos reales del fotograma (sin recortar). */
  seconds: number;
  /** Mirada acumulada en el fotograma (píxeles del ratón, módulo). */
  lookPixels: number;
  /** Metros que se movió la cámara respecto al fotograma anterior. */
  moved: number;
}

export interface JitterSummary {
  frames: number;
  medianMs: number;
  maxMs: number;
  /** Fotogramas que tardaron más de 1,5 veces la mediana. */
  longFrames: number;
  /** Mirada: lo mayor en un fotograma (px) y cuántos fotogramas con mirada hubo. */
  lookMaxPx: number;
  lookFrames: number;
  /** Velocidad aparente (m/s) mínima, mediana y máxima entre los fotogramas en que andas. */
  speedMin: number;
  speedMedian: number;
  speedMax: number;
}

const WINDOW_FRAMES = 240;
const MOVING_SPEED = 0.5;

function median(sorted: readonly number[]): number {
  return sorted.length === 0 ? 0 : (sorted[Math.floor(sorted.length / 2)] as number);
}

export function summarizeJitter(samples: readonly JitterSample[]): JitterSummary {
  const times = samples.map((s) => s.seconds * 1000).sort((a, b) => a - b);
  const medianMs = median(times);
  const speeds = samples
    .filter((s) => s.seconds > 0)
    .map((s) => s.moved / s.seconds)
    .filter((v) => v > MOVING_SPEED)
    .sort((a, b) => a - b);
  const looks = samples.filter((s) => s.lookPixels > 0);
  return {
    frames: samples.length,
    medianMs,
    maxMs: times.at(-1) ?? 0,
    longFrames: times.filter((t) => t > medianMs * 1.5).length,
    lookMaxPx: Math.max(0, ...looks.map((s) => s.lookPixels)),
    lookFrames: looks.length,
    speedMin: speeds[0] ?? 0,
    speedMedian: median(speeds),
    speedMax: speeds.at(-1) ?? 0,
  };
}

export interface FrameJitter {
  record(sample: JitterSample): void;
  summary(): JitterSummary;
  /** Una línea para el panel F3. */
  line(): string;
}

export function createFrameJitter(windowFrames = WINDOW_FRAMES): FrameJitter {
  const samples: JitterSample[] = [];
  const summary = (): JitterSummary => summarizeJitter(samples);
  return {
    record(sample) {
      samples.push(sample);
      if (samples.length > windowFrames) samples.shift();
    },
    summary,
    line() {
      const s = summary();
      return [
        `fotograma ${s.medianMs.toFixed(1)} ms (máx ${s.maxMs.toFixed(1)}, largos ${s.longFrames}/${s.frames})`,
        `mirada máx ${s.lookMaxPx.toFixed(0)} px en ${s.lookFrames} fot.`,
        `avance ${s.speedMin.toFixed(2)}–${s.speedMedian.toFixed(2)}–${s.speedMax.toFixed(2)} m/s`,
      ].join('\n');
    },
  };
}
