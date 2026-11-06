import { describe, expect, it } from 'vitest';
import { AWAKENING, awakeningPose } from '../../src/game/awakening';

describe('the first awakening on Umbral', () => {
  it('starts lying down, looking at the sky', () => {
    const pose = awakeningPose(0);

    expect(pose.drop).toBeCloseTo(AWAKENING.eyeDrop);
    expect(pose.pitch).toBeCloseTo(AWAKENING.lookUp);
    expect(pose.done).toBe(false);
  });

  it('stays lying down for a moment', () => {
    expect(awakeningPose(AWAKENING.lie - 0.1).pitch).toBeCloseTo(AWAKENING.lookUp);
  });

  it('gets up little by little', () => {
    const halfway = awakeningPose(AWAKENING.lie + AWAKENING.rise / 2);

    expect(halfway.drop).toBeGreaterThan(0);
    expect(halfway.drop).toBeLessThan(AWAKENING.eyeDrop);
    expect(halfway.done).toBe(false);
  });

  it('ends standing, looking ahead', () => {
    const pose = awakeningPose(AWAKENING.lie + AWAKENING.rise);

    expect(pose.drop).toBeCloseTo(0);
    expect(pose.pitch).toBeCloseTo(0);
    expect(pose.done).toBe(true);
  });
});
