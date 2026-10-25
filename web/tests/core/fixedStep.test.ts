import { describe, expect, it } from 'vitest';
import { createFixedStep } from '../../src/core/fixedStep';

describe('createFixedStep', () => {
  it('runs one step per accumulated fixed interval', () => {
    const steps: number[] = [];
    const fixed = createFixedStep({ stepSeconds: 0.01, maxStepsPerFrame: 10 }, (dt) =>
      steps.push(dt),
    );

    fixed.advance(0.025);

    expect(steps).toEqual([0.01, 0.01]);
  });

  it('carries the remainder to the next frame', () => {
    let count = 0;
    const fixed = createFixedStep({ stepSeconds: 0.01, maxStepsPerFrame: 10 }, () => count++);

    fixed.advance(0.006);
    fixed.advance(0.006);

    expect(count).toBe(1);
  });

  it('reports how far it is into the next step for interpolation', () => {
    const fixed = createFixedStep({ stepSeconds: 0.01, maxStepsPerFrame: 10 }, () => undefined);

    const alpha = fixed.advance(0.0125);

    expect(alpha).toBeCloseTo(0.25);
  });

  it('caps the steps of a very slow frame to avoid the spiral of death', () => {
    let count = 0;
    const fixed = createFixedStep({ stepSeconds: 0.01, maxStepsPerFrame: 5 }, () => count++);

    fixed.advance(1);
    fixed.advance(0.01);

    expect(count).toBe(6); // 5 del fotograma lento (el resto se descarta) + 1
  });

  it('ignores negative or invalid frame times', () => {
    let count = 0;
    const fixed = createFixedStep({ stepSeconds: 0.01, maxStepsPerFrame: 5 }, () => count++);

    fixed.advance(-1);
    fixed.advance(Number.NaN);

    expect(count).toBe(0);
  });
});
