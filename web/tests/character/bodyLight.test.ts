// La luz del cuerpo del explorador: se enciende y se apaga con suavidad, late un poco como algo vivo y no
// cambia el estado que recibe.
import { describe, expect, it } from 'vitest';
import {
  BODY_LIGHT,
  bodyLightFlash,
  bodyLightGlow,
  bodyLightIntensity,
  createBodyLight,
  stepBodyLight,
  toggleBodyLight,
} from '../../src/character/bodyLight';

const run = (state = createBodyLight(), seconds: number, dt = 1 / 60) => {
  let current = state;
  for (let t = 0; t < seconds; t += dt) current = stepBodyLight(current, dt);
  return current;
};

describe('the body light of the explorer', () => {
  it('starts off and dark', () => {
    const light = createBodyLight();
    expect(light.on).toBe(false);
    expect(light.level).toBe(0);
    expect(bodyLightIntensity(light)).toBe(0);
  });

  it('toggles without changing the state it was given', () => {
    const off = createBodyLight();
    const on = toggleBodyLight(off);
    expect(on.on).toBe(true);
    expect(off.on).toBe(false);
    expect(toggleBodyLight(on).on).toBe(false);
  });

  it('fades in over a fraction of a second instead of popping', () => {
    const on = toggleBodyLight(createBodyLight());
    const first = stepBodyLight(on, 1 / 60);
    expect(first.level).toBeGreaterThan(0);
    expect(first.level).toBeLessThan(0.2);
    expect(run(on, 1).level).toBeGreaterThan(0.95);
  });

  it('fades out again when switched off', () => {
    const lit = run(toggleBodyLight(createBodyLight()), 1);
    const dimmed = run(toggleBodyLight(lit), 1);
    expect(dimmed.level).toBeLessThan(0.05);
  });

  it('shines around its full intensity and only breathes a little', () => {
    let light = run(toggleBodyLight(createBodyLight()), 2);
    let low = Infinity;
    let high = 0;
    for (let i = 0; i < 600; i++) {
      light = stepBodyLight(light, 1 / 60);
      const value = bodyLightIntensity(light);
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    expect(low).toBeGreaterThan(BODY_LIGHT.intensity * 0.9);
    expect(high).toBeLessThan(BODY_LIGHT.intensity * 1.1);
    expect(high - low).toBeGreaterThan(0);
  });

  it('is sky blue and reaches far enough to see a room', () => {
    const blue = BODY_LIGHT.color & 0xff;
    const red = (BODY_LIGHT.color >> 16) & 0xff;
    expect(blue).toBeGreaterThan(red);
    expect(BODY_LIGHT.range).toBeGreaterThanOrEqual(10);
  });

  it('sparks briefly when switched on and then settles', () => {
    const on = toggleBodyLight(createBodyLight());
    expect(bodyLightFlash(on)).toBeCloseTo(BODY_LIGHT.flash);
    const lit = run(on, 0.4);
    expect(bodyLightIntensity(lit)).toBeGreaterThan(BODY_LIGHT.intensity * 1.05);
    expect(bodyLightFlash(run(on, 2))).toBeLessThan(0.01);
    expect(bodyLightFlash(toggleBodyLight(lit))).toBe(0);
  });

  it('does not spark again when switched off and keeps its glow in proportion', () => {
    const lit = run(toggleBodyLight(createBodyLight()), 2);
    const off = toggleBodyLight(lit);
    expect(off.since).toBe(lit.since);
    expect(bodyLightIntensity(lit)).toBeCloseTo(BODY_LIGHT.intensity * bodyLightGlow(lit));
  });

  it('ignores a pause or a negative step', () => {
    const on = toggleBodyLight(createBodyLight());
    expect(stepBodyLight(on, 0).level).toBe(0);
    expect(stepBodyLight(on, -1).level).toBe(0);
  });
});
