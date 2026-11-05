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
    expect(on.state.angularVelocity.length()).toBeLessThan(1e-3);
    expect(off.state.angularVelocity.y).toBeCloseTo(1);
  });
});

describe('pilot comfort (Phase 5B review)', () => {
  it('lands while the pilot keeps descending, without bouncing', () => {
    const ship = new Ship(SHIP_R);
    ship.state.position.set(0, R + SHIP_R + 6, 0);
    const near = (s: Ship): ShipEnvironment => ({
      ...envOf(s),
      up: s.state.position.clone().normalize(),
      altitude: s.state.position.length() - R - SHIP_R,
    });

    let crashed = false;
    for (let i = 0; i < 400 && !ship.landed; i++) {
      crashed ||= ship.step(
        input({ thrust: new Vector3(0, -1, 0) }),
        near(ship),
        planet,
        DT,
      ).crashed;
    }

    expect(crashed).toBe(false);
    expect(ship.landed).toBe(true);
  });

  it('turns on the spot while parked, but does not leave the ground', () => {
    const ship = parked();
    const before = ship.state.position.clone();

    ship.step(input({ aim: { yaw: 0.5, pitch: 0.4 } }), envOf(ship), planet, DT);

    expect(ship.landed).toBe(true);
    expect(ship.state.position.distanceTo(before)).toBe(0);
    const nose = new Vector3(0, 0, -1).applyQuaternion(ship.state.orientation);
    expect(nose.y).toBeCloseTo(0, 6); // sin cabeceo
    expect(nose.x).toBeLessThan(-0.4); // guiñada a la izquierda
  });

  it('interpolates smoothly between the last two physics steps', () => {
    const ship = new Ship(SHIP_R);
    ship.state.position.set(0, 500, 0);
    ship.syncPrevious();
    const free: ShipEnvironment = { gravity: new Vector3(), targetVelocity: undefined };
    ship.state.velocity.set(6, 0, 0);

    ship.step(input(), free, undefined, DT);
    const middle = new Vector3();
    ship.interpolate(0.5, middle, new Quaternion());

    expect(middle.x).toBeCloseTo(6 * DT * 0.5, 9);
  });
});

describe('taking off from the ground', () => {
  it('stays parked when the pilot only pushes back (S)', () => {
    const ship = parked();

    run(ship, input({ thrust: new Vector3(0, 0, -1) }), 0.5);

    expect(ship.landed).toBe(true);
  });

  it('leaves the ground going forward', () => {
    const ship = parked();

    run(ship, input({ thrust: new Vector3(0, 0, 1) }), 0.2);

    expect(ship.landed).toBe(false);
  });
});
