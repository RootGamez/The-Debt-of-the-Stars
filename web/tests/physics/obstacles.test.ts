import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createCapsule,
  createContact,
  type CollisionWorld,
  type RaycastWorld,
} from '../../src/physics/collisionWorld';
import { withSphereObstacle } from '../../src/physics/obstacles';
import { halfSpaceWorld } from '../helpers/testWorlds';

const UP = new Vector3(0, 1, 0);
const ground = halfSpaceWorld(new Vector3(), UP);

function capsuleAt(x: number, y: number) {
  const capsule = createCapsule(0.35);
  capsule.start.set(x, y + 0.35, 0);
  capsule.end.set(x, y + 1.45, 0);
  return capsule;
}

describe('withSphereObstacle', () => {
  const ship = { center: new Vector3(0, 2, 0), radius: 2 };

  it('pushes a walker out of the obstacle sideways', () => {
    const world = withSphereObstacle(ground, () => ship);
    const contact = createContact();

    const touching = world.resolve(capsuleAt(1.5, 0.01), UP, contact);

    expect(touching).toBe(true);
    expect(contact.correction.x).toBeGreaterThan(0.5);
  });

  it('still stands on the ground under it', () => {
    const world = withSphereObstacle(ground, () => ship);
    const contact = createContact();

    world.resolve(capsuleAt(10, -0.1), UP, contact);

    expect(contact.correction.y).toBeCloseTo(0.1, 6);
    expect(contact.floorDot).toBeCloseTo(1, 6);
  });

  it('can be stood on top of', () => {
    const world = withSphereObstacle(ground, () => ship);
    const contact = createContact();

    world.resolve(capsuleAt(0, 3.9), UP, contact);

    expect(contact.floorDot).toBeGreaterThan(0.9);
  });

  it('is not there when the obstacle is absent (the ship flew away)', () => {
    const world = withSphereObstacle(ground, () => undefined);
    const contact = createContact();

    expect(world.resolve(capsuleAt(1.5, 0.01), UP, contact)).toBe(false);
  });

  it('keeps the raycasts of the ground for spawning', () => {
    const raycasting: CollisionWorld & RaycastWorld = { ...ground, raycast: () => 7 };
    const world = withSphereObstacle(raycasting, () => ship);

    expect(world.raycast(new Vector3(), new Vector3(0, -1, 0), 10)).toBe(7);
  });
});
