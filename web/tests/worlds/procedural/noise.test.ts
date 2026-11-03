import { describe, expect, it } from 'vitest';
import { createNoise, fbm, ridged, seededRandom } from '../../../src/worlds/procedural/noise';

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed, inside [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const values = Array.from({ length: 200 }, () => a());

    expect(values).toEqual(Array.from({ length: 200 }, () => b()));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('gives a different sequence for another seed', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});

describe('createNoise', () => {
  const samples = Array.from({ length: 2000 }, (_, i): [number, number, number] => [
    Math.sin(i * 1.7) * 3,
    Math.cos(i * 0.9) * 3,
    i * 0.013,
  ]);

  it('is deterministic and stays roughly within [-1, 1]', () => {
    const a = createNoise(7);
    const b = createNoise(7);
    const values = samples.map(([x, y, z]) => a(x, y, z));

    expect(values).toEqual(samples.map(([x, y, z]) => b(x, y, z)));
    expect(Math.max(...values.map(Math.abs))).toBeLessThan(1.1);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(1); // no es plano
  });

  it('changes with the seed and varies smoothly', () => {
    const a = createNoise(7);
    const b = createNoise(8);

    expect(a(0.3, 0.7, 1.1)).not.toBe(b(0.3, 0.7, 1.1));
    expect(Math.abs(a(0.3, 0.7, 1.1) - a(0.301, 0.7, 1.1))).toBeLessThan(0.05);
  });

  it('is zero on the lattice corners', () => {
    expect(createNoise(3)(0, 0, 0)).toBe(0);
  });
});

describe('fbm and ridged', () => {
  const noise = createNoise(5);

  it('keep fbm normalised and ridged inside [0, 1]', () => {
    for (let i = 0; i < 300; i++) {
      const [x, y, z] = [i * 0.07, i * 0.11, i * 0.05];
      expect(Math.abs(fbm(noise, x, y, z, 4))).toBeLessThan(1.1);
      const r = ridged(noise, x, y, z);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
