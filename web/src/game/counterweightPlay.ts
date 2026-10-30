// El Contrapeso en juego (Fase 10, hitos 10B y 10C): su estado a lo largo del ciclo, lo que se hace con él desde
// las fuentes (cogerlo del Banco, sacar el motor viejo con la palanca, ponerlo en la cuna), las ruedas, el pulso, su
// reloj para el tablero y dónde se ve. La regla vive en counterweight.ts (con tests); esto lo cubren también las
// pruebas de Playwright (e2e/counterweight.spec.ts y e2e/engineRoom.spec.ts).
import type { MoveIntent } from '../core/input';
import type { SourceActions } from '../reading/readingUi';
import type { CounterweightShown } from '../render/counterweightView';
import {
  atPulse,
  COUNTERWEIGHT,
  COUNTERWEIGHT_START,
  driftFrom,
  pickUp,
  placeInCradle,
  removeMotor,
  shownTime,
  tickCounterweight,
  turnWheel,
  type CounterweightPlace,
  type CounterweightState,
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
  motorOut: boolean;
  /** Lo que marca la máquina de Cicatriz (s). */
  machine: number;
}

/** Lo que enseña la cuna: los dos relojes y si se pueden ajustar. */
export interface WheelsReading {
  machine: number;
  /** Lo que marca el Contrapeso si está en la cuna; si no, undefined. */
  counterweight: number | undefined;
  place: CounterweightPlace;
  motorOut: boolean;
  /** Los dos relojes coinciden (dentro de la tolerancia del pulso). */
  matched: boolean;
}

export interface CounterweightWheels {
  read(): WheelsReading;
  turn(wheel: keyof typeof COUNTERWEIGHT.wheels, steps: number): void;
}

export interface CounterweightPlay {
  /** Lo que se hace con sus fuentes además de leerlas. */
  readonly actions: SourceActions;
  readonly wheels: CounterweightWheels;
  /** Lo que marca su esfera mientras lo llevas (para el tablero); si no, undefined. */
  readonly clock: number | undefined;
  readonly place: CounterweightPlace;
  readonly motorOut: boolean;
  /** En brazos no se corre. */
  limit(intent: MoveIntent): MoveIntent;
  /** Una vez por fotograma: avanza su reloj, aplica el pulso y dice dónde se ve. */
  update(frame: CounterweightFrame): CounterweightShown;
  /** Ciclo nuevo: vuelve a su Banco con el reloj a cero, y el motor viejo a su núcleo. */
  reset(): void;
  snapshot(): CounterweightSnapshot;
}

/**
 * Lo que ha marcado el reloj de un mundo a los `t` s de Umbral (el del Banco o el de la Sala del Motor; en la de
 * Cicatriz, el de la máquina). Una integral exacta: así un salto grande del reloj no lo desajusta.
 */
export type WorldClock = (world: string, t: number) => number;

export interface CounterweightPlayOptions {
  worldClock: WorldClock;
  /** Cuándo empieza el pulso (s de Umbral). */
  pulseAt: number;
}

/** Fuentes con acción (cicatriz.json). */
export const LEVER = 'cicatriz.palanca';
export const CRADLE = 'cicatriz.cuna';

export function createCounterweightPlay(options: CounterweightPlayOptions): CounterweightPlay {
  const { worldClock, pulseAt } = options;
  const machineClock = (t: number): number => worldClock(COUNTERWEIGHT.installWorld, t);
  let state: CounterweightState = COUNTERWEIGHT_START;
  let lastT = 0;
  let piloting = false;

  /** El ritmo medio del sitio donde está entre dos instantes: el del Banco, el tuyo si lo llevas o el de Cicatriz. */
  function rateBetween(from: number, to: number, carrierRate: number): number {
    if (state.place === 'carried' || !(to > from)) return carrierRate;
    const world = state.place === 'bench' ? COUNTERWEIGHT.world : COUNTERWEIGHT.installWorld;
    return (worldClock(world, to) - worldClock(world, from)) / (to - from);
  }

  const beforePulse = (): boolean => lastT < pulseAt;

  function verb(id: string, unread: boolean): string | undefined {
    // Primero se examinan; la cuna admite el Contrapeso aunque aún no se haya leído.
    if (id === COUNTERWEIGHT.source && state.place === 'bench' && !unread) return 'coger';
    if (id === LEVER && !unread && !state.motorOut && beforePulse()) return 'tirar';
    if (id === CRADLE && state.place === 'carried' && state.motorOut && beforePulse()) {
      return 'poner';
    }
    return undefined;
  }

  const actions: SourceActions = {
    gone: (id) => id === COUNTERWEIGHT.source && state.place !== 'bench',
    verb,
    run: (id) => {
      if (id === COUNTERWEIGHT.source) state = pickUp(state);
      else if (id === LEVER) state = removeMotor(state, lastT, pulseAt);
      else if (id === CRADLE && beforePulse()) state = placeInCradle(state);
    },
  };

  const wheels: CounterweightWheels = {
    read() {
      const machine = machineClock(lastT);
      const inCradle = state.place === 'cradle';
      return {
        machine,
        counterweight: inCradle ? shownTime(state) : undefined,
        place: state.place,
        motorOut: state.motorOut,
        matched: inCradle && Math.abs(driftFrom(state, machine)) <= COUNTERWEIGHT.tolerance,
      };
    },
    turn(wheel, steps) {
      state = turnWheel(state, wheel, steps);
    },
  };

  function shown(): CounterweightShown {
    if (state.place === 'carried') return piloting ? 'stowed' : 'held';
    if (state.place === 'bench') return 'bench';
    return state.place === 'installed' ? 'core' : 'cradle';
  }

  return {
    actions,
    wheels,
    get clock() {
      return state.place === 'carried' ? shownTime(state) : undefined;
    },
    get place() {
      return state.place;
    },
    get motorOut() {
      return state.motorOut;
    },
    limit(intent) {
      return state.place === 'carried' && intent.run ? { ...intent, run: false } : intent;
    },
    update(frame) {
      // Un salto atrás (depuración) no le quita tiempo: solo cuenta lo que avanza.
      state = tickCounterweight(
        state,
        frame.t - lastT,
        rateBetween(lastT, frame.t, frame.carrierRate),
      );
      // El pulso (también si un salto lo pasa por encima): encaja o rechaza lo que haya en la cuna.
      if (lastT < pulseAt && frame.t >= pulseAt) state = atPulse(state, machineClock(frame.t));
      lastT = frame.t;
      piloting = frame.piloting;
      return shown();
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
        motorOut: state.motorOut,
        machine: machineClock(lastT),
      };
    },
  };
}
