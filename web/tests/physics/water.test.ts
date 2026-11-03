// El agua (Fase 11E): dónde moja, cuánto del cuerpo queda dentro, el aire y cómo se nada con el motor.
import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import type { MoveIntent } from '../../src/core/input';
import {
  BREATH_REFILL_SECONDS,
  BREATH_SECONDS,
  EYE_HEIGHT,
  PHYSICS_STEP,
  SWIM_SPEED,
} from '../../src/data/movement';
import {
  createCharacter,
  stepCharacter,
  type CharacterState,
  type MotorEnvironment,
} from '../../src/physics/characterMotor';
import type { GravityWell } from '../../src/physics/gravity';
import { forwardOf } from '../../src/physics/surfaceFrame';
import {
  Breath,
  headUnder,
  isWet,
  submersion,
  withSeaSurface,
  type WaterBody,
} from '../../src/physics/water';
import { createCapsule, createContact, placeCapsule } from '../../src/physics/collisionWorld';
import { sphereWorld } from '../helpers/testWorlds';

const SEA = 70;
const SEABED = 56;
const ring = { major: 70, minor: 9 };
const UPWARD = new Vector3(0, 1, 0);
const water: WaterBody = { center: new Vector3(), level: SEA, dry: ring };

const IDLE: MoveIntent = { x: 0, z: 0, run: false, jump: false };
const DIVE: MoveIntent = { x: 0, z: 0, run: true, jump: false };
const UP: MoveIntent = { x: 0, z: 0, run: false, jump: true };
const FORWARD: MoveIntent = { x: 0, z: 1, run: false, jump: false };

/** Un mar como el del Archivo, lejos del tubo (sobre el polo norte): fondo de roca a 14 m. */
function ocean(): MotorEnvironment {
  const well: GravityWell = {
    center: new Vector3(),
    radius: SEA,
    strength: 9.8 * 1.5,
    range: SEA * 2,
  };
  return { wells: [well], world: sphereWorld(new Vector3(), SEABED), water };
}

/** De pie (o flotando) sobre el polo norte con los pies a `height` m del centro. */
function swimmer(height: number): CharacterState {
  return createCharacter(new Vector3(0, height, 0), new Quaternion());
}

function run(state: CharacterState, env: MotorEnvironment, intent: MoveIntent, seconds: number) {
  for (let i = 0; i < seconds / PHYSICS_STEP; i++) stepCharacter(state, intent, env, PHYSICS_STEP);
}

describe('where the water is', () => {
  it('is everything under the sea level, and nothing above it', () => {
    expect(isWet(new Vector3(0, 69, 0), water)).toBe(true);
    expect(isWet(new Vector3(0, 71, 0), water)).toBe(false);
  });

  it('leaves the glass tube dry inside, though it is under the sea level', () => {
    expect(isWet(new Vector3(70, 1, 0), water)).toBe(false);
    expect(isWet(new Vector3(62, 0, 0), water)).toBe(false); // el fondo del tubo
    expect(isWet(new Vector3(60, 0, 0), water)).toBe(true); // justo debajo, ya en el mar
  });

  it('measures how much of the body is in, from the feet up', () => {
    expect(submersion(new Vector3(0, 71, 0), UPWARD, water)).toBe(0);
    expect(submersion(new Vector3(0, 69.1, 0), UPWARD, water)).toBeCloseTo(0.5, 2);
    expect(submersion(new Vector3(0, 60, 0), UPWARD, water)).toBe(1);
  });

  it('finds the surface of the well that rises into the tube (radial up at the equator)', () => {
    const outward = new Vector3(1, 0, 0);
    // El fondo del tubo está a 61 m del centro: pies a 60,1 m, la mitad del cuerpo dentro.
    expect(submersion(new Vector3(60.1, 0, 0), outward, water)).toBeCloseTo(0.5, 2);
  });

  it('knows when the eyes are under', () => {
    const up = new Vector3(0, 1, 0);
    expect(headUnder(new Vector3(0, SEA - EYE_HEIGHT - 0.1, 0), up, water)).toBe(true);
    expect(headUnder(new Vector3(0, SEA - EYE_HEIGHT + 0.1, 0), up, water)).toBe(false);
  });
});

describe('the breath', () => {
  it('runs out once, after the breath time under water', () => {
    const breath = new Breath();
    let drowned = 0;
    for (let t = 0; t < BREATH_SECONDS + 2; t += 0.5) if (breath.update(true, 0.5)) drowned++;

    expect(drowned).toBe(1);
    expect(breath.seconds).toBe(0);
  });

  it('comes back quickly with the head out', () => {
    const breath = new Breath();
    breath.update(true, BREATH_SECONDS / 2);

    breath.update(false, BREATH_REFILL_SECONDS / 2);

    expect(breath.fraction).toBe(1);
  });
});

describe('swimming', () => {
  it('floats at the surface with the eyes out, without sinking', () => {
    const state = swimmer(SEA - 1);

    run(state, ocean(), IDLE, 6);

    expect(state.swimming).toBe(true);
    expect(headUnder(state.position, new Vector3(0, 1, 0), water)).toBe(false);
    expect(state.position.y).toBeGreaterThan(SEA - 1.8);
  });

  it('dives to the seabed holding Shift, and rises again with Space', () => {
    const state = swimmer(SEA - 1);
    const env = ocean();

    run(state, env, DIVE, 8);
    expect(state.position.y).toBeLessThan(SEABED + 0.5);

    run(state, env, UP, 6);
    expect(state.position.y).toBeGreaterThan(SEA - 2);
  });

  it('swims forward, slower than walking', () => {
    const state = swimmer(SEA - 1.4);
    const ahead = forwardOf(state.body, new Vector3());

    run(state, ocean(), FORWARD, 3);

    const travelled = state.position.dot(ahead);
    expect(travelled).toBeGreaterThan(SWIM_SPEED * 2);
    expect(travelled).toBeLessThan(SWIM_SPEED * 3.2);
  });

  it('is not a fatal landing to fall into the sea from high above', () => {
    const state = swimmer(SEA + 12);

    run(state, ocean(), IDLE, 5);

    expect(state.landings === 0 || state.lastLandingSpeed < 20).toBe(true);
    expect(state.position.y).toBeGreaterThan(SEABED);
  });
});

describe('the sea surface for the ship', () => {
  const seabed = sphereWorld(new Vector3(), SEABED);
  const raycastable = {
    ...seabed,
    raycast: (origin: Vector3, direction: Vector3, max: number) => {
      const along = -origin.dot(direction);
      const hit = origin.length() - SEABED;
      return along > 0 && hit <= max ? hit : null;
    },
  };
  const hull = withSeaSurface(raycastable, water);

  it('holds a capsule up at the sea level instead of the seabed', () => {
    const capsule = placeCapsule(
      createCapsule(1),
      new Vector3(0, SEA - 0.5, 0),
      new Vector3(0, 1, 0),
      3,
    );
    const contact = createContact();

    expect(hull.resolve(capsule, new Vector3(0, 1, 0), contact)).toBe(true);
    expect(contact.correction.y).toBeCloseTo(0.5);
    expect(contact.floorDot).toBeCloseTo(1);
  });

  it('lets rays hit the water before the rock below it', () => {
    expect(hull.raycast(new Vector3(0, SEA + 5, 0), new Vector3(0, -1, 0), 40)).toBeCloseTo(5);
    expect(hull.raycast(new Vector3(0, SEA + 5, 0), new Vector3(0, -1, 0), 3)).toBeNull();
  });
});
