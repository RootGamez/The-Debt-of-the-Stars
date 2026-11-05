import { describe, expect, it } from 'vitest';
import {
  HATCH_CLOSE_SECONDS,
  HATCH_OPEN_SECONDS,
  hatchPose,
  hatchReady,
  stepHatch,
} from '../../src/ship/hatch';

function run(open: number, landed: boolean, seconds: number): number {
  let value = open;
  for (let i = 0; i < Math.round(seconds * 60); i++) value = stepHatch(value, landed, 1 / 60);
  return value;
}

describe('the floor hatch and its ladder', () => {
  it('opens and lowers the ladder only while the ship is landed', () => {
    expect(run(0, true, HATCH_OPEN_SECONDS + 0.1)).toBe(1);
    expect(run(0, false, 5)).toBe(0);
  });

  it('takes a moment: half way it is not ready to walk', () => {
    const half = run(0, true, HATCH_OPEN_SECONDS / 2);

    expect(half).toBeGreaterThan(0.3);
    expect(hatchReady(half)).toBe(false);
    expect(hatchReady(1)).toBe(true);
  });

  it('pulls the ladder in and closes when the ship takes off', () => {
    expect(run(1, false, HATCH_CLOSE_SECONDS + 0.05)).toBe(0);
  });

  it('opens the door first and lowers the ladder after it (and the other way round to close)', () => {
    expect(hatchPose(0)).toEqual({ door: 0, ladder: 0 });
    expect(hatchPose(0.35).ladder).toBe(0);
    expect(hatchPose(0.35).door).toBeGreaterThan(0.8);
    expect(hatchPose(0.7).door).toBe(1);
    expect(hatchPose(0.7).ladder).toBeGreaterThan(0.2);
    expect(hatchPose(1)).toEqual({ door: 1, ladder: 1 });
  });

  it('survives absurd values', () => {
    expect(stepHatch(Number.NaN, true, 1 / 60)).toBeGreaterThan(0);
    expect(stepHatch(7, false, 0)).toBe(1);
    expect(stepHatch(0.5, true, -1)).toBe(0.5);
  });
});
