import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  createCharacter,
  stepCharacter,
  type CharacterState,
  type MotorEnvironment,
} from '../../src/physics/characterMotor';
import type { GravityWell } from '../../src/physics/gravity';
import { forwardOf, yaw } from '../../src/physics/surfaceFrame';
import type { MoveIntent } from '../../src/core/input';
import { JUMP_HEIGHT, PHYSICS_STEP, RUN_SPEED, WALK_SPEED } from '../../src/data/movement';
import { compositeWorld, halfSpaceWorld, sphereWorld } from '../helpers/testWorlds';

const IDLE: MoveIntent = { x: 0, z: 0, run: false, jump: false };
const WALK: MoveIntent = { x: 0, z: 1, run: false, jump: false };
const RUN: MoveIntent = { x: 0, z: 1, run: true, jump: false };
const JUMP: MoveIntent = { x: 0, z: 0, run: false, jump: true };

const R = 90;

function planet(radius = R, gravity = 1): MotorEnvironment {
  const well: GravityWell = {
    center: new Vector3(),
    radius,
    strength: 9.8 * gravity,
    range: radius * 2,
  };
  return { wells: [well], world: sphereWorld(new Vector3(), radius) };
}

/** Suelo casi plano: un planeta enorme debajo, para probar pendientes con gravedad -Y. */
function flatGround(...extra: ReturnType<typeof halfSpaceWorld>[]): MotorEnvironment {
  const well: GravityWell = {
    center: new Vector3(0, -1e6, 0),
    radius: 1e6,
    strength: 9.8,
    range: 1e6,
  };
  const floor = halfSpaceWorld(new Vector3(), new Vector3(0, 1, 0));
  return { wells: [well], world: compositeWorld(floor, ...extra) };
}

function simulate(
  state: CharacterState,
  env: MotorEnvironment,
  intent: MoveIntent,
  seconds: number,
  onStep?: (s: CharacterState) => void,
): void {
  const steps = Math.round(seconds / PHYSICS_STEP);
  for (let i = 0; i < steps; i++) {
    stepCharacter(state, intent, env, PHYSICS_STEP);
    onStep?.(state);
  }
}

function standingOnPlanet(): CharacterState {
  return createCharacter(new Vector3(0, R, 0), new Quaternion());
}

describe('standing on a planet', () => {
  it('stays on the surface and grounded when idle', () => {
    const state = standingOnPlanet();

    simulate(state, planet(), IDLE, 2);

    expect(state.grounded).toBe(true);
    expect(state.position.length()).toBeCloseTo(R, 1);
  });

  it('lands on the ground after falling from above without going through it', () => {
    const state = createCharacter(new Vector3(0, R + 20, 0), new Quaternion());
    let lowest = Infinity;

    simulate(state, planet(), IDLE, 6, (s) => (lowest = Math.min(lowest, s.position.length())));

    expect(state.grounded).toBe(true);
    expect(lowest).toBeGreaterThan(R - 0.05);
  });

  it('does not tunnel through the ground at very high speed', () => {
    const state = createCharacter(new Vector3(0, R + 5, 0), new Quaternion());
    state.velocity.set(0, -200, 0);

    simulate(state, planet(), IDLE, 0.5);

    expect(state.position.y).toBeGreaterThan(R - 0.05);
  });
});

