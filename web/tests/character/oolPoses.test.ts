import { describe, expect, it } from 'vitest';
import {
  aimHead,
  blendPose,
  bookLoweredPose,
  breathe,
  clampPose,
  lookUpPose,
  nod,
  OOL_LIMITS,
  pointUpPose,
  reachPose,
  readingPose,
  REST_POSE,
} from '../../src/character/oolPoses';

describe('the poses of an articulated Ool (F4, la escena del nido)', () => {
  it('blends from one pose to the other and stays inside the ends', () => {
    const up = lookUpPose();
    expect(blendPose(REST_POSE, up, 0)).toEqual(REST_POSE);
    expect(blendPose(REST_POSE, up, 1)).toEqual(up);
    expect(blendPose(REST_POSE, up, 2)).toEqual(up);
    const half = blendPose(REST_POSE, up, 0.5);
    expect(half.headPitch).toBeCloseTo(up.headPitch / 2, 6);
    expect(half.armL.out).toBeCloseTo(up.armL.out / 2, 6);
  });

  it('looks at the sky with the head raised and the body leaning back a little', () => {
    const up = lookUpPose();
    expect(up.headPitch).toBeGreaterThan(0.6);
    expect(up.lean).toBeLessThan(0);
    const still = lookUpPose(0);
    expect(Math.abs(still.headPitch) + Math.abs(still.lean) + Math.abs(still.armL.out)).toBe(0);
  });

  it('points at the sky with the right hand, brighter', () => {
    const point = pointUpPose();
    expect(point.armR.raise).toBeGreaterThan(2);
    expect(point.armL.raise).toBeLessThan(0.5);
    expect(point.glow).toBeGreaterThan(1);
  });

  it('holds out both hands to take something and reads with the head down', () => {
    const reach = reachPose();
    expect(reach.armL.raise).toBeCloseTo(reach.armR.raise, 6);
    expect(reach.armL.raise).toBeGreaterThan(0.8);
    const reading = readingPose();
    expect(reading.headPitch).toBeLessThan(-0.3);
    expect(reading.armL.raise).toBeGreaterThan(0.6);
    expect(bookLoweredPose().armR.raise).toBeLessThan(reading.armR.raise);
  });

  it('keeps every named pose inside what the body can do', () => {
    for (const pose of [
      lookUpPose(),
      pointUpPose(),
      reachPose(),
      readingPose(),
      bookLoweredPose(),
    ]) {
      expect(clampPose(pose)).toEqual(pose);
    }
    const wild = clampPose({
      ...REST_POSE,
      headPitch: 5,
      lean: Number.NaN,
      armR: { raise: 9, out: -9 },
    });
    expect(wild.headPitch).toBe(OOL_LIMITS.headPitch[1]);
    expect(wild.lean).toBe(0);
    expect(wild.armR).toEqual({ raise: OOL_LIMITS.raise[1], out: OOL_LIMITS.out[0] });
  });

  it('nods twice in a second, only downwards, and is still before and after', () => {
    expect(nod(-0.1)).toBe(0);
    expect(nod(1.2)).toBe(0);
    expect(nod(0.25)).toBeLessThan(-0.15);
    expect(nod(0.75)).toBeLessThan(-0.15);
    for (let s = 0; s <= 1; s += 0.05) expect(nod(s)).toBeLessThanOrEqual(0);
  });

  it('breathes softly, out of step from one Ool to the next', () => {
    for (let t = 0; t < 10; t += 0.3) {
      expect(Math.abs(breathe(t).lean)).toBeLessThan(0.02);
      expect(Math.abs(breathe(t).glow)).toBeLessThan(0.1);
    }
    expect(breathe(1, 0).lean).not.toBeCloseTo(breathe(1, 1).lean, 3);
  });

  it('aims the head: ahead is still, to its left is a positive turn, above is a positive pitch', () => {
    const ahead = aimHead([0, 1, 0], [0, 1, -5]);
    expect(Math.abs(ahead.yaw) + Math.abs(ahead.pitch)).toBe(0);
    expect(aimHead([0, 1, 0], [-5, 1, 0]).yaw).toBeCloseTo(OOL_LIMITS.headYaw[1], 6);
    expect(aimHead([0, 1, 0], [0.5, 1, -5]).yaw).toBeLessThan(0);
    expect(aimHead([0, 1, 0], [0, 6, -5]).pitch).toBeCloseTo(Math.PI / 4, 6);
    expect(aimHead([0, 1, 0], [0, 100, -1]).pitch).toBe(OOL_LIMITS.headPitch[1]);
    expect(aimHead([0, 1, 0], [0, 1, 0])).toEqual({ yaw: 0, pitch: 0 });
  });
});
