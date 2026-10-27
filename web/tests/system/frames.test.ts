import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  SYSTEM_FRAME,
  toLocalOrientation,
  toLocalPosition,
  toLocalVelocity,
  toSystemPosition,
  toSystemVelocity,
} from '../../src/system/frames';
import { bodyPose } from '../../src/system/orbits';
import type { BodySpec } from '../../src/system/systemData';

/** Un mundo que gira por su cuenta y orbita: el caso más general. */
const spinning: BodySpec = {
  world: 'taller',
  orbitRadius: 500,
  period: 180,
  phase: 0.8,
  spin: 60,
  spinPhase: 0.3,
};

const surfacePoint = new Vector3(30, 20, -10);

describe('the system frame', () => {
  it('leaves everything as it is', () => {
    const point = new Vector3(1, 2, 3);

    expect(toLocalPosition(SYSTEM_FRAME, point, new Vector3()).distanceTo(point)).toBe(0);
    expect(toSystemPosition(SYSTEM_FRAME, point, new Vector3()).distanceTo(point)).toBe(0);
  });
});

describe('positions', () => {
  it('goes to the body frame and back', () => {
    const pose = bodyPose(spinning, 42);
    const point = new Vector3(400, -30, 120);

    const local = toLocalPosition(pose, point, new Vector3());
    const back = toSystemPosition(pose, local, new Vector3());

    expect(back.distanceTo(point)).toBeLessThan(1e-9);
  });

  it('puts the center of the body at the origin of its frame', () => {
    const pose = bodyPose(spinning, 17);

    expect(toLocalPosition(pose, pose.position, new Vector3()).length()).toBeLessThan(1e-9);
  });

  it('keeps a point of the surface where it is, however the body turns and moves', () => {
    for (const t of [0, 10, 55, 140]) {
      const pose = bodyPose(spinning, t);
      const system = toSystemPosition(pose, surfacePoint, new Vector3());

      expect(toLocalPosition(pose, system, new Vector3()).distanceTo(surfacePoint)).toBeLessThan(
        1e-9,
      );
    }
  });
});

describe('velocities', () => {
  it('gives a surface point the velocity of the body plus the spin', () => {
    // Derivada numérica de la posición en el sistema de un punto fijo del mundo.
    const t = 25;
    const h = 1e-4;
    const at = (time: number): Vector3 =>
      toSystemPosition(bodyPose(spinning, time), surfacePoint, new Vector3());
    const numeric = at(t + h)
      .sub(at(t - h))
      .divideScalar(2 * h);

    const analytic = toSystemVelocity(
      bodyPose(spinning, t),
      surfacePoint,
      new Vector3(),
      new Vector3(),
    );

    expect(analytic.distanceTo(numeric)).toBeLessThan(1e-3);
  });

  it('sees as still whatever moves with the surface', () => {
    const pose = bodyPose(spinning, 90);
    const system = toSystemPosition(pose, surfacePoint, new Vector3());
    const moving = toSystemVelocity(pose, surfacePoint, new Vector3(), new Vector3());

    const local = toLocalVelocity(pose, system, moving, new Vector3());

    expect(local.length()).toBeLessThan(1e-9);
  });

  it('goes to the body frame and back', () => {
    const pose = bodyPose(spinning, 90);
    const local = new Vector3(5, -2, 9);
    const velocity = new Vector3(3, 7, -1);

    const system = toSystemPosition(pose, local, new Vector3());
    const inSystem = toSystemVelocity(pose, local, velocity, new Vector3());
    const back = toLocalVelocity(pose, system, inSystem, new Vector3());

    expect(back.distanceTo(velocity)).toBeLessThan(1e-9);
  });

  it('makes something that floats still in the system race past a spinning surface', () => {
    const pose = bodyPose({ ...spinning, period: 0, spin: 60 }, 0);
    const system = toSystemPosition(pose, new Vector3(50, 0, 0), new Vector3());

    const local = toLocalVelocity(pose, system, new Vector3(), new Vector3());

    expect(local.length()).toBeCloseTo(((2 * Math.PI) / 60) * 50, 6);
  });
});

describe('orientations', () => {
  it('removes the orientation of the body', () => {
    const pose = bodyPose(spinning, 33);

    const local = toLocalOrientation(pose, pose.orientation, new Quaternion());

    expect(local.angleTo(new Quaternion())).toBeLessThan(1e-6);
  });
});
