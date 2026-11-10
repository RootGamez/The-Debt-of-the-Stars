import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { stableShadowAim, sunShadowFocus } from '../../src/render/sunShadowFocus';

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

describe('stableShadowAim', () => {
  const star = new Vector3(0, 0, 0);
  const SIZE = 2048;

  it('never narrows the angle and only widens it a little', () => {
    for (const fov of [0.5, 1.84, 3.7, 12]) {
      const aim = stableShadowAim(star, new Vector3(2000, 10, 5), fov, SIZE);
      expect(aim.fovDegrees).toBeGreaterThanOrEqual(fov);
      expect(aim.fovDegrees).toBeLessThan(fov * 1.041);
    }
  });

  it('keeps the same angle for small changes of distance', () => {
    const a = stableShadowAim(
      star,
      new Vector3(2000, 0, 0),
      2 * Math.asin(90 / 2000) * (180 / Math.PI),
      SIZE,
    );
    const b = stableShadowAim(
      star,
      new Vector3(2010, 0, 0),
      2 * Math.asin(90 / 2010) * (180 / Math.PI),
      SIZE,
    );
    expect(b.fovDegrees).toBe(a.fovDegrees);
  });

  it('points within one texel of the focus', () => {
    const focus = new Vector3(1700, 230, -900);
    const aim = stableShadowAim(star, focus, 3, SIZE);
    const texel = ((aim.fovDegrees / 180) * Math.PI) / SIZE;
    expect(aim.direction.length()).toBeCloseTo(1, 9);
    expect(aim.direction.angleTo(focus.clone().normalize())).toBeLessThan(texel);
  });

  it('does not move while the focus moves less than a texel, and moves by whole steps after', () => {
    const base = new Vector3(2000, 37, 410);
    const first = stableShadowAim(star, base, 3, SIZE);
    const texelMeters = (((first.fovDegrees / 180) * Math.PI) / SIZE) * base.length();
    let changes = 0;
    let previous = first.direction;
    for (let i = 1; i <= 40; i++) {
      const aim = stableShadowAim(
        star,
        base.clone().add(new Vector3(0, 0, i * texelMeters * 0.1)),
        3,
        SIZE,
      );
      if (!aim.direction.equals(previous)) changes++;
      previous = aim.direction;
    }
    // Cuatro texeles de recorrido: unos cuatro saltos, no cuarenta.
    expect(changes).toBeGreaterThanOrEqual(3);
    expect(changes).toBeLessThanOrEqual(5);
  });

  it('copes with a focus on the star', () => {
    const aim = stableShadowAim(star, star.clone(), 3, SIZE);
    expect(aim.direction.length()).toBeCloseTo(1, 9);
  });
});
