import { describe, expect, it } from 'vitest';
import {
  atPulse,
  COUNTERWEIGHT,
  COUNTERWEIGHT_START,
  driftFrom,
  machineTime,
  pickUp,
  placeInCradle,
  removeMotor,
  shownTime,
  tickCounterweight,
  turnWheel,
  type CounterweightState,
} from '../../src/game/counterweight';

/** La curva de Cicatriz (cronologia.json): 0,60 al empezar y 0,35 al nacer el agujero negro. */
const CICATRIZ: readonly (readonly [number, number])[] = [
  [0, 0.6],
  [810, 0.35],
];
const PULSE = 540;

function ready(clock: number): CounterweightState {
  return placeInCradle(removeMotor(pickUp({ ...COUNTERWEIGHT_START, clock }), 100, PULSE));
}

describe('the clock of the Counterweight', () => {
  it('runs at the rate of wherever it is', () => {
    const onBench = tickCounterweight(COUNTERWEIGHT_START, 100, 0.2);
    const carried = tickCounterweight(pickUp(onBench), 50, 1);

    expect(onBench.clock).toBeCloseTo(20);
    expect(carried.clock).toBeCloseTo(70);
    expect(COUNTERWEIGHT_START.clock).toBe(0); // no cambia el de antes
  });

  it('stops counting once installed, and ignores nonsense', () => {
    const installed: CounterweightState = { ...COUNTERWEIGHT_START, place: 'installed', clock: 5 };

    expect(tickCounterweight(installed, 10, 1)).toBe(installed);
    expect(tickCounterweight(COUNTERWEIGHT_START, -1, 1)).toBe(COUNTERWEIGHT_START);
    expect(tickCounterweight(COUNTERWEIGHT_START, 1, Number.NaN)).toBe(COUNTERWEIGHT_START);
  });
});

describe('the clock of the machine of Cicatriz', () => {
  it('slows down as the collapse comes', () => {
    expect(machineTime(0, 0.6, CICATRIZ)).toBe(0);
    expect(machineTime(100, 0.6)).toBeCloseTo(60);
    // A las 9:00 el ritmo ya ha bajado: menos de 0,6 × 540.
    const atPulse = machineTime(PULSE, 0.6, CICATRIZ);
    const rateAtPulse = 0.6 - (0.25 * PULSE) / 810;
    expect(atPulse).toBeCloseTo(((0.6 + rateAtPulse) / 2) * PULSE);
    expect(atPulse).toBeLessThan(0.6 * PULSE);
    // Más allá del último punto, el ritmo se queda en 0,35.
    expect(machineTime(900, 0.6, CICATRIZ) - machineTime(810, 0.6, CICATRIZ)).toBeCloseTo(
      0.35 * 90,
    );
  });
});

describe('installing the Counterweight', () => {
  it('needs the old motor out before the pulse, and the Counterweight carried', () => {
    expect(placeInCradle(pickUp(COUNTERWEIGHT_START)).place).toBe('carried'); // motor dentro
    expect(removeMotor(COUNTERWEIGHT_START, PULSE, PULSE).motorOut).toBe(false); // ya es tarde
    expect(placeInCradle(removeMotor(COUNTERWEIGHT_START, 10, PULSE)).place).toBe('bench');
    expect(ready(0).place).toBe('cradle');
  });

  it('turns the wheels only in the cradle, a minute or a second at a time', () => {
    const turned = turnWheel(turnWheel(ready(100), 'minutes', 2), 'seconds', -5);

    expect(shownTime(turned)).toBe(100 + 2 * COUNTERWEIGHT.wheels.minutes - 5);
    expect(turnWheel(COUNTERWEIGHT_START, 'minutes', 1)).toBe(COUNTERWEIGHT_START);
    expect(turnWheel(ready(0), 'seconds', 0.5).adjust).toBe(0);
  });

  it('fits at the pulse when both clocks agree', () => {
    const machine = 300;
    const set = turnWheel(turnWheel(ready(170), 'minutes', 2), 'seconds', 10);

    expect(driftFrom(set, machine)).toBe(0);
    expect(atPulse(set, machine + COUNTERWEIGHT.tolerance).place).toBe('installed');
  });

  it('is pushed out by the pulse when they do not, until the next loop', () => {
    const rejected = atPulse(ready(170), 300);

    expect(rejected.place).toBe('rejected');
    expect(placeInCradle(rejected).place).toBe('rejected');
    expect(atPulse(pickUp(COUNTERWEIGHT_START), 0).place).toBe('carried'); // fuera de la cuna, nada
  });
});
