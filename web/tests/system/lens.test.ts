import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  apparentDirection,
  einsteinRadius,
  imageClarity,
  LENS_DEFLECTION,
  lensedAngle,
  trueDirection,
  triangulate,
} from '../../src/system/lens';

const DEG = Math.PI / 180;
const brasa = new Vector3(0, 0, -1);

describe('the apparent direction of the Nudo', () => {
  const truth = new Vector3(1, 0, -1).normalize(); // a 45° de la Brasa

  it('is turned a fixed angle toward the Brasa', () => {
    const seen = apparentDirection(truth, brasa);
    if (!seen) throw new Error('debería verse');

    expect(seen.angleTo(truth)).toBeCloseTo(LENS_DEFLECTION, 6);
    expect(seen.angleTo(brasa)).toBeCloseTo(45 * DEG - LENS_DEFLECTION, 6);
  });

  it('stays in the plane of the Brasa and the truth (never sideways)', () => {
    const seen = apparentDirection(truth, brasa);

    expect(seen?.y).toBeCloseTo(0, 9);
  });

  it('is undone by turning the same angle away from the Brasa', () => {
    const seen = apparentDirection(truth, brasa);
    if (!seen) throw new Error('debería verse');
    const back = trueDirection(seen, brasa);

    expect(back.angleTo(truth)).toBeCloseTo(0, 6);
  });

  it('is lost in the glare when the truth is too close to the Brasa', () => {
    const nearBrasa = new Vector3(Math.sin(10 * DEG), 0, -Math.cos(10 * DEG));

    expect(apparentDirection(nearBrasa, brasa)).toBeUndefined();
  });

  it('does not change the vectors it is given', () => {
    const t = truth.clone();
    const b = brasa.clone();

    apparentDirection(t, b);

    expect(t.toArray()).toEqual(truth.toArray());
    expect(b.toArray()).toEqual(brasa.toArray());
  });
});

describe('triangulating the Nudo from two places', () => {
  it('finds where two corrected sightings cross', () => {
    const nudo = new Vector3(400, 30, -900);
    const a = new Vector3(0, 0, 0);
    const b = new Vector3(600, 0, 200);

    const point = triangulate(a, nudo.clone().sub(a), b, nudo.clone().sub(b));

    expect(point?.distanceTo(nudo)).toBeLessThan(1e-6);
  });

  it('gives up with parallel sightings', () => {
    const d = new Vector3(0, 0, -1);

    expect(triangulate(new Vector3(), d, new Vector3(1, 0, 0), d)).toBeUndefined();
  });
});

describe('how the stars bend around the Nudo', () => {
  it('pushes a star outward, more the closer it is to the Nudo', () => {
    const e = 2 * DEG;

    expect(lensedAngle(10 * DEG, e)).toBeGreaterThan(10 * DEG);
    expect(lensedAngle(3 * DEG, e) - 3 * DEG).toBeGreaterThan(lensedAngle(10 * DEG, e) - 10 * DEG);
  });

  it('puts a star right behind the Nudo on its ring', () => {
    expect(lensedAngle(0, 2 * DEG)).toBeCloseTo(2 * DEG, 9);
  });

  it('leaves the stars alone without a lens', () => {
    expect(lensedAngle(7 * DEG, 0)).toBeCloseTo(7 * DEG, 12);
  });

  it('has a ring that only shows from close by', () => {
    expect(einsteinRadius(300)).toBeGreaterThan(einsteinRadius(2000));
    expect(einsteinRadius(2000)).toBeLessThan(1.5 * DEG);
    expect(einsteinRadius(300)).toBeGreaterThan(4 * DEG);
    expect(einsteinRadius(0)).toBeLessThan(30 * DEG);
  });
});

describe('how clearly the image of the Nudo shows', () => {
  const base = { aligned: false, inObservatory: false, distance: 2000, time: 0 };

  it('is sharp from the Observatorio during the alignment', () => {
    expect(imageClarity({ ...base, aligned: true, inObservatory: true })).toBe(1);
  });

  it('is only a faint flicker anywhere else', () => {
    for (const time of [0, 0.3, 1.7, 5]) {
      const clarity = imageClarity({ ...base, time });
      expect(clarity).toBeGreaterThan(0);
      expect(clarity).toBeLessThan(0.35);
    }
    expect(imageClarity({ ...base, aligned: true })).toBeLessThan(0.35);
  });

  it('is gone up close, where the shell itself can be seen', () => {
    expect(imageClarity({ ...base, aligned: true, inObservatory: true, distance: 300 })).toBe(0);
  });
});
