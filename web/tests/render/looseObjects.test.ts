import { describe, expect, it } from 'vitest';
import { Group, Vector3 } from 'three';
import { placeLoose } from '../../src/render/looseObjects';

describe('placing an object that was left somewhere', () => {
  it('hangs it from the world frame, standing on the spot lifted by its half height', () => {
    const world = new Group();
    const thing = new Group();

    placeLoose(thing, world, { position: [1, 2, 3], normal: [0, 0, 1] }, 0.25);

    expect(thing.parent).toBe(world);
    expect(thing.position.toArray()).toEqual([1, 2, 3.25]);
  });

  it('turns its up axis (Z) to the normal of the surface', () => {
    const thing = new Group();
    const normal = new Vector3(0, 1, 0);

    placeLoose(thing, new Group(), { position: [0, 0, 0], normal: [0, 1, 0] }, 0.2);

    const up = new Vector3(0, 0, 1).applyQuaternion(thing.quaternion);
    expect(up.distanceTo(normal)).toBeCloseTo(0);
    expect(thing.position.y).toBeCloseTo(0.2);
  });

  it('copes with an unnormalised or odd normal', () => {
    const thing = new Group();

    placeLoose(thing, new Group(), { position: [0, 0, 0], normal: [0, 0, 3] }, 0.1);
    expect(thing.position.z).toBeCloseTo(0.1);

    placeLoose(thing, new Group(), { position: [0, 0, 0], normal: [0, 0, 0] }, 0.1);
    expect(Number.isFinite(thing.position.z)).toBe(true);
    expect(Number.isFinite(thing.quaternion.w)).toBe(true);
  });

  it('resets the scale it had in the hands', () => {
    const thing = new Group();
    thing.scale.setScalar(0.8);

    placeLoose(thing, new Group(), { position: [0, 0, 0], normal: [0, 0, 1] }, 0.1);

    expect(thing.scale.x).toBe(1);
  });

  it('moves it from the scene to the world frame when it was in the hands', () => {
    const scene = new Group();
    const world = new Group();
    const thing = new Group();
    scene.add(thing);

    placeLoose(thing, world, { position: [0, 0, 0], normal: [0, 0, 1] }, 0.1);

    expect(thing.parent).toBe(world);
    expect(scene.children).toHaveLength(0);
  });
});
