// Los controles táctiles se ajustan a la pantalla: tamaño de los botones según el alto y el ancho, y rótulos solo
// con sitio de sobra.
import { describe, expect, it } from 'vitest';
import {
  applyTouchFit,
  MAX_FIT,
  MIN_FIT,
  needsIconsOnly,
  touchFit,
} from '../../../src/ui/touch/touchFit';

describe('touchFit', () => {
  it('is 1 on a normal landscape phone and never leaves its bounds', () => {
    expect(touchFit(844, 430)).toBeCloseTo(1);
    expect(touchFit(100, 100)).toBe(MIN_FIT);
    expect(touchFit(3000, 3000)).toBe(MAX_FIT);
  });

  it('shrinks the buttons on a short screen', () => {
    expect(touchFit(844, 390)).toBeLessThan(1);
    expect(touchFit(740, 360)).toBeLessThan(touchFit(844, 390));
    expect(touchFit(568, 320)).toBeLessThan(touchFit(740, 360));
  });

  it('follows the narrower side: a tall but narrow window also shrinks', () => {
    expect(touchFit(500, 800)).toBeLessThan(touchFit(900, 800));
  });

  it('grows a little on a tablet', () => {
    expect(touchFit(1024, 768)).toBeGreaterThan(1);
  });

  it('ignores a screen that has not been measured', () => {
    expect(touchFit(0, 0)).toBe(1);
    expect(touchFit(Number.NaN, 400)).toBe(1);
  });
});

describe('needsIconsOnly', () => {
  it('keeps the labels where there is room', () => {
    expect(needsIconsOnly(844, 390)).toBe(false);
    expect(needsIconsOnly(740, 360)).toBe(false);
  });

  it('drops them on a narrow or very short screen', () => {
    expect(needsIconsOnly(568, 320)).toBe(true);
    expect(needsIconsOnly(600, 390)).toBe(true);
    expect(needsIconsOnly(844, 300)).toBe(true);
  });
});

describe('applyTouchFit', () => {
  it('writes the fit as a CSS variable', () => {
    const written = new Map<string, string>();
    applyTouchFit({ setProperty: (name, value) => written.set(name, value) }, 740, 360);

    expect(Number(written.get('--touch-fit'))).toBeCloseTo(touchFit(740, 360), 3);
  });
});
