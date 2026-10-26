import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  SHIP_MATCH_ACCEL,
  SHIP_MAX_SPEED,
  SHIP_MAX_TURN_RATE,
  SHIP_THRUST_FORWARD,
  SHIP_THRUST_LATERAL,
  SHIP_THRUST_VERTICAL,
  SHIP_TURN_ACCEL,
} from '../../src/data/ship';
import {
  createShipState,
  IDLE_SHIP_INPUT,
  stepShip,
  type ShipEnvironment,
  type ShipInput,
  type ShipState,
} from '../../src/ship/shipPhysics';

const DT = 1 / 60;
const NO_FORCES: ShipEnvironment = { gravity: new Vector3(), targetVelocity: undefined };

function input(patch: Partial<ShipInput>): ShipInput {
  return { ...IDLE_SHIP_INPUT, thrust: new Vector3(), turn: new Vector3(), ...patch };
}

function run(
  state: ShipState,
  shipInput: ShipInput,
  seconds: number,
  env: ShipEnvironment = NO_FORCES,
): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepShip(state, shipInput, env, DT);
}

/** Hacia dónde mira la proa (−Z local) en el marco del mundo. */
function nose(state: ShipState): Vector3 {
  return new Vector3(0, 0, -1).applyQuaternion(state.orientation);
}

describe('translation', () => {
  it('accelerates forward along the nose', () => {
    const state = createShipState();

    run(state, input({ thrust: new Vector3(0, 0, 1) }), 1);

    expect(state.velocity.z).toBeCloseTo(-SHIP_THRUST_FORWARD, 1);
    expect(state.velocity.x).toBeCloseTo(0);
  });

  it('backs up, strafes and climbs with their own accelerations', () => {
    const lateral = createShipState();
    const vertical = createShipState();
    const back = createShipState();

    run(lateral, input({ thrust: new Vector3(1, 0, 0) }), 1);
    run(vertical, input({ thrust: new Vector3(0, 1, 0) }), 1);
    run(back, input({ thrust: new Vector3(0, 0, -1) }), 1);

    expect(lateral.velocity.x).toBeCloseTo(SHIP_THRUST_LATERAL, 1);
    expect(vertical.velocity.y).toBeCloseTo(SHIP_THRUST_VERTICAL, 1);
    expect(back.velocity.z).toBeCloseTo(SHIP_THRUST_FORWARD, 1);
  });

  it('follows the orientation of the ship', () => {
    const state = createShipState();
    state.orientation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2); // proa a la izquierda (−X)

    run(state, input({ thrust: new Vector3(0, 0, 1) }), 1);

    expect(state.velocity.x).toBeCloseTo(-SHIP_THRUST_FORWARD, 1);
    expect(state.velocity.z).toBeCloseTo(0, 1);
  });

  it('does not go faster by thrusting in two directions at once', () => {
    const diagonal = createShipState();

    run(diagonal, input({ thrust: new Vector3(1, 1, 1) }), 0.5);

    expect(diagonal.velocity.length()).toBeLessThanOrEqual(
      Math.max(SHIP_THRUST_FORWARD, SHIP_THRUST_LATERAL, SHIP_THRUST_VERTICAL) * 0.5 + 1e-6,
    );
  });

  it('keeps its speed with the engines off (inertia)', () => {
    const state = createShipState();
    state.velocity.set(5, 0, 0);

    run(state, input({}), 2);

    expect(state.velocity.x).toBeCloseTo(5);
    expect(state.position.x).toBeCloseTo(10, 1);
  });

  it('never exceeds the maximum speed', () => {
    const state = createShipState();

    run(state, input({ thrust: new Vector3(0, 0, 1) }), 10);

    expect(state.velocity.length()).toBeLessThanOrEqual(SHIP_MAX_SPEED + 1e-6);
    expect(state.velocity.length()).toBeGreaterThan(SHIP_MAX_SPEED - 1);
  });

  it('feels the gravity of the world', () => {
    const state = createShipState();

    run(state, input({}), 1, { gravity: new Vector3(0, -9.8, 0), targetVelocity: undefined });

    expect(state.velocity.y).toBeCloseTo(-9.8, 1);
  });
});

