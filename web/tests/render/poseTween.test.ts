import { Object3D, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  anchorAt,
  blendPose,
  ease,
  placeAt,
  poseOf,
  type LocalPose,
} from '../../src/render/poseTween';

function pose(x: number, angle: number, scale: number): LocalPose {
  return {
    position: new Vector3(x, 0, 0),
    quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle),
    scale,
  };
}

describe('poses and the smooth step between them', () => {
  it('starts and stops slowly, and stays between 0 and 1', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(-3)).toBe(0);
    expect(ease(7)).toBe(1);
  });

  it('blends position, turn and size', () => {
    const object = new Object3D();

    blendPose(object, pose(0, 0, 1), pose(10, Math.PI / 2, 3), 0.5);

    expect(object.position.x).toBeCloseTo(5);
    expect(object.quaternion.angleTo(new Quaternion())).toBeCloseTo(Math.PI / 4);
    expect(object.scale.x).toBeCloseTo(2);
  });

  it('copies a pose, so moving the object later does not change it', () => {
    const object = new Object3D();
    object.position.set(1, 2, 3);
    const copy = poseOf(object);

    object.position.set(9, 9, 9);

    expect(copy.position).toEqual(new Vector3(1, 2, 3));
    expect(copy.scale).toBe(1);
  });

  it('hangs an object from a marker of a world, in its pose', () => {
    const world = new Object3D();
    const marker = new Object3D();
    marker.position.set(4, 0, 0);
    world.add(marker);
    const anchor = anchorAt(marker, 2);
    const object = new Object3D();

    expect(anchor).toBeDefined();
    if (anchor) placeAt(object, anchor);

    expect(object.parent).toBe(world);
    expect(object.position.x).toBe(4);
    expect(object.scale.x).toBe(2);
    expect(anchorAt(new Object3D())).toBeUndefined();
  });
});
