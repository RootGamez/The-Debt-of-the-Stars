import { describe, expect, it } from 'vitest';
import {
  ORRERY,
  alignedAngles,
  isOrreryRight,
  railOfSphere,
  revolutions,
} from '../../src/puzzles/orrery';

const right = {
  1: 'taller',
  2: 'cicatriz',
  3: 'archivo',
  4: 'umbral',
  6: 'observatorio',
} as const;

describe('the orrery of the Great Hall (Kepler and the pace of the orbits)', () => {
  it('has six rails and five spheres, and the fifth rail has none', () => {
    expect(ORRERY.rails).toBe(6);
    expect(ORRERY.spheres).toEqual(['taller', 'cicatriz', 'archivo', 'umbral', 'observatorio']);
    expect(ORRERY.emptyRail).toBe(5);
  });

  it('puts every sphere on the rail of its world, counting from the Ember', () => {
    expect(railOfSphere('taller')).toBe(1);
    expect(railOfSphere('cicatriz')).toBe(2);
    expect(railOfSphere('archivo')).toBe(3);
    expect(railOfSphere('umbral')).toBe(4);
    expect(railOfSphere('observatorio')).toBe(6);
  });

  it('is right only with every sphere on its rail and the fifth rail empty', () => {
    expect(isOrreryRight(right)).toBe(true);
    expect(isOrreryRight({ ...right, 6: undefined })).toBe(false);
    expect(isOrreryRight({ ...right, 5: 'observatorio', 6: undefined })).toBe(false);
    expect(isOrreryRight({ ...right, 3: 'umbral', 4: 'archivo' })).toBe(false);
    expect(isOrreryRight({})).toBe(false);
  });

  it('has the outer worlds go round slower: more revolutions for the inner rails', () => {
    const turns = [1, 2, 3, 4, 5, 6].map(revolutions);

    for (let i = 1; i < turns.length; i++) {
      expect(turns[i - 1] ?? 0).toBeGreaterThan(turns[i] ?? 0);
    }
    expect(Number.isInteger(turns[0])).toBe(true);
  });

  it('brings every sphere to the same line when the crank stops, and spreads them before', () => {
    const start = alignedAngles(0, [10, 80, 150, 220, 290, 0]);
    const end = alignedAngles(1, [10, 80, 150, 220, 290, 0]);

    expect(start).toEqual([10, 80, 150, 220, 290, 0]);
    for (const angle of end) expect(angle % 360).toBeCloseTo(0, 6);
  });
});