describe('rotation with the stabilizer', () => {
  it('reaches the commanded turn rate and keeps it', () => {
    const state = createShipState();

    run(state, input({ turn: new Vector3(0, 1, 0), stabilize: true }), 2);

    expect(state.angularVelocity.y).toBeCloseTo(SHIP_MAX_TURN_RATE);
  });

  it('turns the nose to the left with a positive yaw and up with a positive pitch', () => {
    const left = createShipState();
    const up = createShipState();

    run(left, input({ turn: new Vector3(0, 1, 0), stabilize: true }), 0.5);
    run(up, input({ turn: new Vector3(1, 0, 0), stabilize: true }), 0.5);

    expect(nose(left).x).toBeLessThan(-0.1);
    expect(nose(up).y).toBeGreaterThan(0.1);
  });

  it('stops turning by itself when the controls are released', () => {
    const state = createShipState();
    state.angularVelocity.set(0.5, -1, 0.8);

    run(state, input({ stabilize: true }), SHIP_MAX_TURN_RATE / SHIP_TURN_ACCEL + 0.5);

    expect(state.angularVelocity.length()).toBeLessThan(1e-6);
  });

  it('turns exactly by the angular speed times the time', () => {
    const state = createShipState();
    state.angularVelocity.set(0, 1, 0);

    run(state, input({ turn: new Vector3(0, 0.6667, 0), stabilize: true }), 1);

    expect(state.orientation.angleTo(new Quaternion())).toBeCloseTo(1, 1);
  });
});

describe('rotation in free mode', () => {
  it('keeps spinning when the controls are released', () => {
    const state = createShipState();
    state.angularVelocity.set(0, 1, 0);

    run(state, input({ stabilize: false }), 3);

    expect(state.angularVelocity.y).toBeCloseTo(1);
  });

  it('adds spin while a control is held, up to the maximum', () => {
    const state = createShipState();

    run(state, input({ turn: new Vector3(0, 1, 0), stabilize: false }), 5);

    expect(state.angularVelocity.y).toBeCloseTo(SHIP_MAX_TURN_RATE);
  });
});

describe('matching the velocity of a target', () => {
  it('brakes towards the velocity of the target and then holds it', () => {
    const state = createShipState();
    state.velocity.set(30, 0, -20);
    const target = new Vector3(5, 0, 2);

    run(state, input({ match: true }), 3, { gravity: new Vector3(), targetVelocity: target });

    expect(state.velocity.distanceTo(target)).toBeLessThan(1e-6);
  });

  it('cannot change speed faster than its braking acceleration', () => {
    const state = createShipState();
    state.velocity.set(60, 0, 0);

    run(state, input({ match: true }), 1, {
      gravity: new Vector3(),
      targetVelocity: new Vector3(),
    });

    expect(state.velocity.x).toBeCloseTo(60 - SHIP_MATCH_ACCEL, 1);
  });

  it('ignores the thrust while matching', () => {
    const state = createShipState();

    run(state, input({ match: true, thrust: new Vector3(0, 0, 1) }), 1, {
      gravity: new Vector3(),
      targetVelocity: new Vector3(),
    });

    expect(state.velocity.length()).toBeLessThan(1e-6);
  });

  it('does nothing special without a target', () => {
    const state = createShipState();

    run(state, input({ match: true, thrust: new Vector3(0, 0, 1) }), 1);

    expect(state.velocity.z).toBeCloseTo(-SHIP_THRUST_FORWARD, 1);
  });
});

describe('numerical health', () => {
  it('keeps the orientation a unit quaternion after a long spin', () => {
    const state = createShipState();

    run(state, input({ turn: new Vector3(1, 1, 1), stabilize: true }), 60);

    expect(state.orientation.length()).toBeCloseTo(1, 9);
  });

  it('survives absurd inputs and steps', () => {
    const state = createShipState();

    stepShip(
      state,
      input({ thrust: new Vector3(50, 50, 50), turn: new Vector3(9, 9, 9) }),
      NO_FORCES,
      5,
    );

    expect(Number.isFinite(state.velocity.length())).toBe(true);
    expect(state.velocity.length()).toBeLessThanOrEqual(SHIP_MAX_SPEED + 1e-6);
  });
});
