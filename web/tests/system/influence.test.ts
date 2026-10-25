import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MIN_RATE } from '../../src/core/loopClock';
import {
  absorptionFrontRadius,
  clockRateAt,
  isEngulfed,
  overallAbsorptionWindow,
  pickReference,
  type ClockBody,
  type Sphere,
} from '../../src/system/influence';

const sphere = (world: string, x: number, radius: number): Sphere => ({
  world,
  center: new Vector3(x, 0, 0),
  radius,
});

const at = (x: number): Vector3 => new Vector3(x, 0, 0);

describe('pickReference', () => {
  const a = sphere('a', 0, 100);
  const b = sphere('b', 150, 100);

  it('picks the world whose sphere you are inside', () => {
    expect(pickReference(at(20), [a, b])).toBe('a');
  });

  it('picks nothing in open space', () => {
    expect(pickReference(at(-500), [a, b])).toBeUndefined();
  });

  it('picks the nearest one, in proportion to its sphere, where the spheres overlap', () => {
    expect(pickReference(at(110), [a, b])).toBe('b');
  });

  it('stays with the current world a little beyond its sphere (no flicker at the edge)', () => {
    expect(pickReference(at(-105), [a, b], 'a')).toBe('a');
    expect(pickReference(at(-105), [a, b])).toBeUndefined();
    expect(pickReference(at(-130), [a, b], 'a')).toBeUndefined();
  });

  it('does not swap between overlapping spheres until the other is clearly nearer', () => {
    // En x = 85 la ratio de `a` es 0,85 y la de `b` 0,65: a la vista de `b`, pero no lo bastante.
    expect(pickReference(at(85), [a, b], 'a')).toBe('a');
    expect(pickReference(at(85), [a, b])).toBe('b');
    expect(pickReference(at(120), [a, b], 'a')).toBe('b');
  });

  it('ignores a current world that does not exist', () => {
    expect(pickReference(at(20), [a, b], 'nowhere')).toBe('a');
  });
});

describe('clockRateAt', () => {
  const slow: ClockBody = { center: new Vector3(0, 0, 0), radius: 25, rate: 0.2 };
  const fast: ClockBody = { center: new Vector3(1000, 0, 0), radius: 30, rate: 1.15 };

  it('is the rate of the world on its surface', () => {
    expect(clockRateAt(at(25), [slow, fast])).toBeCloseTo(0.2);
    expect(clockRateAt(at(1030), [slow, fast])).toBeCloseTo(1.15);
  });

  it('is 1 far from every mass', () => {
    expect(clockRateAt(at(500), [slow, fast])).toBe(1);
  });

  it('blends gradually while approaching a mass', () => {
    // A 1,5 radios de la superficie (mitad del alcance de 3): peso 0,5.
    expect(clockRateAt(at(25 + 37.5), [slow, fast])).toBeCloseTo(1 + 0.5 * (0.2 - 1));
  });

  it('is monotonic on the way down', () => {
    const rates = [200, 150, 100, 60, 30, 25].map((x) => clockRateAt(at(x), [slow]));

    for (let i = 1; i < rates.length; i++) {
      expect(rates[i] ?? 1).toBeLessThanOrEqual(rates[i - 1] ?? 0);
    }
  });

  it('never drops below the minimum rate', () => {
    const extreme: ClockBody = { center: new Vector3(), radius: 10, rate: 0 };

    expect(clockRateAt(at(10), [extreme])).toBe(MIN_RATE);
  });
});

describe('absorption front in open space', () => {
  it('takes the whole absorption of the chronology as its window', () => {
    expect(
      overallAbsorptionWindow({
        cicatriz: [810, 825],
        umbral: [860, 885],
        observatorio: [885, 900],
      }),
    ).toEqual([810, 900]);
    expect(overallAbsorptionWindow({})).toBeUndefined();
  });

  it('does not exist before the window and covers everything after it', () => {
    expect(absorptionFrontRadius([810, 900], 500, 3800)).toBe(0);
    expect(absorptionFrontRadius([810, 900], 810, 3800)).toBe(0);
    expect(absorptionFrontRadius([810, 900], 855, 3800)).toBeCloseTo(1900);
    expect(absorptionFrontRadius([810, 900], 900, 3800)).toBe(3800);
    expect(absorptionFrontRadius([810, 900], 950, 3800)).toBe(3800);
  });

  it('copes with an instant window', () => {
    expect(absorptionFrontRadius([100, 100], 99, 50)).toBe(0);
    expect(absorptionFrontRadius([100, 100], 100, 50)).toBe(50);
  });

  it('engulfs what is inside the front and nothing when there is no front yet', () => {
    const origin = new Vector3(100, 0, 0);

    expect(isEngulfed(at(150), origin, 60)).toBe(true);
    expect(isEngulfed(at(300), origin, 60)).toBe(false);
    expect(isEngulfed(origin, origin, 0)).toBe(false);
  });
});
