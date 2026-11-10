import { describe, expect, it } from 'vitest';
import { PLATE, figureOf, isSymbol, toggleClamp } from '../../src/puzzles/chladni';

describe('the singing plate (Chladni and the figures of the sand)', () => {
  it('has six holes on the edge and three clamps, and the symbol wants one set of them', () => {
    expect(PLATE.holes).toBe(6);
    expect(PLATE.clamps).toBe(3);
    expect(PLATE.symbol).toEqual([1, 3, 5]);
  });

  it('puts a clamp in a free hole and takes it out of an occupied one', () => {
    expect(toggleClamp([], 2)).toEqual([2]);
    expect(toggleClamp([2], 4)).toEqual([2, 4]);
    expect(toggleClamp([2, 4], 2)).toEqual([4]);
  });

  it('keeps only three clamps: a fourth is not put in', () => {
    expect(toggleClamp([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });

  it('refuses a hole that does not exist', () => {
    expect(toggleClamp([1], 0)).toEqual([1]);
    expect(toggleClamp([1], 7)).toEqual([1]);
  });

  it('draws the whole symbol only with the clamps at the holes of the symbol', () => {
    expect(isSymbol([1, 3, 5])).toBe(true);
    expect(isSymbol([5, 1, 3])).toBe(true);
    expect(isSymbol([1, 3])).toBe(false);
    expect(isSymbol([2, 4, 6])).toBe(false);
  });

  it('gives a figure that gets closer to the symbol with each clamp in its place', () => {
    expect(figureOf([]).rings).toBe(0);
    expect(figureOf([1]).rings).toBe(1);
    expect(figureOf([1, 2]).rings).toBe(1);
    expect(figureOf([1, 3, 5]).rings).toBe(3);
    expect(figureOf([1, 3, 5]).symbol).toBe(true);
    expect(figureOf([2, 4, 6]).symbol).toBe(false);
  });

  it('draws a spoke of sand through every clamp', () => {
    expect(figureOf([2, 6]).spokes).toEqual([2, 6]);
    expect(figureOf([]).spokes).toEqual([]);
  });
});