describe('walking', () => {
  it('walks at walking speed', () => {
    const state = standingOnPlanet();
    simulate(state, planet(), WALK, 1); // acelerar
    const before = state.position.clone();

    simulate(state, planet(), WALK, 1);

    expect(before.distanceTo(state.position)).toBeCloseTo(WALK_SPEED, 1);
  });

  it('runs faster when running', () => {
    const state = standingOnPlanet();
    simulate(state, planet(), RUN, 1);
    const before = state.position.clone();

    simulate(state, planet(), RUN, 1);

    expect(before.distanceTo(state.position)).toBeCloseTo(RUN_SPEED, 1);
  });

  it('stops quickly when the input is released', () => {
    const state = standingOnPlanet();
    simulate(state, planet(), WALK, 1);

    simulate(state, planet(), IDLE, 0.5);

    expect(state.velocity.length()).toBeLessThan(0.05);
  });

  it('goes all the way around the planet and returns to the start facing the same way', () => {
    const radius = 45; // Taller: vuelta más corta, mismo comportamiento
    const state = createCharacter(new Vector3(0, radius, 0), new Quaternion());
    const startForward = forwardOf(state.body);
    const lapSeconds = (2 * Math.PI * radius) / WALK_SPEED;

    simulate(state, planet(radius), WALK, lapSeconds + 0.1); // +0,1 s de arranque

    expect(state.position.distanceTo(new Vector3(0, radius, 0))).toBeLessThan(1.5);
    expect(forwardOf(state.body).angleTo(startForward)).toBeLessThan(0.05);
    expect(state.grounded).toBe(true);
  });
});

describe('jumping', () => {
  function peakHeight(gravity: number): number {
    const state = standingOnPlanet();
    const env = planet(R, gravity);
    simulate(state, env, IDLE, 0.2);
    let peak = 0;
    simulate(state, env, JUMP, PHYSICS_STEP);
    simulate(state, env, IDLE, 2, (s) => (peak = Math.max(peak, s.position.length() - R)));
    return peak;
  }

  it('jumps about the configured height with gravity 1', () => {
    expect(peakHeight(1)).toBeCloseTo(JUMP_HEIGHT, 1);
  });

  it('jumps lower with stronger gravity and higher with weaker gravity', () => {
    expect(peakHeight(1.5)).toBeCloseTo(JUMP_HEIGHT / 1.5, 1);
    expect(peakHeight(0.6)).toBeCloseTo(JUMP_HEIGHT / 0.6, 1);
  });

  it('jumps once per key press, not continuously while held', () => {
    const state = standingOnPlanet();
    simulate(state, planet(), IDLE, 0.2); // apoyarse antes de pulsar
    let jumpsStarted = 0;
    let wasGrounded = true;

    simulate(state, planet(), JUMP, 3, (s) => {
      if (wasGrounded && !s.grounded) jumpsStarted++;
      wasGrounded = s.grounded;
    });

    expect(jumpsStarted).toBe(1);
  });

  it('cannot jump in mid air', () => {
    const state = createCharacter(new Vector3(0, R + 10, 0), new Quaternion());

    simulate(state, planet(), JUMP, PHYSICS_STEP);

    expect(state.velocity.y).toBeLessThanOrEqual(0);
  });
});

describe('slopes', () => {
  function rampAt(degrees: number) {
    const angle = (degrees * Math.PI) / 180;
    // Rampa que sube hacia +X a partir de x = 2
    return halfSpaceWorld(new Vector3(2, 0, 0), new Vector3(-Math.sin(angle), Math.cos(angle), 0));
  }

  function walkTowardsRamp(degrees: number): CharacterState {
    const state = createCharacter(new Vector3(0, 0, 0), yaw(new Quaternion(), -Math.PI / 2));
    simulate(state, flatGround(rampAt(degrees)), WALK, 4);
    return state;
  }

  it('walks up a gentle slope', () => {
    expect(walkTowardsRamp(30).position.y).toBeGreaterThan(3);
  });

  it('cannot climb a slope steeper than the limit', () => {
    expect(walkTowardsRamp(60).position.y).toBeLessThan(0.5);
  });

  it('does not slide down a walkable slope when standing still', () => {
    const state = createCharacter(new Vector3(6, 4, 0), new Quaternion());
    const env = flatGround(rampAt(30));
    simulate(state, env, IDLE, 1);
    const settled = state.position.clone();

    simulate(state, env, IDLE, 2);

    expect(state.position.distanceTo(settled)).toBeLessThan(0.05);
  });
});
