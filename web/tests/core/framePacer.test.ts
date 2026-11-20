import { describe, expect, it } from 'vitest';
import { createFramePacer, neededDivisor, type FramePacer } from '../../src/core/framePacer';

const OPTIONS = { budget: 0.75, minFps: 55 };

/** Simula `seconds` de refrescos a `hz`; en cada uno que toca dibujar, el trabajo tarda `work` ms. */
function drive(pacer: FramePacer, hz: number, seconds: number, work: number, start = 0): number[] {
  const interval = 1000 / hz;
  const runs: number[] = [];
  const total = Math.round(seconds * hz);
  for (let i = 0; i < total; i++) {
    const t = start + i * interval;
    if (pacer.shouldRun(t)) {
      runs.push(i);
      pacer.recordWork(work);
    }
  }
  return runs;
}

describe('neededDivisor', () => {
  it('dibuja en cada refresco si el trabajo cabe con holgura', () => {
    expect(neededDivisor(4, 1000 / 144, OPTIONS)).toBe(1);
  });

  it('en 144 Hz pasa a uno de cada dos si el trabajo casi llena el refresco', () => {
    expect(neededDivisor(6.5, 1000 / 144, OPTIONS)).toBe(2);
  });

  it('en 60 Hz nunca baja a 30', () => {
    expect(neededDivisor(15, 1000 / 60, OPTIONS)).toBe(1);
  });

  it('en 240 Hz puede bajar hasta 60', () => {
    expect(neededDivisor(11, 1000 / 240, OPTIONS)).toBe(4);
  });
});

describe('createFramePacer', () => {
  it('con trabajo ligero dibuja en todos los refrescos', () => {
    const pacer = createFramePacer();
    const runs = drive(pacer, 144, 3, 3);
    expect(pacer.divisor).toBe(1);
    expect(runs.length).toBe(432);
  });

  it('con trabajo pesado en 144 Hz dibuja a 72 y con ritmo regular', () => {
    const pacer = createFramePacer();
    drive(pacer, 144, 2, 6.5);
    expect(pacer.divisor).toBe(2);
    expect(pacer.intervalMs).toBeCloseTo(1000 / 144, 1);
    const runs = drive(pacer, 144, 1, 6.5, 2000);
    const gaps = runs.slice(1).map((r, i) => r - (runs[i] as number));
    expect(new Set(gaps)).toEqual(new Set([2]));
  });

  it('vuelve a todos los refrescos cuando el trabajo baja, pero no por poco', () => {
    const pacer = createFramePacer();
    drive(pacer, 144, 2, 6.5);
    drive(pacer, 144, 2, 4.5, 2000); // cabe con 0,75 pero no con 0,55: se queda
    expect(pacer.divisor).toBe(2);
    drive(pacer, 144, 2, 3, 4000);
    expect(pacer.divisor).toBe(1);
  });

  it('en 60 Hz no divide aunque el trabajo sea pesado', () => {
    const pacer = createFramePacer();
    drive(pacer, 60, 4, 16);
    expect(pacer.divisor).toBe(1);
  });

  it('con un divisor fijo no se adapta', () => {
    const pacer = createFramePacer({ fixedDivisor: 2 });
    const runs = drive(pacer, 144, 2, 1);
    expect(pacer.divisor).toBe(2);
    expect(runs.length).toBeLessThan(150);
  });

  it('un parón no cuenta como refresco', () => {
    const pacer = createFramePacer();
    drive(pacer, 144, 1, 3);
    pacer.shouldRun(5000);
    expect(pacer.intervalMs).toBeCloseTo(1000 / 144, 1);
  });
});
