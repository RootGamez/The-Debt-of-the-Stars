// El Contrapeso (Fase 10, ✅ pasos de Anthony, CONTEXTO_HISTORIA.md §9): su reloj propio, su burbuja y la regla de
// su instalación, como lógica pura. Se coge en el Banco del Laboratorio; su reloj marca al ritmo del sitio donde está
// (en el Banco, el del Laboratorio dentro de su burbuja; en brazos o en la nave, el tuyo, que también lleva la
// burbuja; en la cuna, el de la máquina); en la Sala del Motor de Cicatriz, antes del pulso, se saca el motor viejo,
// se pone en la cuna y se ajusta con dos ruedas (minutos y segundos) hasta que coincide con el reloj de la máquina;
// el pulso lo encaja si coinciden y lo rechaza si no. Todo vuelve a empezar con el ciclo (los objetos no persisten).
// La burbuja (E2, data/bubble.ts): cerca de él el tiempo corre deprisa. En su Banco acelera el Laboratorio; llevado,
// acelera tu reloj; en la cuna, rechazado o instalado ya no acelera nada (instalado, todo sigue como antes de E2).
import { rateAt, type RateCurve } from '../core/clockRates';
import { BUBBLE } from '../data/bubble';

export const COUNTERWEIGHT = {
  /** Dónde espera: el Banco del Contrapeso. */
  world: 'laboratorio',
  source: 'lab.contrapeso',
  /** Dónde se instala: la Sala del Motor. */
  installWorld: 'cicatriz',
  installSource: 'cicatriz.sala_motor',
  /** El pulso que abre el núcleo (cronologia.json). */
  pulseEvent: 'pulso_cicatriz',
  /** Cuánto pueden diferir los dos relojes al encajarlo (s). */
  tolerance: 1,
  /** Lo que mueve cada rueda (s). */
  wheels: { minutes: 60, seconds: 1 },
} as const;

export type CounterweightPlace = 'bench' | 'carried' | 'cradle' | 'installed' | 'rejected';

export interface CounterweightState {
  readonly place: CounterweightPlace;
  /** Lo que ha marcado su reloj desde el inicio del ciclo (s), sin el ajuste de las ruedas. */
  readonly clock: number;
  /** El ajuste de las ruedas (s). */
  readonly adjust: number;
  /** El motor viejo ya está fuera del núcleo. */
  readonly motorOut: boolean;
}

export const COUNTERWEIGHT_START: CounterweightState = {
  place: 'bench',
  clock: 0,
  adjust: 0,
  motorOut: false,
};

/**
 * Cuánto acelera su burbuja el reloj de un mundo: el del Laboratorio, mientras espera en su Banco (×5); fuera de él,
 * el Laboratorio vuelve al ritmo del Nudo.
 */
export function worldBubble(place: CounterweightPlace, world: string): number {
  return place === 'bench' && world === COUNTERWEIGHT.world ? BUBBLE.bench : 1;
}

/** Cuánto acelera su burbuja el reloj de quien lo lleva, en brazos o en la nave (×2,5). */
export function carrierBubble(place: CounterweightPlace): number {
  return place === 'carried' ? BUBBLE.carried : 1;
}

/** Lo que enseña su esfera: su reloj más el ajuste de las ruedas (s). */
export function shownTime(state: CounterweightState): number {
  return state.clock + state.adjust;
}

/** Su reloj avanza `dtUmbral` segundos de Umbral al ritmo `rate` del sitio donde está; instalado, ya no cuenta. */
export function tickCounterweight(
  state: CounterweightState,
  dtUmbral: number,
  rate: number,
): CounterweightState {
  if (state.place === 'installed' || !(dtUmbral > 0) || !Number.isFinite(rate)) return state;
  return { ...state, clock: state.clock + Math.max(0, rate) * dtUmbral };
}

/** Lo que marca el reloj de la máquina a los `t` s de Umbral: su ritmo baja con el colapso (curva de Cicatriz). */
export function machineTime(t: number, baseRate: number, curve?: RateCurve): number {
  if (!(t > 0)) return 0;
  // Integral exacta de una curva a tramos rectos: la regla del trapecio en cada tramo (y en los extremos fijos).
  // Se recorren las marcas de la curva entre 0 y `t` sin juntarlas en arrays: se llama en cada fotograma.
  let total = 0;
  let a = 0;
  for (const point of curve ?? []) {
    const b = point[0];
    if (!(b > 0 && b < t)) continue;
    total += ((rateAt(baseRate, curve, a) + rateAt(baseRate, curve, b)) / 2) * (b - a);
    a = b;
  }
  total += ((rateAt(baseRate, curve, a) + rateAt(baseRate, curve, t)) / 2) * (t - a);
  return total;
}

/** Cogerlo del Banco. */
export function pickUp(state: CounterweightState): CounterweightState {
  return state.place === 'bench' ? { ...state, place: 'carried' } : state;
}

/** Sacar el motor viejo: solo antes del pulso (después, el núcleo se ha cerrado con él dentro). */
export function removeMotor(
  state: CounterweightState,
  t: number,
  pulseAt: number,
): CounterweightState {
  return t < pulseAt && !state.motorOut ? { ...state, motorOut: true } : state;
}

/** Ponerlo en la cuna del núcleo: hace falta llevarlo y que el motor viejo esté fuera. */
export function placeInCradle(state: CounterweightState): CounterweightState {
  return state.place === 'carried' && state.motorOut ? { ...state, place: 'cradle' } : state;
}

/** Girar una rueda (`steps` positivos adelantan, negativos atrasan). Solo en la cuna. */
export function turnWheel(
  state: CounterweightState,
  wheel: keyof typeof COUNTERWEIGHT.wheels,
  steps: number,
): CounterweightState {
  if (state.place !== 'cradle' || !Number.isInteger(steps)) return state;
  return { ...state, adjust: state.adjust + COUNTERWEIGHT.wheels[wheel] * steps };
}

/** Cuánto va adelantado (positivo) o atrasado (negativo) respecto a la máquina (s). */
export function driftFrom(state: CounterweightState, machine: number): number {
  return shownTime(state) - machine;
}

/** El pulso: si está en la cuna y los relojes coinciden, encaja; si no, lo rechaza hasta el próximo ciclo. */
export function atPulse(state: CounterweightState, machine: number): CounterweightState {
  if (state.place !== 'cradle') return state;
  const fits = Math.abs(driftFrom(state, machine)) <= COUNTERWEIGHT.tolerance;
  return { ...state, place: fits ? 'installed' : 'rejected' };
}
