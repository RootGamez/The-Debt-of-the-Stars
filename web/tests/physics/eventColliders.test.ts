// Colisiones que solo existen durante un evento (Fase 11F, los puentes de luz del Taller).
import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, Vector3 } from 'three';
import { createBvhWorld } from '../../src/physics/bvhWorld';
import { createCapsule, createContact } from '../../src/physics/collisionWorld';
import { withEventColliders } from '../../src/physics/eventColliders';

function slab(y: number, x = 0): Mesh {
  const mesh = new Mesh(new BoxGeometry(4, 1, 4));
  mesh.position.set(x, y, 0);
  mesh.updateMatrixWorld(true);
  return mesh;
}

const ground = createBvhWorld([slab(-0.5)]);
const bridge = { event: 'puentes', world: createBvhWorld([slab(-0.5, 10)]) };
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

describe('colliders of an event', () => {
  it('are not there outside their event', () => {
    let events: string[] = [];
    const world = withEventColliders(ground, [bridge], () => events);
    const above = new Vector3(10, 3, 0);
    expect(world.raycast(above, DOWN, 10)).toBeNull();
    events = ['puentes'];
    expect(world.raycast(above, DOWN, 10)).toBeCloseTo(3, 5);
  });

  it('hold the player up while the event lasts', () => {
    const world = withEventColliders(ground, [bridge], () => ['puentes']);
    const capsule = createCapsule(0.3);
    capsule.start.set(10, 0.2, 0);
    capsule.end.set(10, 1.4, 0);
    const contact = createContact();

    expect(world.resolve(capsule, UP, contact)).toBe(true);
    expect(contact.correction.y).toBeCloseTo(0.1, 5);
    expect(contact.floorDot).toBeCloseTo(1, 5);
  });

  it('leave the ground as it was', () => {
    const world = withEventColliders(ground, [bridge], () => ['puentes']);
    expect(world.raycast(new Vector3(0, 3, 0), DOWN, 10)).toBeCloseTo(3, 5);
    expect(withEventColliders(ground, [], () => [])).toBe(ground);
  });
});
