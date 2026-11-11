// Un bucle de sample cuyo volumen sigue a algo del juego (la cercanía de un portal, el tamaño del agujero negro).
// Arranca cuando el nivel se oye por primera vez, se queda vivo en silencio cuando baja a cero, y si todavía no
// hay audio lo reintenta en el fotograma siguiente.
import type { LoopHandle, LoopOptions } from './samplePlayer';

export interface LoopOutput {
  loop(id: string, options?: LoopOptions): LoopHandle | undefined;
}

export interface LoopFollower {
  /** Una vez por fotograma: volumen 0–1 y velocidad de reproducción. */
  follow(level: number, rate?: number): void;
  dispose(): void;
}

/** Por debajo de esto el bucle ni arranca. */
const AUDIBLE = 0.01;
/** Constantes de tiempo (s) del seguimiento: el volumen no salta de golpe. */
const LEVEL_SMOOTH = 0.3;
const RATE_SMOOTH = 0.3;

export function createLoopFollower(output: LoopOutput, id: string): LoopFollower {
  let handle: LoopHandle | undefined;
  return {
    follow(level, rate = 1) {
      const safe = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
      if (!handle && safe > AUDIBLE) handle = output.loop(id, { level: 0 });
      if (!handle) return;
      handle.setLevel(safe, LEVEL_SMOOTH);
      handle.setRate(rate, RATE_SMOOTH);
    },
    dispose() {
      handle?.stop();
      handle = undefined;
    },
  };
}
