import { describe, expect, it } from 'vitest';
import { ATMOSPHERES } from '../../src/data/atmospheres';
import { airDensity } from '../../src/system/atmosphere';

describe('the air of a world', () => {
  it('is all sky on the ground and in the first part of the climb', () => {
    expect(airDensity(0, 100)).toBe(1);
    expect(airDensity(15, 100)).toBe(1);
  });

  it('fades as the ship climbs, and space is back above it', () => {
    expect(airDensity(50, 100)).toBeLessThan(1);
    expect(airDensity(50, 100)).toBeGreaterThan(0);
    expect(airDensity(100, 100)).toBe(0);
    expect(airDensity(500, 100)).toBe(0);
  });

  it('survives nonsense: no air at all', () => {
    expect(airDensity(Number.NaN, 100)).toBe(0);
    expect(airDensity(10, 0)).toBe(0);
  });

  it('only home has air: the worlds of the alien system are dead', () => {
    expect(Object.keys(ATMOSPHERES)).toEqual(['hogar']);
    expect(ATMOSPHERES.hogar?.height).toBeGreaterThan(0);
  });
});
