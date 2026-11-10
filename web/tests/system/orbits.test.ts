import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bodyPose, createPose } from '../../src/system/orbits';
import type { BodySpec } from '../../src/system/systemData';

const spec = (patch: Partial<BodySpec> = {}): BodySpec => ({
  world: 'taller',
  orbitRadius: 500,
  period: 180,
  phase: 0,
  spin: 'locked',
  spinPhase: 0,
  hidden: false,
  ...patch,
});

describe('bodyPose of a fixed body', () => {
  const pole = spec({ fixedPosition: [0, 270, 0], orbitRadius: 270, period: 0, spin: 0 });

  it('stays where it was put, at rest, whatever the time', () => {
    for (const t of [0, 77, 900]) {
      const pose = bodyPose(pole, t);

      expect(pose.position.toArray()).toEqual([0, 270, 0]);
      expect(pose.velocity.length()).toBe(0);
    }
  });

  it('does not turn unless it has a spin', () => {
    expect(bodyPose(pole, 500).orientation.angleTo(bodyPose(pole, 0).orientation)).toBeCloseTo(0);
    expect(bodyPose(pole, 0).spinRate).toBe(0);
  });
});

describe('bodyPose', () => {
  it('starts on the orbit at the initial phase', () => {
    const pose = bodyPose(spec({ phase: 0 }), 0);

    expect(pose.position.x).toBeCloseTo(500);
    expect(pose.position.y).toBeCloseTo(0);
    expect(pose.position.z).toBeCloseTo(0);
  });

  it('keeps a constant distance from the star on a circular orbit', () => {
    for (const t of [0, 13, 90, 171, 400]) {
      expect(bodyPose(spec({ phase: 0.7 }), t).position.length()).toBeCloseTo(500);
    }
  });

  it('comes back to the same place after one period', () => {
    const a = bodyPose(spec(), 25).position.clone();
    const b = bodyPose(spec(), 25 + 180).position;

    expect(b.distanceTo(a)).toBeLessThan(1e-6);
  });

  it('turns a quarter of a lap in a quarter of the period', () => {
    const quarter = bodyPose(spec(), 45).position;

    expect(quarter.dot(new Vector3(500, 0, 0))).toBeCloseTo(0);
    expect(quarter.length()).toBeCloseTo(500);
  });

  it('gives a velocity equal to the derivative of the position', () => {
    const t = 33;
    const h = 1e-3;
    const before = bodyPose(spec({ phase: 0.4 }), t - h).position.clone();
    const after = bodyPose(spec({ phase: 0.4 }), t + h).position.clone();
    const numeric = after.sub(before).divideScalar(2 * h);

    expect(bodyPose(spec({ phase: 0.4 }), t).velocity.distanceTo(numeric)).toBeLessThan(1e-4);
  });

  it('moves at 2πr/T along the orbit', () => {
    const speed = bodyPose(spec(), 10).velocity.length();

    expect(speed).toBeCloseTo((2 * Math.PI * 500) / 180);
  });

  it('keeps a body with period 0 still (positions fixed, decision 1)', () => {
    const still = spec({ period: 0, phase: 1.2, spin: 0 });
    const a = bodyPose(still, 0);
    const b = bodyPose(still, 700);

    expect(b.position.distanceTo(a.position)).toBe(0);
    expect(b.velocity.length()).toBe(0);
    expect(b.spinRate).toBe(0);
    expect(b.orientation.angleTo(a.orientation)).toBeCloseTo(0);
  });

  it('keeps the same face to the star when the spin is locked', () => {
    const locked = spec({ phase: 0.3, spinPhase: 0.9 });
    const towardStar = (t: number): Vector3 => {
      const pose = bodyPose(locked, t);
      return pose.position
        .clone()
        .negate()
        .normalize()
        .applyQuaternion(pose.orientation.clone().invert());
    };
    const first = towardStar(0);

    for (const t of [20, 77, 150, 600]) expect(towardStar(t).distanceTo(first)).toBeLessThan(1e-9);
  });

  it('spins on its own with a numeric spin period (Taller: a day every three minutes)', () => {
    const own = spec({ period: 1000, spin: 180 });
    const a = bodyPose(own, 0).orientation;
    const quarter = bodyPose(own, 45).orientation;
    const full = bodyPose(own, 180).orientation;

    expect(a.angleTo(quarter)).toBeCloseTo(Math.PI / 2);
    expect(a.angleTo(full)).toBeCloseTo(0);
    expect(bodyPose(own, 0).spinRate).toBeCloseTo((2 * Math.PI) / 180);
  });

  it('reuses the target object', () => {
    const target = createPose();

    expect(bodyPose(spec(), 5, target)).toBe(target);
  });
});
