// El vigilante de fotogramas del modo automático: mide cuánto tarda cada fotograma y avisa cuando el dispositivo no
// llega, para que el juego baje un escalón de calidad. Solo baja (subir y bajar sin parar marea); cada bajada vuelve
// a esperar y a medir, así que baja de uno en uno hasta que va fluido.

export interface GovernorOptions {
  /** Por debajo de estos fotogramas por segundo (de media) se baja un escalón. */
  minFps: number;
  /** Fotogramas que se ignoran tras empezar o tras cada bajada (compilar, cambiar tamaños de mapas…). */
  warmupFrames: number;
  /** Fotogramas que se miden antes de decidir. */
  windowFrames: number;
  /** Un fotograma más largo que esto (s) fue un parón (pestaña oculta, carga) y no se cuenta. */
  maxFrameSeconds: number;
}

export const DEFAULT_GOVERNOR: Readonly<GovernorOptions> = {
  // 27 y no 30: un móvil que limita a 30 Hz (ahorro de batería) no debe quedarse sin sombras por eso.
  minFps: 27,
  warmupFrames: 90,
  windowFrames: 180,
  maxFrameSeconds: 0.5,
};

export interface FpsGovernor {
  /** Anota un fotograma (segundos que tardó); devuelve true si toca bajar un escalón. */
  sample(frameSeconds: number): boolean;
  /** Vuelve a esperar y a medir desde cero. */
  reset(): void;
}

export function createFpsGovernor(options: Partial<GovernorOptions> = {}): FpsGovernor {
  const { minFps, warmupFrames, windowFrames, maxFrameSeconds } = {
    ...DEFAULT_GOVERNOR,
    ...options,
  };
  let skipped = 0;
  let frames = 0;
  let seconds = 0;
  const reset = (): void => {
    skipped = 0;
    frames = 0;
    seconds = 0;
  };
  return {
    sample(frameSeconds) {
      if (!Number.isFinite(frameSeconds) || frameSeconds <= 0 || frameSeconds > maxFrameSeconds) {
        return false;
      }
      if (skipped < warmupFrames) {
        skipped += 1;
        return false;
      }
      frames += 1;
      seconds += frameSeconds;
      if (frames < windowFrames) return false;
      const slow = seconds / frames > 1 / minFps;
      frames = 0;
      seconds = 0;
      if (slow) skipped = 0;
      return slow;
    },
    reset,
  };
}
