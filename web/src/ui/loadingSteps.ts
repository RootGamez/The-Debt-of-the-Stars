// La pantalla de carga como lógica pura: cuánto se ha hecho (la barra) según el paso en que va la carga, y cuánto
// falta para que se pueda quitar (nunca antes de haberse visto un momento, para que no parpadee).

export type LoadingStage =
  | { kind: 'start' }
  /** Construyendo los mundos del sistema, uno a uno. */
  | { kind: 'worlds'; built: number; total: number }
  /** Preparando la luz: los sombreadores de todos los materiales, por partes, para que no se compilen al jugar. */
  | { kind: 'light'; done: number; total: number }
  | { kind: 'ready' };

/** Qué parte de la barra llena cada paso: construir los mundos y prepararles la luz pesan parecido. */
const START_SHARE = 0.04;
const WORLDS_END = 0.55;
const LIGHT_END = 0.98;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Cuánto se ha cargado (0–1) en ese paso. */
export function loadingFraction(stage: Readonly<LoadingStage>): number {
  switch (stage.kind) {
    case 'start':
      return START_SHARE;
    case 'worlds': {
      const done = stage.total > 0 ? clamp01(stage.built / stage.total) : 1;
      return START_SHARE + (WORLDS_END - START_SHARE) * done;
    }
    case 'light': {
      const done = stage.total > 0 ? clamp01(stage.done / stage.total) : 1;
      return WORLDS_END + (LIGHT_END - WORLDS_END) * done;
    }
    case 'ready':
      return 1;
  }
}

/** Cuánto hay que esperar aún (ms) para quitar la pantalla, si salió en `shownAt` y debe verse al menos `minMs`. */
export function remainingDisplay(shownAt: number, now: number, minMs: number): number {
  return Math.max(0, shownAt + minMs - now);
}
