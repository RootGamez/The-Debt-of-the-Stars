import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Player } from '../../src/core/player';
import { PHYSICS_STEP } from '../../src/data/movement';
import { forwardOf, upOf } from '../../src/physics/surfaceFrame';
import type { GravityWell } from '../../src/physics/gravity';
import { sphereWorld } from '../helpers/testWorlds';

const IDLE = { x: 0, z: 0, run: false, jump: false };
const R = 90;
const well: GravityWell = { center: new Vector3(), radius: R, strength: 9.8, range: 2 * R };
const env = { wells: [well], world: sphereWorld(new Vector3(), R) };
const spawn = { feet: new Vector3(0, R, 0), body: new Quaternion() };

function newPlayer(): Player {
  return new Player(spawn, env, well);
}

describe('Player look', () => {
  it('turns left and right around the local up', () => {
    const player = newPlayer();

    player.look(Math.PI / 2, 0);

    expect(forwardOf(player.state.body).x).toBeCloseTo(-1);
    expect(upOf(player.state.body).y).toBeCloseTo(1);
  });

  it('accumulates pitch and clamps it', () => {
    const player = newPlayer();

    player.look(0, 0.5);
    player.look(0, 10);

    expect(player.pitch).toBeCloseTo((85 * Math.PI) / 180);
  });
});

describe('Player safety respawn', () => {
  it('respawns when it goes too far from the planet', () => {
    const player = newPlayer();
    player.state.position.set(0, R * 5, 0);

    player.step(IDLE, PHYSICS_STEP);

    expect(player.state.position.distanceTo(spawn.feet)).toBeLessThan(0.5);
    expect(player.respawnCount).toBe(1);
  });

  it('respawns when it ends up deep inside the planet', () => {
    // Simula un fallo de colisión: un mundo que nunca empuja hacia fuera.
    const noCollision = {
      resolve: (_c: unknown, correction: Vector3) => (correction.set(0, 0, 0), false),
    };
    const player = new Player(spawn, { wells: [well], world: noCollision }, well);
    player.state.position.set(0, R * 0.3, 0);

    player.step(IDLE, PHYSICS_STEP);

    expect(player.respawnCount).toBe(1);
  });

  it('does not respawn during normal play and resets velocity when it does', () => {
    const player = newPlayer();
    for (let i = 0; i < 60; i++) player.step(IDLE, PHYSICS_STEP);
    player.state.position.set(0, R * 5, 0);
    player.state.velocity.set(0, 50, 0);

    player.step(IDLE, PHYSICS_STEP);

    expect(player.respawnCount).toBe(1);
    expect(player.state.velocity.length()).toBeLessThan(1);
  });
});

describe('Player interpolation', () => {
  it('blends between the previous and current physics states', () => {
    const player = newPlayer();
    player.step(IDLE, PHYSICS_STEP);
    const previous = player.state.position.clone();
    player.state.velocity.set(0, 0, -6);
    player.step(IDLE, PHYSICS_STEP);
    const current = player.state.position.clone();

    const halfway = player.interpolatedFeet(0.5, new Vector3());

    expect(halfway.distanceTo(previous.clone().lerp(current, 0.5))).toBeLessThan(1e-6);
  });
});

describe('Player reset for a new loop', () => {
  it('goes back to the spawn without counting as a safety respawn', () => {
    const player = newPlayer();
    player.state.position.set(5, R, 5);
    player.look(0, 0.4);

    player.reset();

    expect(player.state.position.distanceTo(spawn.feet)).toBeLessThan(1e-9);
    expect(player.pitch).toBe(0);
    expect(player.respawnCount).toBe(0);
  });
});
