import { describe, expect, it } from 'vitest';
import { BALANCE, isBalanced, leanOf, torqueOf } from '../../src/puzzles/balance';

describe('the balance of the Counterweight (Archimedes and the lever)', () => {
  it('hangs the old motor at two measures from the axis with six measures of weight', () => {
    expect(BALANCE.model).toEqual({ weight: 6, distance: 2 });
    expect(BALANCE.notches).toBe(6);
    expect(BALANCE.weights).toEqual([1, 2, 3]);
  });

  it('multiplies each weight by its distance from the axis', () => {
    expect(torqueOf({ 4: 3 })).toBe(12);
    expect(torqueOf({ 6: 2 })).toBe(12);
    expect(torqueOf({ 2: 3, 3: 2 })).toBe(12);
    expect(torqueOf({})).toBe(0);
  });

  it('balances only when the two sides are equal', () => {
    expect(isBalanced({ 4: 3 })).toBe(true);
    expect(isBalanced({ 2: 3, 3: 2 })).toBe(true);
    expect(isBalanced({ 6: 3 })).toBe(false);
    expect(isBalanced({ 1: 1 })).toBe(false);
    expect(isBalanced({})).toBe(false);
  });

  it('leans toward the heavier side, and sits level when they are equal', () => {
    expect(leanOf({})).toBeLessThan(0);
    expect(leanOf({ 4: 3 })).toBe(0);
    expect(leanOf({ 6: 3 })).toBeGreaterThan(0);
    for (const placement of [{}, { 6: 3 }, { 1: 1 }]) {
      expect(Math.abs(leanOf(placement))).toBeLessThanOrEqual(1);
    }
  });

  it('does not depend on the gravity of the place: the same balance in the Workshop', () => {
    expect(isBalanced({ 4: 3 }, 0.6)).toBe(true);
    expect(isBalanced({ 4: 3 }, 1.5)).toBe(true);
    expect(isBalanced({ 5: 3 }, 0.6)).toBe(false);
  });
});
