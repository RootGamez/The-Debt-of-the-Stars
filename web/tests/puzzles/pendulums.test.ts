import { describe, expect, it } from 'vitest';
import {
  PENDULUMS,
  coupled,
  cycleLength,
  isFigure,
  period,
  swing,
} from '../../src/puzzles/pendulums';

describe('the pendulums of the sealed room (Huygens and the clocks that fall in step)', () => {
  it('starts with five pendulums of the same length, hanging from one beam', () => {
    expect(PENDULUMS.count).toBe(5);
    expect(PENDULUMS.start).toEqual([3, 3, 3, 3, 3]);
  });

  it('makes the period depend on the length, as its square root, and not on any weight', () => {
    expect(period(4)).toBeCloseTo(period(1) * 2, 9);
    expect(period(5)).toBeGreaterThan(period(3));
  });

  it('cycles the length of a pendulum notch by notch, from the longest back to the shortest', () => {
    expect(cycleLength(1)).toBe(2);
    expect(cycleLength(4)).toBe(5);
    expect(cycleLength(5)).toBe(1);
  });

  it('opens only with the lengths of the staircase of the Counterweight: 1, 3, 2, 5, 4', () => {
    expect(PENDULUMS.figure).toEqual([1, 3, 2, 5, 4]);
    expect(isFigure([1, 3, 2, 5, 4])).toBe(true);
    expect(isFigure([1, 2, 3, 4, 5])).toBe(false);
    expect(isFigure([3, 3, 3, 3, 3])).toBe(false);
    expect(isFigure([1, 3, 2, 5])).toBe(false);
  });

  it('couples the pendulums while their lengths are close: they fall in step', () => {
    expect(coupled([3, 3, 3, 3, 3])).toBe(true);
    expect(coupled([3, 4, 3, 3, 4])).toBe(true);
    expect(coupled([1, 3, 2, 5, 4])).toBe(false);
  });

  it('swings in unison when coupled and at its own pace when not', () => {
    const same = [3, 3, 3, 3, 3];
    const apart = [1, 3, 2, 5, 4];

    expect(swing(same, 0, 7.3)).toBeCloseTo(swing(same, 4, 7.3), 9);
    expect(swing(apart, 0, 7.3)).not.toBeCloseTo(swing(apart, 4, 7.3), 3);
    for (const t of [0, 1.2, 9.9]) expect(Math.abs(swing(apart, 2, t))).toBeLessThanOrEqual(1);
  });
});
