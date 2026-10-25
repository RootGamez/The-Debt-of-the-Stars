import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { createBvhWorld, type BvhWorld } from '../../src/physics/bvhWorld';
import { createCapsule, placeCapsule } from '../../src/physics/collisionWorld';
import { createCharacter, stepCharacter } from '../../src/physics/characterMotor';
import { wellForWorld } from '../../src/physics/gravity';
import { parseWorld, type LoadedWorld } from '../../src/worlds/loadWorld';
import { PHYSICS_STEP, PLAYER_HEIGHT } from '../../src/data/movement';
import { spawnOnGround } from '../../src/physics/spawn';

const UMBRAL_GLB = fileURLToPath(new URL('../../public/models/umbral.glb', import.meta.url));
const IDLE = { x: 0, z: 0, run: false, jump: false };
const WALK = { x: 0, z: 1, run: false, jump: false };

let umbral: LoadedWorld;
let world: BvhWorld;

beforeAll(async () => {
  const bytes = readFileSync(UMBRAL_GLB);
  umbral = await parseWorld(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    'umbral',
  );
  world = createBvhWorld(umbral.markers.colliders);
});

describe('createBvhWorld', () => {
  it('rejects a world without collision meshes', () => {
    expect(() => createBvhWorld([])).toThrow(/COL_/);
  });

  it('bakes the collider transform into world space', () => {
    const box = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    box.position.set(10, 0, 0);
    box.updateMatrixWorld(true);

    const boxWorld = createBvhWorld([box]);

    expect(boxWorld.raycast(new Vector3(20, 0, 0), new Vector3(-1, 0, 0), 100)).toBeCloseTo(9);
  });
});

describe('raycast on Umbral', () => {
  it('hits the ground when casting towards the center', () => {
    const origin = new Vector3(0, 300, 0);

    const distance = world.raycast(origin, new Vector3(0, -1, 0), 1000);

    expect(distance).not.toBeNull();
    const surfaceRadius = 300 - (distance ?? 0);
    expect(surfaceRadius).toBeGreaterThan(80);
    expect(surfaceRadius).toBeLessThan(110);
  });

  it('returns null when nothing is hit', () => {
    expect(world.raycast(new Vector3(0, 300, 0), new Vector3(0, 1, 0), 1000)).toBeNull();
  });
});

describe('resolve on Umbral', () => {
  it('pushes a capsule sunk into the ground back out, outwards', () => {
    const up = new Vector3(0, 1, 0);
    const surface = 300 - (world.raycast(new Vector3(0, 300, 0), up.clone().negate(), 1000) ?? 0);
    const capsule = placeCapsule(createCapsule(0.35), new Vector3(0, surface - 0.2, 0), up, 1.8);
    const correction = new Vector3();

    const hit = world.resolve(capsule, correction);

    expect(hit).toBe(true);
    expect(correction.clone().normalize().dot(up)).toBeGreaterThan(0.5);
    expect(capsule.start.y).toBeCloseTo(surface - 0.2 + 0.35); // la cápsula no se modifica
  });

  it('reports no contact for a capsule floating above the ground', () => {
    const up = new Vector3(0, 1, 0);
    const capsule = placeCapsule(createCapsule(0.35), new Vector3(0, 200, 0), up, 1.8);
    const correction = new Vector3(1, 1, 1);

    expect(world.resolve(capsule, correction)).toBe(false);
    expect(correction.toArray()).toEqual([0, 0, 0]);
  });
});

describe('the player on the real Umbral', () => {
  it('spawns on the ground below SPAWN_LaBoca and stays there', () => {
    const spawn = umbral.markers.spawns.get('SPAWN_LaBoca');
    if (!spawn) throw new Error('falta SPAWN_LaBoca');
    const env = { wells: [wellForWorld(umbral.info)], world };
    const start = spawnOnGround(spawn, world, wellForWorld(umbral.info).center);
    const state = createCharacter(start.feet, start.body);

    for (let i = 0; i < 120; i++) stepCharacter(state, IDLE, env, PHYSICS_STEP);

    expect(state.grounded).toBe(true);
    expect(state.position.distanceTo(start.feet)).toBeLessThan(0.2);
  });

  it('walks for ten seconds without falling through the terrain', () => {
    const spawn = umbral.markers.spawns.get('SPAWN_LaBoca');
    if (!spawn) throw new Error('falta SPAWN_LaBoca');
    const env = { wells: [wellForWorld(umbral.info)], world };
    const start = spawnOnGround(spawn, world, wellForWorld(umbral.info).center);
    const state = createCharacter(start.feet, start.body);
    const down = new Vector3();
    let worstGap = Infinity;

    for (let i = 0; i < 600; i++) {
      stepCharacter(state, WALK, env, PHYSICS_STEP);
      down.copy(state.position).normalize().negate();
      const origin = state.position.clone().addScaledVector(down, -PLAYER_HEIGHT);
      const toGround = world.raycast(origin, down, 50);
      if (toGround !== null) worstGap = Math.min(worstGap, toGround - PLAYER_HEIGHT);
    }

    expect(worstGap).toBeGreaterThan(-0.1); // los pies nunca quedan bajo el suelo
    expect(state.position.distanceTo(start.feet)).toBeGreaterThan(30);
  });
});
