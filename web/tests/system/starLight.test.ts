import { describe, expect, it } from 'vitest';
import { relativeBrightness, sourceIntensity } from '../../src/system/starLight';

const star = { intensity: 2.6, falloff: 0.5 };

describe('relativeBrightness', () => {
  it('is 1 at the reference distance, brighter nearer and dimmer farther', () => {
    expect(relativeBrightness(star, 1900, 1900)).toBeCloseTo(1, 9);
    expect(relativeBrightness(star, 1900, 500)).toBeGreaterThan(1);
    expect(relativeBrightness(star, 1900, 2800)).toBeLessThan(1);
  });

  it('is the same everywhere when the light does not fall off', () => {
    expect(relativeBrightness({ ...star, falloff: 0 }, 1900, 300)).toBe(1);
  });

  it('follows the exponent: 1/sqrt(d) at 0.5', () => {
    expect(relativeBrightness(star, 1900, 475)).toBeCloseTo(2, 9);
  });
});

describe('sourceIntensity', () => {
  it('is what the light has to be so that, at the reference distance, it gives the intensity of the star', () => {
    // La PointLight de three da intensidad / d^caída: a la distancia de referencia debe quedar `intensity`.
    const source = sourceIntensity(star, 1900);

    expect(source / 1900 ** star.falloff).toBeCloseTo(star.intensity, 9);
  });

  it('is the plain intensity without falloff', () => {
    expect(sourceIntensity({ intensity: 2.2, falloff: 0 }, 1900)).toBe(2.2);
  });
});
