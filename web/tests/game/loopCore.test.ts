import { describe, expect, it } from 'vitest';
import {
  HORIZON_LATE_FACT,
  createLoopCore,
  horizonArrivesLate,
  horizonLateFact,
  isLoopCut,
  moveSource,
  restartLoopCore,
} from '../../src/game/loopCore';

describe('the power source of the Chamber', () => {
  it('starts in its place with the loop running', () => {
    const core = createLoopCore();

    expect(core.source).toBe('inPlace');
    expect(isLoopCut(core)).toBe(false);
  });

  it('cuts the loop when the source leaves its place, fitted in the Counterweight or lost', () => {
    const fitted = moveSource(createLoopCore(), 'inContrapeso');
    const lost = moveSource(createLoopCore(), 'lost');

    expect(fitted.source).toBe('inContrapeso');
    expect(isLoopCut(fitted)).toBe(true);
    expect(lost.source).toBe('lost');
    expect(isLoopCut(lost)).toBe(true);
  });

  it('returns new states and never changes the old one', () => {
    const start = createLoopCore();
    const moved = moveSource(start, 'inContrapeso');

    expect(moved).not.toBe(start);
    expect(start.source).toBe('inPlace');
    expect(Object.isFrozen(moved)).toBe(true);
  });

  it('lets a fitted source be lost later but never come back', () => {
    const fitted = moveSource(createLoopCore(), 'inContrapeso');

    expect(moveSource(fitted, 'lost').source).toBe('lost');
    expect(moveSource(fitted, 'inPlace')).toBe(fitted);
    const lost = moveSource(fitted, 'lost');
    expect(moveSource(lost, 'inContrapeso')).toBe(lost);
    expect(moveSource(lost, 'inPlace')).toBe(lost);
  });

  it('puts everything back with each cycle while the loop is not cut', () => {
    const core = createLoopCore();

    expect(restartLoopCore(core)).toEqual(core);
    expect(isLoopCut(restartLoopCore(core))).toBe(false);
  });

  it('stops resetting once the loop is cut: the source does not come back', () => {
    const fitted = moveSource(createLoopCore(), 'inContrapeso');

    expect(restartLoopCore(fitted)).toBe(fitted);
    expect(isLoopCut(restartLoopCore(fitted))).toBe(true);
  });
});

describe('arriving at the stable horizon without cutting the loop', () => {
  const base = { duration: 900, baseRate: 1, radius: 10, speed: 5 };

  it('is on time when the cycle has plenty left', () => {
    expect(horizonArrivesLate({ ...base, t: 100, distance: 200 })).toBe(false);
  });

  it('is late when the outside clock, accelerated near the horizon, reaches 15:00 first', () => {
    // Quedan 10 s del ciclo y faltan 20 s de camino: el reloj de fuera se acelera y no llegas.
    expect(horizonArrivesLate({ ...base, t: 890, distance: 110 })).toBe(true);
  });

  it('counts the acceleration: a short trip is on time, a late start is not', () => {
    expect(horizonArrivesLate({ ...base, t: 850, distance: 15 })).toBe(false);
    expect(horizonArrivesLate({ ...base, t: 899.9, distance: 15 })).toBe(true);
  });

  it('is late if the cycle has already ended and never if you are not heading in', () => {
    expect(horizonArrivesLate({ ...base, t: 900, distance: 50 })).toBe(true);
    expect(horizonArrivesLate({ ...base, t: 0, distance: 50, speed: 0 })).toBe(false);
  });

  it('is not late if you are already inside', () => {
    expect(horizonArrivesLate({ ...base, t: 899, distance: 5 })).toBe(false);
  });
});

describe('the note of the notebook', () => {
  it('names the fact of arriving late at the horizon', () => {
    expect(HORIZON_LATE_FACT).toBe('bucle.horizonte_tarde');
  });

  it('writes it when the cycle ends near the horizon with the loop not cut', () => {
    expect(horizonLateFact({ cause: 'fin', loopCut: false, closeness: 0.4 })).toBe(
      HORIZON_LATE_FACT,
    );
  });

  it('does not write it far from the horizon, with the loop cut or for another death', () => {
    expect(horizonLateFact({ cause: 'fin', loopCut: false, closeness: 0 })).toBeUndefined();
    expect(horizonLateFact({ cause: 'fin', loopCut: true, closeness: 0.4 })).toBeUndefined();
    expect(horizonLateFact({ cause: 'caida', loopCut: false, closeness: 0.4 })).toBeUndefined();
    expect(horizonLateFact({ cause: undefined, loopCut: false, closeness: 0.4 })).toBeUndefined();
  });
});
