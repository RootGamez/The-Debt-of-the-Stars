import { describe, expect, it } from 'vitest';
import { IDLE_INTENT } from '../../src/core/inputController';
import { COUNTERWEIGHT } from '../../src/game/counterweight';
import { createCounterweightPlay, type WorldRate } from '../../src/game/counterweightPlay';

/** El Laboratorio a 0,20 y Cicatriz a 0,60 (sin curvas: basta para las cuentas). */
const RATES: WorldRate = (world) => (world === COUNTERWEIGHT.world ? 0.2 : 0.6);
const SOURCE = COUNTERWEIGHT.source;

describe('the Counterweight in play', () => {
  it('waits on its bench, ticking at the rate of the Laboratorio, until it is picked up', () => {
    const play = createCounterweightPlay(RATES);

    expect(play.update({ t: 100, carrierRate: 1, piloting: false })).toBe('anchored');
    expect(play.snapshot()).toEqual({ place: 'bench', clock: 20, inShip: false });
    expect(play.clock).toBeUndefined(); // en el Banco no va al tablero
    expect(play.actions.gone(SOURCE)).toBe(false);
    expect(play.actions.verb(SOURCE)).toBe('coger');
    expect(play.actions.verb('lab.pizarra')).toBeUndefined();
  });

  it('once picked up goes with you: in your arms, or in the ship while you fly', () => {
    const play = createCounterweightPlay(RATES);
    play.update({ t: 100, carrierRate: 0.2, piloting: false });
    play.actions.run(SOURCE);

    // Llevado, marca a tu ritmo: 50 s de Umbral a 0,85 son 42,5 s suyos.
    expect(play.update({ t: 150, carrierRate: 0.85, piloting: false })).toBe('held');
    expect(play.clock).toBeCloseTo(62.5);
    expect(play.actions.gone(SOURCE)).toBe(true);
    expect(play.actions.verb(SOURCE)).toBeUndefined();
    expect(play.update({ t: 160, carrierRate: 1, piloting: true })).toBe('stowed');
    expect(play.snapshot()).toMatchObject({ place: 'carried', inShip: true });
  });

  it('cannot be carried running', () => {
    const play = createCounterweightPlay(RATES);
    const running = { ...IDLE_INTENT, z: 1, run: true };

    expect(play.limit(running)).toBe(running);
    play.actions.run(SOURCE);
    expect(play.limit(running)).toEqual({ ...running, run: false });
  });

  it('goes back to its bench, with its clock at zero, when the loop starts again', () => {
    const play = createCounterweightPlay(RATES);
    play.update({ t: 300, carrierRate: 1, piloting: false });
    play.actions.run(SOURCE);
    play.update({ t: 400, carrierRate: 1, piloting: false });

    play.reset();

    expect(play.snapshot()).toEqual({ place: 'bench', clock: 0, inShip: false });
    play.update({ t: 10, carrierRate: 1, piloting: false });
    expect(play.snapshot().clock).toBeCloseTo(2);
  });

  it('does not lose time when the clock jumps back (debug)', () => {
    const play = createCounterweightPlay(RATES);
    play.update({ t: 100, carrierRate: 1, piloting: false });
    play.update({ t: 40, carrierRate: 1, piloting: false });
    play.update({ t: 50, carrierRate: 1, piloting: false });

    expect(play.snapshot().clock).toBeCloseTo(22);
  });
});
