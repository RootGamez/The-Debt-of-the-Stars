import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SHIP_CRASH_SPEED, SHIP_RESTITUTION } from '../../src/data/ship';
import { createShipState } from '../../src/ship/shipPhysics';
import { resolveShipContact } from '../../src/ship/shipContact';
import { halfSpaceWorld, sphereWorld } from '../helpers/testWorlds';

const R = 90;
const SHIP_R = 2;
const planet = sphereWorld(new Vector3(), R);
const UP = new Vector3(0, 1, 0);

function shipAt(y: number, vy = 0) {
  const state = createShipState();
  state.position.set(0, y, 0);
  state.velocity.set(0, vy, 0);
  return state;
}

describe('resolveShipContact', () => {
  it('does nothing in the air', () => {
    const state = shipAt(R + 20, -5);

    const result = resolveShipContact(state, planet, UP, SHIP_R);

    expect(result.touching).toBe(false);
    expect(result.crashed).toBe(false);
    expect(state.position.y).toBe(R + 20);
    expect(state.velocity.y).toBe(-5);
  });

  it('pushes the ship out of the ground to rest on its radius', () => {
    const state = shipAt(R + 1, 0);

    const result = resolveShipContact(state, planet, UP, SHIP_R);

    expect(result.touching).toBe(true);
    expect(state.position.y).toBeCloseTo(R + SHIP_R, 6);
  });

  it('removes most of the speed into the ground in a soft touchdown', () => {
    const state = shipAt(R + 1.9, -3);

    const result = resolveShipContact(state, planet, UP, SHIP_R);

    expect(result.crashed).toBe(false);
    expect(result.impactSpeed).toBeCloseTo(3, 6);
    expect(state.velocity.y).toBeGreaterThanOrEqual(0);
    expect(state.velocity.y).toBeLessThanOrEqual(3 * SHIP_RESTITUTION + 1e-9);
  });

  it('does not bounce on tiny contacts (no jitter when resting)', () => {
    const state = shipAt(R + 1.99, -0.5);

    resolveShipContact(state, planet, UP, SHIP_R);

    expect(state.velocity.y).toBe(0);
  });

  it('crashes above the crash speed and reports how hard it hit', () => {
    const state = shipAt(R + 1.5, -(SHIP_CRASH_SPEED + 5));

    const result = resolveShipContact(state, planet, UP, SHIP_R);

    expect(result.crashed).toBe(true);
    expect(result.impactSpeed).toBeCloseTo(SHIP_CRASH_SPEED + 5, 6);
  });

  it('does not crash when it skims the ground fast but along it', () => {
    const state = shipAt(R + 1.9, -1);
    state.velocity.x = 70;

    const result = resolveShipContact(state, planet, UP, SHIP_R);

    expect(result.crashed).toBe(false);
    expect(state.velocity.x).toBeCloseTo(70, 0);
  });

  it('reports how flat the ground is under the ship', () => {
    const flat = resolveShipContact(shipAt(R + 1.5), planet, UP, SHIP_R);

    const slope = new Vector3(0, 1, 1).normalize();
    const steep = shipAt(0);
    const wall = halfSpaceWorld(new Vector3(), slope);
    steep.position.set(0, 1, 0);
    const onSlope = resolveShipContact(steep, wall, UP, SHIP_R);

    expect(flat.floorDot).toBeCloseTo(1, 3);
    expect(onSlope.floorDot).toBeCloseTo(Math.SQRT1_2, 3);
  });

  it('never ends up inside the ground after a deep penetration', () => {
    const state = shipAt(R - 3, -10);

    resolveShipContact(state, planet, UP, SHIP_R);

    expect(state.position.length()).toBeGreaterThanOrEqual(R + SHIP_R - 1e-6);
  });
});
