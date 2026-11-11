import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  THIRD_PERSON_DISTANCE,
  THIRD_PERSON_MIN_DISTANCE,
  THIRD_PERSON_PIVOT_HEIGHT,
  clearDistance,
  easeDistance,
  thirdPersonPose,
} from '../../src/render/thirdPersonCamera';

describe('thirdPersonPose', () => {
  it('sits behind and above the feet, looking where the body looks', () => {
    const position = new Vector3();
    const orientation = new Quaternion();

    thirdPersonPose(
      new Quaternion(),
      0,
      new Vector3(),
      THIRD_PERSON_DISTANCE,
      undefined,
      position,
      orientation,
    );

    // Sin giro el cuerpo mira a −Z: la cámara queda en +Z, a la altura del pivote.
    expect(position.z).toBeCloseTo(THIRD_PERSON_DISTANCE);
    expect(position.y).toBeCloseTo(THIRD_PERSON_PIVOT_HEIGHT);
    expect(new Vector3(0, 0, -1).applyQuaternion(orientation).z).toBeCloseTo(-1);
  });

  it('drops the camera lower when looking up', () => {
    const level = new Vector3();
    const raised = new Vector3();
    const args = [new Quaternion(), new Vector3(), THIRD_PERSON_DISTANCE, undefined] as const;

    thirdPersonPose(args[0], 0, args[1], args[2], args[3], level, new Quaternion());
    thirdPersonPose(args[0], 0.6, args[1], args[2], args[3], raised, new Quaternion());

    expect(raised.y).toBeLessThan(level.y);
  });

  it('pulls in to stop in front of a wall and reports what fits', () => {
    const position = new Vector3();
    const wall = { raycast: () => 1.5 };

    const clear = thirdPersonPose(
      new Quaternion(),
      0,
      new Vector3(),
      THIRD_PERSON_DISTANCE,
      wall,
      position,
      new Quaternion(),
    );

    expect(clear).toBeLessThan(1.5);
    expect(position.z).toBeCloseTo(clear);
  });
});

describe('clearDistance', () => {
  it('keeps the wanted distance when nothing is in the way', () => {
    expect(clearDistance(null)).toBe(THIRD_PERSON_DISTANCE);
    expect(clearDistance(10)).toBe(THIRD_PERSON_DISTANCE);
  });

  it('never goes closer than the minimum, even against a wall at the pivot', () => {
    expect(clearDistance(0)).toBe(THIRD_PERSON_MIN_DISTANCE);
  });
});

describe('easeDistance', () => {
  it('comes closer at once and moves away gradually', () => {
    expect(easeDistance(3, 1, 0.016)).toBe(1);
    const away = easeDistance(1, 3, 0.016);
    expect(away).toBeGreaterThan(1);
    expect(away).toBeLessThan(3);
    expect(easeDistance(2.99, 3, 1)).toBe(3);
  });
});
