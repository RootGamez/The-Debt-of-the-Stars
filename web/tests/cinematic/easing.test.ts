import { describe, expect, it } from 'vitest';
import { clamp01, ease, EASES, lerp, smoothstep } from '../../src/cinematic/easing';

describe('easing', () => {
  it('todas las curvas van de 0 a 1 y no se salen', () => {
    for (const kind of EASES) {
      expect(ease(kind, 0)).toBeCloseTo(0);
      expect(ease(kind, 1)).toBeCloseTo(1);
      for (let i = 0; i <= 20; i += 1) {
        const value = ease(kind, i / 20);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('fuera de [0, 1] se queda en los extremos', () => {
    expect(ease('inOut', -3)).toBe(0);
    expect(ease('smooth', 7)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it('las curvas suaves son simétricas y arrancan despacio', () => {
    expect(ease('inOut', 0.5)).toBeCloseTo(0.5);
    expect(ease('smooth', 0.5)).toBeCloseTo(0.5);
    expect(ease('smooth', 0.1)).toBeLessThan(ease('inOut', 0.1));
    expect(ease('in', 0.5)).toBeLessThan(0.5);
    expect(ease('out', 0.5)).toBeGreaterThan(0.5);
    expect(ease('linear', 0.3)).toBeCloseTo(0.3);
  });

  it('lerp y smoothstep', () => {
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5);
    expect(smoothstep(0, 10, -1)).toBe(0);
    expect(smoothstep(4, 4, 5)).toBe(1);
  });
});
