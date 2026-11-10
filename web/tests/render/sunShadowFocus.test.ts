import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { sunShadowFocus } from '../../src/render/sunShadowFocus';

describe('sunShadowFocus', () => {
  const star = new Vector3(0, 0, 0);

  it('looks through a narrower angle the farther the star is', () => {
    const near = sunShadowFocus(star, new Vector3(500, 0, 0), { radius: 90, reach: 700 });
    const far = sunShadowFocus(star, new Vector3(2800, 0, 0), { radius: 90, reach: 700 });

    expect(far.fovDegrees).toBeLessThan(near.fovDegrees);
    expect(far.fovDegrees).toBeCloseTo((2 * Math.asin(90 / 2800) * 180) / Math.PI, 5);
  });

  it('reaches from `reach` before the focus to a margin behind it', () => {
    const fit = sunShadowFocus(star, new Vector3(1900, 0, 0), { radius: 90, reach: 700 });

    expect(fit.distance).toBe(1900);
    expect(fit.near).toBe(1200);
    expect(fit.far).toBe(1900 + 90 * 1.5);
  });

  it('never starts before the star, whatever the reach', () => {
    const fit = sunShadowFocus(star, new Vector3(300, 0, 0), { radius: 90, reach: 5000 });

    expect(fit.near).toBe(1);
  });

  it('gives a harmless camera when the focus is inside the star', () => {
    const fit = sunShadowFocus(star, new Vector3(10, 0, 0), { radius: 90, reach: 700 });

    expect(fit.near).toBeLessThan(fit.far);
    expect(fit.fovDegrees).toBeLessThanOrEqual(60);
  });
});
