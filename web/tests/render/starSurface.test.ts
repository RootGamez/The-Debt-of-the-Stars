import { describe, expect, it } from 'vitest';
import { starSurfaceAt, starSurfaceNoise, prominenceSites } from '../../src/render/starSurface';
import { Vector3 } from 'three';

const noise = starSurfaceNoise(5);

function darkShare(spots: number): number {
  let dark = 0;
  const total = 4000;
  const p = new Vector3();
  for (let i = 0; i < total; i++) {
    // Reparto en espiral de Fibonacci: cubre la esfera por igual.
    const y = 1 - (2 * (i + 0.5)) / total;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.399963;
    p.set(Math.cos(a) * r, y, Math.sin(a) * r);
    if (starSurfaceAt(p, spots, noise).spot > 0.5) dark++;
  }
  return dark / total;
}

describe('starSurfaceAt', () => {
  it('is the same every time for the same star and point', () => {
    const p = new Vector3(0.3, 0.8, 0.5).normalize();

    expect(starSurfaceAt(p, 0.3, noise)).toEqual(starSurfaceAt(p, 0.3, starSurfaceNoise(5)));
  });

  it('has no spots at all when the star has none', () => {
    expect(darkShare(0)).toBe(0);
  });

  it('covers more of the star with spots the more spots it has', () => {
    const few = darkShare(0.15);
    const many = darkShare(0.45);

    expect(few).toBeGreaterThan(0);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeLessThan(0.7);
  });

  it('keeps the granulation within 0 to 1', () => {
    const p = new Vector3();
    for (let i = 0; i < 200; i++) {
      p.set(Math.sin(i), Math.cos(i * 1.3), Math.sin(i * 0.7)).normalize();
      const { granule } = starSurfaceAt(p, 0.3, noise);
      expect(granule).toBeGreaterThanOrEqual(0);
      expect(granule).toBeLessThanOrEqual(1);
    }
  });
});

describe('prominenceSites', () => {
  it('gives the requested number of unit directions, always the same', () => {
    const sites = prominenceSites(6, 3);

    expect(sites).toHaveLength(6);
    for (const s of sites) expect(s.length()).toBeCloseTo(1, 5);
    expect(prominenceSites(6, 3).map((s) => s.toArray())).toEqual(sites.map((s) => s.toArray()));
  });
});
