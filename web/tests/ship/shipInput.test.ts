import { describe, expect, it } from 'vitest';
import { MOUSE_LOOK_SENSITIVITY } from '../../src/data/movement';
import { createShipInput, type FlightKeys } from '../../src/ship/shipInput';

const EMPTY_FLIGHT_KEYS: FlightKeys = {
  forward: false,
  back: false,
  left: false,
  right: false,
  up: false,
  down: false,
  rollLeft: false,
  rollRight: false,
  match: false,
};

describe('createShipInput', () => {
  it('produces zero thrust and turn when idle', () => {
    const input = createShipInput(EMPTY_FLIGHT_KEYS, { x: 0, y: 0 }, { stabilize: true });
    expect(input.thrust.x).toBe(0);
    expect(input.thrust.y).toBe(0);
    expect(input.thrust.z).toBe(0);
    expect(input.turn.x).toBe(0);
    expect(input.turn.y).toBe(0);
    expect(input.turn.z).toBe(0);
    expect(input.stabilize).toBe(true);
    expect(input.match).toBe(false);
  });

  it('translates linear thrust keys into 3D thrust vector (+Z = forward, +Y = up, +X = right)', () => {
    const forward = createShipInput(
      { ...EMPTY_FLIGHT_KEYS, forward: true },
      { x: 0, y: 0 },
      { stabilize: true },
    );
    expect(forward.thrust.z).toBe(1);
    expect(forward.thrust.x).toBe(0);

    const upRight = createShipInput(
      { ...EMPTY_FLIGHT_KEYS, up: true, right: true },
      { x: 0, y: 0 },
      { stabilize: true },
    );
    expect(upRight.thrust.y).toBeCloseTo(1 / Math.SQRT2, 3);
    expect(upRight.thrust.x).toBeCloseTo(1 / Math.SQRT2, 3);
  });

  it('translates Q and E into roll (+Z in turn = roll left)', () => {
    const rollLeft = createShipInput(
      { ...EMPTY_FLIGHT_KEYS, rollLeft: true },
      { x: 0, y: 0 },
      { stabilize: true },
    );
    expect(rollLeft.turn.z).toBe(1);

    const rollRight = createShipInput(
      { ...EMPTY_FLIGHT_KEYS, rollRight: true },
      { x: 0, y: 0 },
      { stabilize: true },
    );
    expect(rollRight.turn.z).toBe(-1);
  });

  it('passes match velocity flag', () => {
    const match = createShipInput(
      { ...EMPTY_FLIGHT_KEYS, match: true },
      { x: 0, y: 0 },
      { stabilize: true },
    );
    expect(match.match).toBe(true);
  });

  it('turns mouse movement into an aim angle, like looking around on foot', () => {
    // look en píxeles: a la derecha = proa a la derecha (guiñada negativa), arriba = proa arriba
    const aimed = createShipInput(EMPTY_FLIGHT_KEYS, { x: 10, y: -20 }, { stabilize: true });

    expect(aimed.aim.yaw).toBeCloseTo(-10 * MOUSE_LOOK_SENSITIVITY);
    expect(aimed.aim.pitch).toBeCloseTo(20 * MOUSE_LOOK_SENSITIVITY);
    expect(aimed.turn.x).toBe(0);
    expect(aimed.turn.y).toBe(0);
  });
});
