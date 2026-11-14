import { describe, expect, it } from 'vitest';
import { IDLE_INTENT } from '../../src/core/inputController';
import { BUBBLE } from '../../src/data/bubble';
import { COUNTERWEIGHT } from '../../src/game/counterweight';
import {
  CRADLE,
  createCounterweightPlay,
  LEVER,
  type WorldClock,
} from '../../src/game/counterweightPlay';

/**
 * El Nudo a 1 y Cicatriz a 0,60 (sin curvas: basta para las cuentas). E2: el Laboratorio ya no es un sitio lento
 * (antes 0,20); su ritmo lo pone la burbuja del Contrapeso (×5 mientras espera en su Banco).
 */
const CLOCKS: WorldClock = (world, t) => (world === COUNTERWEIGHT.world ? 1 : 0.6) * t;
const PULSE = 540;
const SOURCE = COUNTERWEIGHT.source;
/** Tu reloj en Cicatriz llevándolo: el ritmo del sitio con la burbuja. */
const CARRIED_IN_CICATRIZ = 0.6 * BUBBLE.carried;

function newPlay() {
  return createCounterweightPlay({ worldClock: CLOCKS, pulseAt: PULSE });
}

/** Cogido en el Banco a los 100 s, llevado a Cicatriz y con el motor fuera a los 300 s. */
function atTheCradle() {
  const play = newPlay();
  play.update({ t: 100, carrierRate: BUBBLE.bench, piloting: false });
  play.actions.run(SOURCE);
  play.update({ t: 300, carrierRate: CARRIED_IN_CICATRIZ, piloting: false });
  play.actions.run(LEVER);
  play.actions.run(CRADLE);
  return play;
}

describe('the Counterweight in play', () => {
  it('waits on its bench, ticking inside its bubble (five times the Nudo), until it is picked up', () => {
    const play = newPlay();

    expect(play.update({ t: 100, carrierRate: 1, piloting: false })).toBe('bench');
    expect(play.snapshot()).toMatchObject({ place: 'bench', clock: 500, inShip: false });
    expect(play.clock).toBeUndefined(); // en el Banco no va al tablero
    expect(play.actions.gone(SOURCE)).toBe(false);
    expect(play.actions.verb(SOURCE, true)).toBeUndefined(); // primero se examina
    expect(play.actions.verb(SOURCE, false)).toBe('coger');
    expect(play.actions.verb('lab.pizarra', false)).toBeUndefined();
  });

  it('once picked up goes with you: in your arms, or in the ship while you fly', () => {
    const play = newPlay();
    play.update({ t: 100, carrierRate: BUBBLE.bench, piloting: false });
    play.actions.run(SOURCE);

    // Llevado, marca a tu ritmo (que ya lleva su burbuja): 50 s de Umbral en el Taller son 50 × 0,85 × 2,5.
    expect(play.update({ t: 150, carrierRate: 0.85 * BUBBLE.carried, piloting: false })).toBe(
      'held',
    );
    expect(play.clock).toBeCloseTo(606.25);
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
    expect(play.snapshot().clock).toBeCloseTo(50);
  });

  it('does not lose time when the clock jumps back (debug)', () => {
    const play = newPlay();
    play.update({ t: 100, carrierRate: 1, piloting: false });
    play.update({ t: 40, carrierRate: 1, piloting: false });
    play.update({ t: 50, carrierRate: 1, piloting: false });

    expect(play.snapshot().clock).toBeCloseTo(550);
  });
});

describe('the bubble of the Counterweight (E2)', () => {
  it('speeds up the Laboratorio while it waits, and leaves it at the rate of the Nudo once taken', () => {
    const play = newPlay();

    expect(play.worldFactor(COUNTERWEIGHT.world)).toBe(BUBBLE.bench);
    expect(play.worldFactor('umbral')).toBe(1);
    play.actions.run(SOURCE);
    expect(play.worldFactor(COUNTERWEIGHT.world)).toBe(1);
  });

  it('carried, it speeds up your own clock (so the loop goes slower for the whole system)', () => {
    const play = atTheCradle();
    expect(play.carrierFactor).toBe(1); // en la cuna ya no lo llevas

    play.reset();
    expect(play.carrierFactor).toBe(1); // en su Banco tampoco
    play.actions.run(SOURCE);
    expect(play.carrierFactor).toBe(BUBBLE.carried);
  });

  it('keeps its third clock ahead of every other one, and further ahead the longer it takes', () => {
    const play = newPlay();
    play.update({ t: 100, carrierRate: BUBBLE.bench, piloting: false });
    play.actions.run(SOURCE);
    const machineAt = (t: number) => CLOCKS(COUNTERWEIGHT.installWorld, t);

    const early = play.clock ?? 0;
    expect(early).toBeGreaterThan(100); // por delante de Umbral
    expect(early).toBeGreaterThan(machineAt(100)); // y de la máquina
    play.update({ t: 300, carrierRate: CARRIED_IN_CICATRIZ, piloting: false });
    const late = play.clock ?? 0;

    expect(late - machineAt(300)).toBeGreaterThan(early - machineAt(100));
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
    // Cogido con 500 s; 200 s de Umbral llevado en Cicatriz (0,6 × 2,5) son 300 s más. La máquina: 0,6 × 300.
    expect(before).toMatchObject({ place: 'cradle', motorOut: true, matched: false });
    expect(before.counterweight).toBeCloseTo(800);
    expect(before.machine).toBeCloseTo(180);

    play.wheels.turn('minutes', -10);
    play.wheels.turn('seconds', -20);

    expect(play.wheels.read()).toMatchObject({ matched: true });
  });

  it('is installed by the pulse when the clocks match, and rises into the core', () => {
    const play = atTheCradle();
    play.wheels.turn('minutes', -10);
    play.wheels.turn('seconds', -20);

    // Un salto grande hasta pasado el pulso: en la cuna los dos relojes van a la par (la cuna no lo acelera).
    expect(play.update({ t: PULSE + 2, carrierRate: 1, piloting: false })).toBe('core');
    expect(play.place).toBe('installed');
    expect(play.worldFactor(COUNTERWEIGHT.installWorld)).toBe(1); // instalado, todo sigue como hoy
  });

  it('is pushed out by the pulse when they do not match', () => {
    const play = atTheCradle();

    expect(play.update({ t: PULSE + 2, carrierRate: 1, piloting: false })).toBe('cradle');
    expect(play.place).toBe('rejected');
    expect(play.wheels.read().matched).toBe(false);
  });
});
