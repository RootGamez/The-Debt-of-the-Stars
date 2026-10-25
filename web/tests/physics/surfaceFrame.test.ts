import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  alignUp,
  forwardOf,
  lookAlong,
  rightOf,
  smoothingFactor,
  upOf,
  yaw,
} from '../../src/physics/surfaceFrame';

function expectVector(actual: Vector3, expected: Vector3, digits = 5): void {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
}

/** Camina hacia delante sobre una esfera, realineando el "arriba" en cada paso. */
function walkAround(radius: number, initialYaw: number, steps: number) {
  const body = yaw(new Quaternion(), initialYaw);
  const position = new Vector3(0, radius, 0);
  const startForward = forwardOf(body);
  const stepLength = (2 * Math.PI * radius) / steps;
  for (let i = 0; i < steps; i++) {
    position.addScaledVector(forwardOf(body), stepLength).setLength(radius);
    alignUp(body, position.clone().normalize(), 1);
  }
  return { body, position, startForward };
}

describe('surface frame basics', () => {
  it('uses +Y as up, -Z as forward and +X as right for the identity orientation', () => {
    const body = new Quaternion();

    expectVector(upOf(body), new Vector3(0, 1, 0));
    expectVector(forwardOf(body), new Vector3(0, 0, -1));
    expectVector(rightOf(body), new Vector3(1, 0, 0));
  });

  it('yaw turns the view around the local up without changing it', () => {
    const body = yaw(new Quaternion(), Math.PI / 2);

    expectVector(upOf(body), new Vector3(0, 1, 0));
    expectVector(forwardOf(body), new Vector3(-1, 0, 0));
  });
});

describe('alignUp', () => {
  it('turns the body so that its up matches the target', () => {
    const body = new Quaternion();
    const target = new Vector3(1, 1, 0).normalize();

    alignUp(body, target, 1);

    expectVector(upOf(body), target);
  });

  it('keeps the heading when the ground tilts sideways', () => {
    const body = new Quaternion();

    alignUp(body, new Vector3(1, 1, 0).normalize(), 1);

    expectVector(forwardOf(body), new Vector3(0, 0, -1));
  });

  it('moves only part of the way with a smoothing factor below 1', () => {
    const body = new Quaternion();
    const target = new Vector3(1, 0, 0);

    alignUp(body, target, 0.5);

    expect(upOf(body).angleTo(target)).toBeCloseTo(Math.PI / 4);
  });

  it('stays a unit quaternion after many small corrections', () => {
    const body = new Quaternion();
    for (let i = 0; i < 10_000; i++) {
      alignUp(body, new Vector3(Math.sin(i), 1, Math.cos(i)).normalize(), 0.1);
    }

    expect(body.length()).toBeCloseTo(1, 6);
  });
});

describe('walking all the way around a planet', () => {
  it.each([0, Math.PI / 2, Math.PI / 3])(
    'returns to the start with the same heading (initial yaw %f)',
    (initialYaw) => {
      const { body, position, startForward } = walkAround(90, initialYaw, 3600);

      expectVector(position, new Vector3(0, 90, 0), 1);
      expectVector(forwardOf(body), startForward, 3);
      expectVector(upOf(body), new Vector3(0, 1, 0), 3);
    },
  );

  it('never produces NaN when crossing the opposite side of the planet', () => {
    const { body } = walkAround(45, 0, 7200);

    expect(body.toArray().every(Number.isFinite)).toBe(true);
  });
});

describe('smoothingFactor', () => {
  it('is frame-rate independent: two half steps equal one full step', () => {
    const full = smoothingFactor(8, 1 / 30);
    const half = smoothingFactor(8, 1 / 60);

    expect(1 - (1 - half) ** 2).toBeCloseTo(full);
  });

  it('is between 0 and 1', () => {
    expect(smoothingFactor(8, 1 / 60)).toBeGreaterThan(0);
    expect(smoothingFactor(8, 1 / 60)).toBeLessThan(1);
  });
});

describe('lookAlong', () => {
  it('builds the identity orientation for up +Y and forward -Z', () => {
    const body = lookAlong(new Vector3(0, 1, 0), new Vector3(0, 0, -1));

    expectVector(upOf(body), new Vector3(0, 1, 0));
    expectVector(forwardOf(body), new Vector3(0, 0, -1));
    expectVector(rightOf(body), new Vector3(1, 0, 0));
  });

  it('keeps the given up and the closest forward on the ground plane', () => {
    const up = new Vector3(1, 1, 0).normalize();
    const body = lookAlong(up, new Vector3(1, 0, 0)); // no es perpendicular a up

    expectVector(upOf(body), up);
    expect(forwardOf(body).dot(up)).toBeCloseTo(0);
    expect(forwardOf(body).x).toBeGreaterThan(0);
  });

  it('works for any direction of up, including the poles', () => {
    for (const up of [new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(-1, 0, 0)]) {
      const body = lookAlong(up, new Vector3(0.3, 0.2, 0.9));

      expectVector(upOf(body), up);
      expect(body.length()).toBeCloseTo(1);
    }
  });

  it('copes with a forward that is parallel to up by picking any heading', () => {
    const body = lookAlong(new Vector3(0, 1, 0), new Vector3(0, 1, 0));

    expectVector(upOf(body), new Vector3(0, 1, 0));
    expect(Number.isFinite(forwardOf(body).x)).toBe(true);
    expect(forwardOf(body).length()).toBeCloseTo(1);
  });

  it('does not modify its arguments', () => {
    const up = new Vector3(0, 1, 0);
    const forward = new Vector3(0, 0.5, -1);

    lookAlong(up, forward);

    expect(up.toArray()).toEqual([0, 1, 0]);
    expect(forward.toArray()).toEqual([0, 0.5, -1]);
  });
});
