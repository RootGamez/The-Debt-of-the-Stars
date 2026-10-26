import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SHIP_CRASH_SPEED, SHIP_LAND_SPEED } from '../../src/data/ship';
import { Ship } from '../../src/ship/ship';
import { IDLE_SHIP_INPUT, type ShipEnvironment, type ShipInput } from '../../src/ship/shipPhysics';
import { halfSpaceWorld, sphereWorld } from '../helpers/testWorlds';

const R = 90;
const SHIP_R = 2;
const DT = 1 / 60;
const CENTER = new Vector3();
const planet = { world: sphereWorld(CENTER, R), center: CENTER };
const gravityAt = (ship: Ship): Vector3 =>
  ship.state.position.clone().normalize().multiplyScalar(-9.8);
const envOf = (ship: Ship): ShipEnvironment => ({
  gravity: gravityAt(ship),
  targetVelocity: undefined,
});

function input(patch: Partial<ShipInput> = {}): ShipInput {
  return { ...IDLE_SHIP_INPUT, thrust: new Vector3(), turn: new Vector3(), ...patch };
}

function parked(): Ship {
  const ship = new Ship(SHIP_R);
  ship.park('umbral', new Vector3(0, R + SHIP_R, 0), new Quaternion());
  return ship;
}

function run(ship: Ship, shipInput: ShipInput, seconds: number, ground = planet) {
  let crashed = false;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    crashed ||= ship.step(shipInput, envOf(ship), ground, DT).crashed;
  }
  return crashed;
}

describe('a parked ship', () => {
  it('rests where it was left, without drifting or sinking', () => {
    const ship = parked();

    run(ship, input(), 3);

    expect(ship.landed).toBe(true);
    expect(ship.frame).toBe('umbral');
    expect(ship.state.position.y).toBeCloseTo(R + SHIP_R, 6);
    expect(ship.state.velocity.length()).toBe(0);
  });

  it('takes off as soon as the pilot thrusts', () => {
    const ship = parked();

    run(ship, input({ thrust: new Vector3(0, 1, 0) }), 1);

    expect(ship.landed).toBe(false);
    expect(ship.state.position.y).toBeGreaterThan(R + SHIP_R + 1);
  });
});

describe('landing', () => {
  it('settles on the ground after a soft drop and becomes landed', () => {
    const ship = new Ship(SHIP_R);
    ship.state.position.set(0, R + SHIP_R + 4, 0);

    const crashed = run(ship, input(), 6);

    expect(crashed).toBe(false);
    expect(ship.landed).toBe(true);
    expect(ship.state.position.length()).toBeCloseTo(R + SHIP_R, 3);
    expect(ship.state.velocity.length()).toBe(0);
  });

  it('crashes when it falls onto the ground too fast', () => {
    const ship = new Ship(SHIP_R);
    ship.state.position.set(0, R + SHIP_R + 30, 0);
    ship.state.velocity.set(0, -(SHIP_CRASH_SPEED + 10), 0);

    expect(run(ship, input(), 2)).toBe(true);
  });

  it('does not land while the pilot keeps thrusting (it hovers or bounces off)', () => {
    const ship = new Ship(SHIP_R);
    ship.state.position.set(0, R + SHIP_R + 1, 0);
    ship.state.velocity.set(0, -(SHIP_LAND_SPEED - 1), 0);

    run(ship, input({ thrust: new Vector3(0, 0.1, 0) }), 2);

    expect(ship.landed).toBe(false);
  });

  it('does not land on a slope that is too steep', () => {
    const ship = new Ship(SHIP_R);
    const slope = new Vector3(0, 1, 1).normalize();
    const ground = {
      world: halfSpaceWorld(new Vector3(), slope),
      center: new Vector3(0, -1000, 0),
    };
    ship.state.position.set(0, 3, 0);

    run(ship, input(), 3, ground);

    expect(ship.landed).toBe(false);
  });

  it('tilts upright against the ground when it touches down on a slope it can use', () => {
    const ship = new Ship(SHIP_R);
    const slope = new Vector3(0, 1, 0.3).normalize();
    const ground = {
      world: halfSpaceWorld(new Vector3(), slope),
      center: new Vector3(0, -1000, 0),
    };
    ship.state.position.set(0, 3, 0);

    run(ship, input(), 4, ground);

    expect(ship.landed).toBe(true);
    const up = new Vector3(0, 1, 0).applyQuaternion(ship.state.orientation);
    expect(up.dot(slope)).toBeGreaterThan(0.99);
  });
});

describe('flying without ground', () => {
  it('moves freely and is never landed', () => {
    const ship = new Ship(SHIP_R);
    ship.state.position.set(0, 500, 0);

    const crashed = ship.step(
      input({ thrust: new Vector3(0, 0, 1) }),
      {
        gravity: new Vector3(),
        targetVelocity: undefined,
      },
      undefined,
      1,
    ).crashed;

    expect(crashed).toBe(false);
    expect(ship.landed).toBe(false);
    expect(ship.state.velocity.length()).toBeGreaterThan(0);
  });
});

describe('the stabilizer setting', () => {
  it('is on by default and decides how the ship stops turning', () => {
    const on = new Ship(SHIP_R);
    const off = new Ship(SHIP_R);
    off.stabilize = false;
    for (const ship of [on, off]) ship.state.angularVelocity.set(0, 1, 0);
    const free: ShipEnvironment = { gravity: new Vector3(), targetVelocity: undefined };

    for (let i = 0; i < 120; i++) {
      on.step(input(), free, undefined, DT);
      off.step(input(), free, undefined, DT);
    }

    expect(on.stabilize).toBe(true);
    expect(on.state.angularVelocity.length()).toBeLessThan(1e-6);
    expect(off.state.angularVelocity.y).toBeCloseTo(1);
  });
});
