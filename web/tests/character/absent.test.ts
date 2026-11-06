import { describe, expect, it } from 'vitest';
import { ABSENT_HEIGHT, absentParts, absentProfile } from '../../src/character/absent';
import { absentGeometryCount } from '../../src/worlds/procedural/umbralAbsent';

describe('an Absent', () => {
  it('stands taller than 2.5 m, much taller than an Ool', () => {
    expect(ABSENT_HEIGHT).toBeGreaterThan(2.5);
    const top = Math.max(...absentParts().map((p) => p.position[2] + p.scale[2] / 2));
    expect(top).toBeGreaterThan(2.5);
    expect(top).toBeLessThanOrEqual(ABSENT_HEIGHT + 0.01);
  });

  it('has a faceless glass head, copper circuits and glowing patterns', () => {
    const materials = new Set(absentParts().map((p) => p.material));
    expect(materials).toEqual(new Set(['ceramic', 'glass', 'copper', 'glow']));
    const head = absentParts().filter((p) => p.material === 'glass');
    expect(head).toHaveLength(1);
    expect(head[0]?.position[2]).toBeGreaterThan(2.3);
  });

  it('is symmetric left to right', () => {
    const key = (x: number, z: number) => `${Math.abs(x).toFixed(3)}:${z.toFixed(3)}`;
    const left = absentParts()
      .filter((p) => p.position[0] < -1e-6)
      .map((p) => key(p.position[0], p.position[2]))
      .sort();
    const right = absentParts()
      .filter((p) => p.position[0] > 1e-6)
      .map((p) => key(p.position[0], p.position[2]))
      .sort();
    expect(left).toEqual(right);
  });

  it('keeps within the budget for characters (3k triangles)', () => {
    expect(absentGeometryCount()).toBeLessThanOrEqual(3000);
  });

  it('has a silhouette for the light rings, closed at the feet and the crown', () => {
    expect(absentProfile(-0.1)).toBe(0);
    expect(absentProfile(ABSENT_HEIGHT + 0.1)).toBe(0);
    expect(absentProfile(ABSENT_HEIGHT)).toBe(0);
    expect(absentProfile(1.9)).toBeGreaterThan(absentProfile(2.32)); // hombros más anchos que el cuello
    expect(absentProfile(2.5)).toBeGreaterThan(absentProfile(2.32)); // la cabeza, más que el cuello
  });
});
