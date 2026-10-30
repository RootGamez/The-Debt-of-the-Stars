// El Contrapeso en juego (Fase 10, hito 10B): su estado a lo largo del ciclo, lo que se hace con él desde las
// fuentes (cogerlo del Banco), su reloj para el tablero y dónde se ve. La regla vive en counterweight.ts (con tests);
// esto lo cubren las pruebas de Playwright (e2e/counterweight.spec.ts).
import type { MoveIntent } from '../core/input';
import type { SourceActions } from '../reading/readingUi';
import type { CounterweightShown } from '../render/counterweightView';
import {
  COUNTERWEIGHT,
  COUNTERWEIGHT_START,
  pickUp,
  shownTime,
  tickCounterweight,
  type CounterweightPlace,
} from './counterweight';

export interface CounterweightFrame {
  /** Reloj de Umbral (s). */
  t: number;
  /** El ritmo de tu reloj donde estás: el suyo, si lo llevas. */
  carrierRate: number;
  piloting: boolean;
}

export interface CounterweightSnapshot {
  place: CounterweightPlace;
  /** Lo que marca su esfera (s). */
  clock: number;
  /** Va en el relicario de la nave. */
  inShip: boolean;
}

export interface CounterweightPlay {
  /** Lo que se hace con sus fuentes en vez de leerlas: cogerlo del Banco. */
  readonly actions: SourceActions;
  /** Lo que marca su esfera mientras lo llevas (para el tablero); si no, undefined. */
  readonly clock: number | undefined;
  /** En brazos no se corre. */
  limit(intent: MoveIntent): MoveIntent;
  /** Una vez por fotograma: avanza su reloj y dice dónde se ve. */
  update(frame: CounterweightFrame): CounterweightShown;
  /** Ciclo nuevo: vuelve a su Banco, con el reloj a cero. */
  reset(): void;
  snapshot(): CounterweightSnapshot;
}

/** Ritmo del reloj de un mundo en un instante del ciclo (el del Banco o el de la Sala del Motor). */
export type WorldRate = (world: string, t: number) => number;

export function createCounterweightPlay(worldRate: WorldRate): CounterweightPlay {
  let state = COUNTERWEIGHT_START;
  let lastT = 0;
  let piloting = false;

  /** El ritmo del sitio donde está: el del Banco, el tuyo si lo llevas o el de la Sala del Motor. */
  function rateHere(t: number, carrierRate: number): number {
    if (state.place === 'bench') return worldRate(COUNTERWEIGHT.world, t);
    if (state.place === 'carried') return carrierRate;
    return worldRate(COUNTERWEIGHT.installWorld, t);
  }

  const actions: SourceActions = {
    gone: (id) => id === COUNTERWEIGHT.source && state.place !== 'bench',
    verb: (id) => (id === COUNTERWEIGHT.source && state.place === 'bench' ? 'coger' : undefined),
    run: (id) => {
      if (id === COUNTERWEIGHT.source) state = pickUp(state);
    },
  };

  return {
    actions,
    get clock() {
      return state.place === 'carried' ? shownTime(state) : undefined;
    },
    limit(intent) {
      return state.place === 'carried' && intent.run ? { ...intent, run: false } : intent;
    },
    update(frame) {
      // Un salto atrás (depuración) no le quita tiempo: solo cuenta lo que avanza.
      state = tickCounterweight(state, frame.t - lastT, rateHere(frame.t, frame.carrierRate));
      lastT = frame.t;
      piloting = frame.piloting;
      if (state.place !== 'carried') return 'anchored';
      return piloting ? 'stowed' : 'held';
    },
    reset() {
      state = COUNTERWEIGHT_START;
      lastT = 0;
    },
    snapshot() {
      return {
        place: state.place,
        clock: shownTime(state),
        inShip: state.place === 'carried' && piloting,
      };
    },
  };
}
