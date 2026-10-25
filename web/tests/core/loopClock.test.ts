import { describe, expect, it } from 'vitest';
import { advanceClock, createLoopClock, formatClock } from '../../src/core/loopClock';

describe('advanceClock in player mode (B: your time is the real time)', () => {
  it('moves both clocks together in Umbral (rate 1)', () => {
    const clock = createLoopClock(900);

    advanceClock(clock, 10, 1, 'player');

    expect(clock.t).toBeCloseTo(10);
    expect(clock.tau).toBeCloseTo(10);
  });

  it('makes the outside run faster on a slow world', () => {
    const clock = createLoopClock(900);

    advanceClock(clock, 60, 0.2, 'player'); // un minuto real en el Laboratorio

    expect(clock.tau).toBeCloseTo(60);
    expect(clock.t).toBeCloseTo(300); // cinco minutos de ciclo
  });

  it('makes the outside run slower on a fast world', () => {
    const clock = createLoopClock(900);

    advanceClock(clock, 23, 1.15, 'player'); // Observatorio

    expect(clock.t).toBeCloseTo(20);
  });
});

describe('advanceClock in reference mode (A: the loop always lasts 15 real minutes)', () => {
  it('keeps the loop clock on real time and slows the player clock', () => {
    const clock = createLoopClock(900);

    advanceClock(clock, 60, 0.8, 'reference');

    expect(clock.t).toBeCloseTo(60);
    expect(clock.tau).toBeCloseTo(48);
  });
});

describe('loop end', () => {
  it('ends exactly when the loop clock reaches the duration', () => {
    const clock = createLoopClock(900);
    advanceClock(clock, 899.9, 1, 'player');
    expect(clock.ended).toBe(false);

    advanceClock(clock, 0.1, 1, 'player');

    expect(clock.ended).toBe(true);
  });

  it('returns the interval it covered so no event is skipped', () => {
    const clock = createLoopClock(900);
    advanceClock(clock, 100, 1, 'player');

    const span = advanceClock(clock, 10, 0.5, 'player');

    expect(span).toEqual({ from: 100, to: 120 });
  });
});

describe('invalid input', () => {
  it('ignores negative or non-finite frame times', () => {
    const clock = createLoopClock(900);

    advanceClock(clock, -5, 1, 'player');
    advanceClock(clock, Number.NaN, 1, 'player');

    expect(clock.t).toBe(0);
    expect(clock.tau).toBe(0);
  });

  it('never divides by a zero or negative clock rate', () => {
    const clock = createLoopClock(900);

    advanceClock(clock, 1, 0, 'player');
    advanceClock(clock, 1, -2, 'player');

    expect(Number.isFinite(clock.t)).toBe(true);
    expect(clock.t).toBeGreaterThan(0);
  });

  it('rejects a non-positive loop duration', () => {
    expect(() => createLoopClock(0)).toThrow(/duración/);
  });
});

describe('formatClock', () => {
  it('shows minutes and seconds', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(192.7)).toBe('03:12');
    expect(formatClock(900)).toBe('15:00');
  });
});
