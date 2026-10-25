import { describe, expect, it } from 'vitest';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { createBvhWorld } from '../../src/physics/bvhWorld';
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

describe('staying on uneven ground', () => {
  it('runs over a bump without being launched into the air', () => {
    // Joroba de 1 m: esfera enterrada en el suelo plano
    const bump = sphereWorld(new Vector3(6, -8, 0), 9);
    const env = flatGround();
    const world = compositeWorld(env.world, bump);
    const state = createCharacter(new Vector3(0, 0, 0), yaw(new Quaternion(), -Math.PI / 2));
    simulate(state, { ...env, world }, IDLE, 0.2);
    let airborne = 0;

    simulate(state, { ...env, world }, RUN, 2.5, (s) => {
      if (!s.grounded) airborne++;
    });

    expect(state.position.x).toBeGreaterThan(12); // cruzó la joroba
    expect(airborne).toBeLessThanOrEqual(2);
  });

  it('does not hop when going over the edge between two flat faces (like the real terrain)', () => {
    // Rampa de 20° que termina en una meseta: arista convexa entre dos caras planas.
    const rise = Math.tan((20 * Math.PI) / 180) * 10;
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          ...[-10, 0, -10, 0, rise, -10, 0, rise, 10, -10, 0, -10, 0, rise, 10, -10, 0, 10],
          ...[0, rise, -10, 20, rise, -10, 20, rise, 10, 0, rise, -10, 20, rise, 10, 0, rise, 10],
        ],
        3,
      ),
    );
    geometry.computeVertexNormals();
    const ground = createBvhWorld([new Mesh(geometry, new MeshBasicMaterial())]);
    const env = { wells: flatGround().wells, world: ground };
    const state = createCharacter(
      new Vector3(-8, rise * 0.2, 0),
      yaw(new Quaternion(), -Math.PI / 2),
    );
    simulate(state, env, IDLE, 0.3);
    let airborne = 0;

    simulate(state, env, RUN, 2.5, (s) => {
      if (!s.grounded) airborne++;
    });

    expect(state.position.x).toBeGreaterThan(5); // subió la rampa y cruzó la arista
    expect(airborne).toBeLessThanOrEqual(1);
  });

  it('stays grounded while walking into a wall', () => {
    const wall = halfSpaceWorld(new Vector3(1, 0, 0), new Vector3(-1, 0, 0));
    const env = flatGround(wall);
    const state = createCharacter(new Vector3(0, 0, 0), yaw(new Quaternion(), -Math.PI / 2));
    simulate(state, env, IDLE, 0.2);
    let airborne = 0;

    simulate(state, env, WALK, 2, (s) => {
      if (!s.grounded) airborne++;
    });

    expect(airborne).toBe(0);
    expect(state.position.x).toBeLessThan(1); // no atraviesa la pared
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

describe('forgiving jumps', () => {
  /** Meseta a 2 m de altura que termina en x = 0 (borde) sobre suelo plano. */
  function ledge(): MotorEnvironment {
    const geometry = new BufferGeometry();
    const h = 2;
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          ...[-20, h, -10, 0, h, -10, 0, h, 10, -20, h, -10, 0, h, 10, -20, h, 10],
          ...[0, 0, -10, 20, 0, -10, 20, 0, 10, 0, 0, -10, 20, 0, 10, 0, 0, 10],
        ],
        3,
      ),
    );
    return {
      wells: flatGround().wells,
      world: createBvhWorld([new Mesh(geometry, new MeshBasicMaterial())]),
    };
  }

  it('remembers a jump pressed just before landing', () => {
    const env = planet();
    const state = createCharacter(new Vector3(0, R + 0.6, 0), new Quaternion());
    // Cae ~0,6 m (≈ 0,35 s); se pulsa salto 0,05 s antes de tocar el suelo y se mantiene.
    simulate(state, env, IDLE, 0.3);
    simulate(state, env, JUMP, 0.5);

    expect(state.takeoffs).toBeGreaterThanOrEqual(1);
    expect(state.position.length() - R).toBeGreaterThan(0.3); // está saltando, no quieto
  });

  it('still allows jumping for a moment after walking off a ledge', () => {
    const env = ledge();
    const state = createCharacter(new Vector3(-1, 2, 0), yaw(new Quaternion(), -Math.PI / 2));
    simulate(state, env, IDLE, 0.2);
    // Camina hasta pasar el borde y pulsa salto 0,05 s después (3 pasos), aún en el aire.
    for (let i = 0; i < 120 && state.grounded; i++) stepCharacter(state, WALK, env, PHYSICS_STEP);
    expect(state.grounded).toBe(false);
    simulate(state, env, WALK, 3 * PHYSICS_STEP);
    expect(state.grounded).toBe(false);
    expect(state.velocity.y).toBeLessThan(0); // ya está cayendo

    stepCharacter(state, JUMP, env, PHYSICS_STEP);

    expect(state.velocity.y).toBeGreaterThan(3);
  });

  it('does not allow jumping once the coyote time has passed', () => {
    const env = ledge();
    const state = createCharacter(new Vector3(-1, 2, 0), yaw(new Quaternion(), -Math.PI / 2));
    simulate(state, env, IDLE, 0.2);
    for (let i = 0; i < 120 && state.grounded; i++) stepCharacter(state, WALK, env, PHYSICS_STEP);
    simulate(state, env, WALK, 0.2); // más que COYOTE_SECONDS, aún sin llegar abajo

    stepCharacter(state, JUMP, env, PHYSICS_STEP);

    expect(state.grounded).toBe(false);
    expect(state.velocity.y).toBeLessThan(0);
  });
});
