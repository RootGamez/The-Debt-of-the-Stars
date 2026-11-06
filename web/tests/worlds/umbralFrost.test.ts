import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FROST, frostAmount } from '../../src/worlds/procedural/umbralFrost';

const sun = new Vector3(0, 1, 0);

describe('the frozen night side of Umbral', () => {
  it('has no frost anywhere the star shines', () => {
    expect(frostAmount(new Vector3(0, 1, 0), sun)).toBe(0);
    expect(frostAmount(new Vector3(1, 0.05, 0).normalize(), sun)).toBe(0);
  });

  it('is fully frozen well past the terminator and on the far side', () => {
    expect(frostAmount(new Vector3(0, -1, 0), sun)).toBe(1);
    const past = new Vector3(Math.sqrt(1 - FROST.full ** 2), -FROST.full, 0);
    expect(frostAmount(past, sun)).toBeCloseTo(1);
  });

  it('frosts gradually just past the terminator', () => {
    const middle = (FROST.start + FROST.full) / 2;
    const d = new Vector3(Math.sqrt(1 - middle ** 2), -middle, 0);
    const amount = frostAmount(d, sun);
    expect(amount).toBeGreaterThan(0.2);
    expect(amount).toBeLessThan(0.8);
  });

  it('lets a wobble move the edge without leaving the 0–1 range', () => {
    const d = new Vector3(1, -FROST.start, 0).normalize();
    expect(frostAmount(d, sun, 0.1)).toBeGreaterThan(frostAmount(d, sun, -0.1));
    expect(frostAmount(d, sun, 5)).toBe(1);
    expect(frostAmount(d, sun, -5)).toBe(0);
  });
});
