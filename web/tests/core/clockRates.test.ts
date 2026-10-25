import { describe, expect, it } from 'vitest';
import { rateAt } from '../../src/core/clockRates';

const cicatriz = [
  [0, 0.6],
  [810, 0.35],
] as const;

describe('rateAt', () => {
  it('uses the world clock rate from the model when there is no curve', () => {
    expect(rateAt(0.8, undefined, 500)).toBe(0.8);
  });

  it('interpolates a curve linearly', () => {
    expect(rateAt(0.6, cicatriz, 405)).toBeCloseTo(0.475);
  });

  it('holds the first and last values outside the curve', () => {
    expect(rateAt(0.6, cicatriz, -10)).toBeCloseTo(0.6);
    expect(rateAt(0.6, cicatriz, 890)).toBeCloseTo(0.35);
  });

  it('works with curves of more than two points', () => {
    const curve = [
      [0, 1],
      [100, 0.5],
      [200, 1],
    ] as const;

    expect(rateAt(1, curve, 150)).toBeCloseTo(0.75);
  });
});
