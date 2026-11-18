// Monta al escéptico en la Sala del Centro del Taller (plan de finales, E5): une su juego (skepticPlay.ts) con lo que se
// ve (render/skepticView.ts). Si el Taller no está cargado, no hay nada que montar.
import type { Vector3 } from 'three';
import { createSkepticView, type SkepticView } from '../render/skepticView';
import { SHELL_RADIUS } from '../worlds/procedural/tallerShape';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { createSkepticPlay, type SkepticPlay, type SkepticPlayOptions } from './skepticPlay';

const WORLD = 'taller';

/** Depuración (con `?debug`; aparte de `__juego` mientras ui/debugOverlay.ts esté ocupado por otro trabajo). */
export interface SkepticDebug {
  snapshot(): ReturnType<SkepticRig['snapshot']>;
  /** Te da la fuente sin llevar el Contrapeso: corta el bucle. */
  cut(): void;
}

declare global {
  interface Window {
    __esceptico?: SkepticDebug;
  }
}

export interface SkepticRig {
  readonly play: SkepticPlay;
  /** Cada fotograma: dónde está el jugador (mundo y posición en su marco). */
  update(dt: number, world: string, position: Vector3): void;
  /** Un ciclo nuevo (también tras «Sin vuelta»). */
  restart(): void;
  snapshot(): ReturnType<SkepticPlay['snapshot']> & {
    view: ReturnType<SkepticView['snapshot']> | null;
  };
}

export function createSkepticRig(
  options: SkepticPlayOptions & { runtimes: ReadonlyMap<string, WorldRuntime> },
): SkepticRig | undefined {
  const taller = options.runtimes.get(WORLD);
  if (!taller) return undefined;
  const play = createSkepticPlay(options);
  const view = createSkepticView(taller.world.scene);
  return {
    play,
    update(dt, world, position) {
      // Fuera de la cáscara de la sala con el bucle cortado: ha salido contigo por el anillo.
      if (world === WORLD && position.length() > SHELL_RADIUS) play.leave();
      view?.update(dt, { stage: play.stage, left: play.state.left, loopCut: play.loopCut });
    },
    restart() {
      play.restart();
      view?.reset();
    },
    snapshot() {
      return { ...play.snapshot(), view: view?.snapshot() ?? null };
    },
  };
}
