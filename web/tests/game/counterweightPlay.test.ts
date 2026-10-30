import { describe, expect, it } from 'vitest';
import { IDLE_INTENT } from '../../src/core/inputController';
import { COUNTERWEIGHT } from '../../src/game/counterweight';
import {
  CRADLE,
  createCounterweightPlay,
  LEVER,
  type WorldClock,
} from '../../src/game/counterweightPlay';

/** El Laboratorio a 0,20 y Cicatriz a 0,60 (sin curvas: basta para las cuentas). */
const CLOCKS: WorldClock = (world, t) => (world === COUNTERWEIGHT.world ? 0.2 : 0.6) * t;
const PULSE = 540;
const SOURCE = COUNTERWEIGHT.source;

function newPlay() {
  return createCounterweightPlay({ worldClock: CLOCKS, pulseAt: PULSE });
}

/** Cogido en el Banco a los 100 s, llevado a Cicatriz y con el motor fuera a los 300 s. */
function atTheCradle() {
  const play = newPlay();
  play.update({ t: 100, carrierRate: 0.2, piloting: false });
  play.actions.run(SOURCE);
  play.update({ t: 300, carrierRate: 0.6, piloting: false });
  play.actions.run(LEVER);
  play.actions.run(CRADLE);
  return play;
}

describe('the Counterweight in play', () => {
  it('waits on its bench, ticking at the rate of the Laboratorio, until it is picked up', () => {
    const play = newPlay();

    expect(play.update({ t: 100, carrierRate: 1, piloting: false })).toBe('bench');
    expect(play.snapshot()).toMatchObject({ place: 'bench', clock: 20, inShip: false });
    expect(play.clock).toBeUndefined(); // en el Banco no va al tablero
    expect(play.actions.gone(SOURCE)).toBe(false);
    expect(play.actions.verb(SOURCE, true)).toBeUndefined(); // primero se examina
    expect(play.actions.verb(SOURCE, false)).toBe('coger');
    expect(play.actions.verb('lab.pizarra', false)).toBeUndefined();
  });

  it('once picked up goes with you: in your arms, or in the ship while you fly', () => {
    const play = newPlay();
    play.update({ t: 100, carrierRate: 0.2, piloting: false });
    play.actions.run(SOURCE);

    // Llevado, marca a tu ritmo: 50 s de Umbral a 0,85 son 42,5 s suyos.
    expect(play.update({ t: 150, carrierRate: 0.85, piloting: false })).toBe('held');
    expect(play.clock).toBeCloseTo(62.5);
    expect(play.actions.gone(SOURCE)).toBe(true);
    expect(play.actions.verb(SOURCE, false)).toBeUndefined();
    expect(play.update({ t: 160, carrierRate: 1, piloting: true })).toBe('stowed');
    expect(play.snapshot()).toMatchObject({ place: 'carried', inShip: true });
  });

  it('cannot be carried running', () => {
    const play = newPlay();
    const running = { ...IDLE_INTENT, z: 1, run: true };

    expect(play.limit(running)).toBe(running);
    play.actions.run(SOURCE);
    expect(play.limit(running)).toEqual({ ...running, run: false });
  });

  it('goes back to its bench, with its clock at zero, when the loop starts again', () => {
    const play = atTheCradle();

    play.reset();

    expect(play.snapshot()).toMatchObject({ place: 'bench', clock: 0, motorOut: false });
    play.update({ t: 10, carrierRate: 1, piloting: false });
    expect(play.snapshot().clock).toBeCloseTo(2);
  });

  it('does not lose time when the clock jumps back (debug)', () => {
    const play = newPlay();
    play.update({ t: 100, carrierRate: 1, piloting: false });
    play.update({ t: 40, carrierRate: 1, piloting: false });
    play.update({ t: 50, carrierRate: 1, piloting: false });

    expect(play.snapshot().clock).toBeCloseTo(22);
  });
});

describe('the engine room', () => {
  it('pulls the old motor out with the lever, after reading it and only before the pulse', () => {
    const play = newPlay();
    play.update({ t: 200, carrierRate: 1, piloting: false });

    expect(play.actions.verb(LEVER, true)).toBeUndefined();
    expect(play.actions.verb(LEVER, false)).toBe('tirar');
    play.actions.run(LEVER);
    expect(play.motorOut).toBe(true);
    expect(play.actions.verb(LEVER, false)).toBeUndefined(); // ya está fuera

    const late = newPlay();
    late.update({ t: PULSE + 1, carrierRate: 1, piloting: false });
    expect(late.actions.verb(LEVER, false)).toBeUndefined();
    late.actions.run(LEVER);
    expect(late.motorOut).toBe(false);
  });

  it('takes the Counterweight in the cradle once the core is open, even before reading it', () => {
    const play = newPlay();
    play.update({ t: 100, carrierRate: 1, piloting: false });
    play.actions.run(SOURCE);
    expect(play.actions.verb(CRADLE, true)).toBeUndefined(); // el motor sigue dentro

    play.actions.run(LEVER);
    expect(play.actions.verb(CRADLE, true)).toBe('poner');
    play.actions.run(CRADLE);

    expect(play.place).toBe('cradle');
    expect(play.update({ t: 101, carrierRate: 1, piloting: false })).toBe('cradle');
    expect(play.clock).toBeUndefined(); // en la cuna se ve en las ruedas, no en el tablero
  });

  it('shows both clocks at the cradle, and the wheels bring them together', () => {
    const play = atTheCradle();
    const before = play.wheels.read();
    // Cogido con 20 s; 200 s de Umbral llevado a 0,6 son 120 s más. La máquina: 0,6 × 300.
    expect(before).toMatchObject({ place: 'cradle', motorOut: true, matched: false });
    expect(before.counterweight).toBeCloseTo(140);
    expect(before.machine).toBeCloseTo(180);

    play.wheels.turn('seconds', 40);

    expect(play.wheels.read()).toMatchObject({ matched: true });
  });

  it('is installed by the pulse when the clocks match, and rises into the core', () => {
    const play = atTheCradle();
    play.wheels.turn('seconds', 40);

    // Un salto grande hasta pasado el pulso: en la cuna los dos relojes van a la par.
    expect(play.update({ t: PULSE + 2, carrierRate: 1, piloting: false })).toBe('core');
    expect(play.place).toBe('installed');
  });

  it('is pushed out by the pulse when they do not match', () => {
    const play = atTheCradle();

    expect(play.update({ t: PULSE + 2, carrierRate: 1, piloting: false })).toBe('cradle');
    expect(play.place).toBe('rejected');
    expect(play.wheels.read().matched).toBe(false);
  });
});
