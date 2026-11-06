import { describe, expect, it } from 'vitest';
import {
  BELLS,
  ballAlong,
  isInTime,
  ringTimes,
  ringsBetween,
  rhythmSpread,
} from '../../src/puzzles/bells';

describe('the bells of the amphitheatre (Galileo and the inclined plane)', () => {
  it('rings later the further down the channel the bell is, as the square root of its mark', () => {
    expect(ringTimes([1, 4, 9, 16])).toEqual([1, 2, 3, 4]);
    expect(ringTimes([16])[0]).toBeCloseTo(4, 6);
  });

  it('plays in time only with the bells at 1, 4, 9 and 16', () => {
    expect(isInTime([1, 4, 9, 16])).toBe(true);
    expect(isInTime([16, 9, 4, 1])).toBe(true);
    expect(rhythmSpread([1, 4, 9, 16])).toBeCloseTo(0, 9);
  });

  it('speeds up when the bells are set at equal distances', () => {
    expect(isInTime([4, 8, 12, 16])).toBe(false);
    expect(isInTime([1, 2, 3, 4])).toBe(false);
    expect(rhythmSpread([4, 8, 12, 16])).toBeGreaterThan(rhythmSpread([1, 4, 9, 15]) * 0.3);
  });

  it('does not play in time with a near miss', () => {
    expect(isInTime([1, 4, 9, 15])).toBe(false);
    expect(isInTime([2, 4, 9, 16])).toBe(false);
  });

  it('needs every bell on a different mark, all on the channel, and all of them placed', () => {
    expect(isInTime([1, 4, 9])).toBe(false);
    expect(isInTime([1, 4, 4, 16])).toBe(false);
    expect(isInTime([1, 4, 9, 17])).toBe(false);
    expect(isInTime([0, 4, 9, 16])).toBe(false);
  });

  it('puts the ball at rest at the top, then further down as it speeds up, and off the channel at the end', () => {
    expect(ballAlong(0)).toBe(0);
    expect(ballAlong(2)).toBeCloseTo(4 * BELLS.spacing, 6);
    expect(ballAlong(4.5)).toBeUndefined();
    expect(ballAlong(4)).toBeCloseTo(16 * BELLS.spacing, 6);
    expect(ballAlong(BELLS.rollSeconds)).toBeUndefined();
    expect(ballAlong(-1)).toBeUndefined();
  });

  it('lists the bells that ring in a stretch of time, repeating every roll', () => {
    const marks = [1, 4, 9, 16];

    expect(ringsBetween(marks, 0.5, 1.5)).toEqual([0]);
    expect(ringsBetween(marks, 0, 4.5)).toEqual([0, 1, 2, 3]);
    expect(ringsBetween(marks, 4.5, 19.9)).toEqual([]);
    expect(ringsBetween(marks, BELLS.rollSeconds + 0.5, BELLS.rollSeconds + 2.5)).toEqual([0, 1]);
  });

  it('knows nothing about a wrong stretch', () => {
    expect(ringsBetween([1, 4, 9, 16], 3, 3)).toEqual([]);
    expect(ringsBetween([1, 4, 9, 16], 3, 2)).toEqual([]);
  });
});
