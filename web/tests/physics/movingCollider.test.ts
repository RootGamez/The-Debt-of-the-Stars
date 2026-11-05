import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createCapsule,
  createContact,
  type CollisionWorld,
  type RaycastWorld,
} from '../../src/physics/collisionWorld';
import { withMovingCollider, type PlacedCollider } from '../../src/physics/movingCollider';
import { halfSpaceWorld, sphereWorld } from '../helpers/testWorlds';

const UP = new Vector3(0, 1, 0);
const ground = halfSpaceWorld(new Vector3(), UP);

function capsuleAt(x: number, y: number) {
  const capsule = createCapsule(0.35);
  capsule.start.set(x, y + 0.35, 0);
  capsule.end.set(x, y + 1.45, 0);
  return capsule;
}

describe('withMovingCollider', () => {
  // Una esfera de 2 m en los ejes del objeto, colocada a 2 m de altura.
  const ship: PlacedCollider = {
    world: sphereWorld(new Vector3(), 2),
    position: new Vector3(0, 2, 0),
    orientation: new Quaternion(),
  };

  it('pushes a walker out of the obstacle sideways', () => {
    const world = withMovingCollider(ground, () => ship);
    const contact = createContact();

    const touching = world.resolve(capsuleAt(1.5, 0.01), UP, contact);

    expect(touching).toBe(true);
    expect(contact.correction.x).toBeGreaterThan(0.5);
  });

  it('still stands on the ground under it', () => {
    const world = withMovingCollider(ground, () => ship);
    const contact = createContact();

    world.resolve(capsuleAt(10, -0.1), UP, contact);

    expect(contact.correction.y).toBeCloseTo(0.1, 6);
    expect(contact.floorDot).toBeCloseTo(1, 6);
  });

  it('can be stood on top of', () => {
    const world = withMovingCollider(ground, () => ship);
    const contact = createContact();

    world.resolve(capsuleAt(0, 3.9), UP, contact);

    expect(contact.floorDot).toBeGreaterThan(0.9);
  });

  it('is not there when the obstacle is absent (the ship flew away)', () => {
    const world = withMovingCollider(ground, () => undefined);
    const contact = createContact();

    expect(world.resolve(capsuleAt(1.5, 0.01), UP, contact)).toBe(false);
  });

  it('keeps the raycasts of the ground for spawning', () => {
    const raycasting: CollisionWorld & RaycastWorld = { ...ground, raycast: () => 7 };
    const world = withMovingCollider(raycasting, () => ship);

    expect(world.raycast(new Vector3(), new Vector3(0, -1, 0), 10)).toBe(7);
  });

  it('uses the pose of the object: its geometry turns and moves with it', () => {
    // Un suelo en y = 0 de los ejes del objeto, que está tumbado 90° (su "arriba" es +X del mundo) y desplazado.
    const wall: PlacedCollider = {
      world: halfSpaceWorld(new Vector3(), UP),
      position: new Vector3(5, 0, 0),
      orientation: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2),
    };
    const world = withMovingCollider(halfSpaceWorld(new Vector3(0, -50, 0), UP), () => wall);
    const contact = createContact();

    world.resolve(capsuleAt(4.9, 0), UP, contact);

    expect(contact.correction.x).toBeGreaterThan(0.4);
    expect(contact.correction.y).toBeCloseTo(0, 6);
  });
});
