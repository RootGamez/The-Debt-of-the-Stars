// El escéptico en juego (plan de finales, E5): qué charla se ve, enseñarle el Contrapeso (te da la fuente y la encaja:
// el bucle se corta) y salir con él por el anillo. Sin Three: lo que se ve lo pinta render/skepticView.ts y quien
// avisa al director del corte es quien lo crea (main.ts, `onHandOver`). Lo que queda (fuente fuera de su sitio, él fuera) se guarda con `loopState()` y vuelve con `restore()`.
import type { LoopState } from '../core/save';
import type { SourceActions } from '../reading/readingUi';
import { isLoopCut } from './loopCore';
import {
  createSkepticState,
  handOverSource,
  isSkepticSource,
  knowsHer,
  leaveWithYou,
  metBefore,
  restoreSkepticState,
  skepticGone,
  skepticLoopState,
  skepticStage,
  skepticVerb,
  SHOW_VERB,
  type SkepticStage,
  type SkepticState,
} from './skeptic';

export interface SkepticPlayOptions {
  /** Las fuentes abiertas alguna vez (también en otras partidas). */
  opened: () => Iterable<string>;
  known: () => ReadonlySet<string>;
  /** Llevas el Contrapeso en brazos. */
  carrying: () => boolean;
  /** Te ha dado la fuente y la ha encajado en el Contrapeso: hay que cortar el bucle. */
  onHandOver: () => void;
  /** Abre la charla (lo que dice mientras lo hace). */
  read: (sourceId: string) => void;
}

export interface SkepticPlay {
  readonly state: SkepticState;
  readonly stage: SkepticStage;
  readonly loopCut: boolean;
  readonly actions: SourceActions;
  /** Depuración: te da la fuente aunque no lleves el Contrapeso (corta el bucle). */
  forceHandOver(): void;
  /** Sale contigo por el anillo (solo con el bucle cortado). */
  leave(): void;
  /** Un ciclo nuevo: la fuente en su sitio y él en casa. */
  restart(): void;
  /** Lo guardado de una partida anterior (core/save.ts): el bucle cortado y si salió contigo no se deshacen. */
  restore(saved: LoopState): void;
  /** Lo que hay que guardar ahora. */
  loopState(): LoopState;
  snapshot(): { stage: SkepticStage; source: string; left: boolean; metBefore: boolean };
}

export function createSkepticPlay(options: SkepticPlayOptions): SkepticPlay {
  let state = createSkepticState(metBefore(options.opened()));
  const stage = (): SkepticStage =>
    skepticStage({
      metBefore: state.metBefore,
      knowsHer: knowsHer(options.known()),
      carrying: options.carrying(),
      loopCut: isLoopCut(state.core),
    });
  const actions: SourceActions = {
    // Se pregunta por cada fuente a la vista en cada fotograma: la etapa solo se calcula para las suyas.
    gone: (id) => isSkepticSource(id) && skepticGone(id, stage(), !state.left),
    verb: (id) => skepticVerb(id, stage()),
    run: (id) => {
      if (skepticVerb(id, stage()) !== SHOW_VERB) return;
      handOver();
      options.read(id);
    },
  };
  function handOver(): void {
    if (isLoopCut(state.core)) return;
    state = handOverSource(state);
    options.onHandOver();
  }
  return {
    get state() {
      return state;
    },
    get stage() {
      return stage();
    },
    get loopCut() {
      return isLoopCut(state.core);
    },
    actions,
    forceHandOver: handOver,
    leave() {
      state = leaveWithYou(state);
    },
    restart() {
      state = createSkepticState(metBefore(options.opened()));
    },
    restore(saved) {
      state = restoreSkepticState(saved, metBefore(options.opened()));
    },
    loopState: () => skepticLoopState(state),
    snapshot() {
      return {
        stage: stage(),
        source: state.core.source,
        left: state.left,
        metBefore: state.metBefore,
      };
    },
  };
}
