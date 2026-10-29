import { describe, expect, it } from 'vitest';
import { sightMarks } from '../../src/ui/sightMarks';

describe('the marks of the graduated sight', () => {
  // Campo de visión vertical de 70° en una pantalla de 700 px de alto.
  const marks = sightMarks(70, 700);

  it('puts a mark every 2 degrees and a numbered ring every 10', () => {
    expect(marks.slice(0, 5).map((m) => m.degrees)).toEqual([2, 4, 6, 8, 10]);
    expect(marks.filter((m) => m.major).map((m) => m.degrees)).toEqual([10, 20, 30]);
  });

  it('measures angles as the camera projects them: half the field reaches the top edge', () => {
    const edge = sightMarks(70, 700, 35).at(-1);

    expect(edge?.degrees).toBe(34);
    expect(sightMarks(70, 700, 36).find((m) => m.degrees === 34)?.radius).toBeLessThan(350);
    // tan(10°) / tan(35°) × 350 px
    expect(marks.find((m) => m.degrees === 10)?.radius).toBeCloseTo(
      (350 * Math.tan((10 * Math.PI) / 180)) / Math.tan((35 * Math.PI) / 180),
      6,
    );
  });

  it('grows the radius with the angle', () => {
    const radii = marks.map((m) => m.radius);

    expect([...radii].sort((a, b) => a - b)).toEqual(radii);
  });

  it('spreads further apart with a narrower field of view (zooming in)', () => {
    const wide = sightMarks(70, 700).find((m) => m.degrees === 10)?.radius ?? 0;
    const narrow = sightMarks(30, 700).find((m) => m.degrees === 10)?.radius ?? 0;

    expect(narrow).toBeGreaterThan(wide);
  });

  it('returns nothing for a broken view', () => {
    expect(sightMarks(0, 700)).toEqual([]);
    expect(sightMarks(70, 0)).toEqual([]);
    expect(sightMarks(Number.NaN, 700)).toEqual([]);
  });
});
