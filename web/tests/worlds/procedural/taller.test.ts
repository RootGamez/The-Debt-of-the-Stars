// El Taller como gigante de gas por código (Fase 11F): islas con su suelo y sus fuentes, nubes sin suelo que matan,
// puentes de luz que solo se pisan a las 7:00 y el anillo de la Pista que lleva a la Sala del Centro.
import { describe, expect, it } from 'vitest';
import { Object3D, PointLight, Quaternion, Scene, Vector3 } from 'three';
import type { MoveIntent } from '../../../src/core/input';
import { PHYSICS_STEP } from '../../../src/data/movement';
import tallerSources from '../../../src/data/pistas/taller.json';
import {
  createCharacter,
  stepCharacter,
  type MotorEnvironment,
} from '../../../src/physics/characterMotor';
import { withEventColliders } from '../../../src/physics/eventColliders';
import { sunkInGas } from '../../../src/physics/gas';
import { gravityAt } from '../../../src/physics/gravity';
import { lookAlong, upOf } from '../../../src/physics/surfaceFrame';
import { findCrossing, gateArrival } from '../../../src/worlds/gates';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { direction, frameAt, type Frame, type Triple } from '../../../src/worlds/procedural/kit';
import { followSun } from '../../../src/worlds/procedural/sun';
import { buildTaller } from '../../../src/worlds/procedural/taller';
import {
  BRIDGE_EVENT,
  CORE_RADIUS,
  GAS_LETHAL_RADIUS,
  GAS_SAFE_RADIUS,
  GIANT_RADIUS,
  ISLANDS,
  islandOf,
  type IslandId,
} from '../../../src/worlds/procedural/tallerShape';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';

const world = buildWorld('taller');
if (!world) throw new Error('El Taller debería construirse por código');
const runtime = createWorldRuntime(world);
const gas = world.info.gas;

/** Del marco de Blender (Z arriba) al de glTF (Y arriba). */
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);
const frameOf = (id: IslandId): Frame => {
  const island = islandOf(id);
  return frameAt({ radius: island.top, groundRadius: () => island.top }, island.lat, island.lon, {
    heading: island.heading,
  });
};
const onIsland = (id: IslandId, p: Triple): Vector3 => toGltf(frameOf(id).point(p));

/** La dirección, en el plano de la isla `from`, hacia el centro de `to` (como los puentes). */
function towards(from: IslandId, to: IslandId): [number, number] {
  const f = frameOf(from);
  const target = direction(islandOf(to).lat, islandOf(to).lon);
  const x = target.dot(new Vector3().setFromMatrixColumn(f.base, 0));
  const y = target.dot(new Vector3().setFromMatrixColumn(f.base, 1));
  const l = Math.hypot(x, y);
  return [x / l, y / l];
}

function envWith(events: readonly string[]): MotorEnvironment {
  return {
    wells: [runtime.well],
    world: withEventColliders(runtime.collision, runtime.eventCollision, () => events),
    water: undefined,
  };
}

/** Anda hacia cada punto en orden; para en cuanto las nubes lo matan. */
function walk(start: Vector3, waypoints: readonly Vector3[], env: MotorEnvironment, limit = 40) {
  const state = createCharacter(start, lookAlong(start.clone().normalize(), new Vector3(0, 1, 0)));
  const bodyUp = new Vector3();
  let reached = 0;
  let seconds = 0;
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      if (sunkInGas(state.position, runtime.well.center, gas)) {
        return { reached, sunk: true, state, seconds };
      }
      upOf(state.body, bodyUp);
      const offset = target.clone().sub(state.position);
      const flat = offset.clone().addScaledVector(bodyUp, -offset.dot(bodyUp));
      if (flat.length() < 0.5) break;
      if (t > limit) return { reached, sunk: false, state, seconds };
      if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(bodyUp, flat));
      const intent: MoveIntent = { x: 0, z: 1, run: false, jump: false };
      stepCharacter(state, intent, env, PHYSICS_STEP);
      seconds += PHYSICS_STEP;
    }
    reached++;
  }
  return { reached, sunk: false, state, seconds };
}

/** De dentro de Montaje, por donde sale el puente, hasta dentro de la Cuna. */
function bridgeRoute(): { start: Vector3; route: Vector3[] } {
  const [ax, ay] = towards('montaje', 'cuna');
  const [bx, by] = towards('cuna', 'montaje');
  const montaje = islandOf('montaje').size - 3;
  const cuna = islandOf('cuna').size - 3;
  const start = onIsland('montaje', [ax * montaje, ay * montaje, 0.4]);
  const end = onIsland('cuna', [bx * cuna, by * cuna, 0.4]);
  const route: Vector3[] = [];
  const from = start.clone().normalize();
  const to = end.clone().normalize();
  const q = new Quaternion().setFromUnitVectors(from, to);
  for (let i = 1; i <= 10; i++) {
    const d = from.clone().applyQuaternion(new Quaternion().slerp(q, i / 10));
    route.push(d.multiplyScalar(start.length() + (end.length() - start.length()) * (i / 10)));
  }
  return { start, route };
}

describe('the Taller built in code', () => {
  it('keeps the world data and adds its deadly layer of gas', () => {
    expect(world.info).toMatchObject({
      id: 'taller',
      radius: GIANT_RADIUS,
      gravity: 0.6,
      clockRate: 0.85,
      gas: { lethal: GAS_LETHAL_RADIUS, safe: GAS_SAFE_RADIUS },
    });
  });

  it('keeps every source of the clue graph, the arms, the model of the core and the lights', () => {
    expect(world.markers.interactions.map((i) => i.clueId).sort()).toEqual(
      tallerSources.map((s) => s.id).sort(),
    );
    const animated = world.markers.animated.map((a) => [a.object.name, a.event]);
    expect(animated).toEqual(
      expect.arrayContaining([
        ['ANIM_brazo_0', undefined],
        ['ANIM_brazo_3', undefined],
        ['ANIM_maqueta_nucleo', BRIDGE_EVENT],
      ]),
    );
    expect(world.markers.eventProps.map((p) => p.object.name).sort()).toEqual([
      'EVT_Taller_Puentes',
      'EVT_secuencia_fabrica_Luces',
    ]);
    expect([...world.markers.spawns.keys()].sort()).toEqual(['SPAWN_Montaje', 'SPAWN_Prueba']);
  });

  it('wakes you up on the Assembly island, well above the clouds', () => {
    const feet = runtime.spawn.feet;
    expect(feet.length()).toBeGreaterThan(GIANT_RADIUS + 10);
    expect(feet.distanceTo(onIsland('montaje', [0, 0, 0]))).toBeLessThan(islandOf('montaje').size);
  });

  it('puts every source on solid ground, on an island or on the core of the centre', () => {
    for (const { object, clueId } of world.markers.interactions) {
      const p = object.getWorldPosition(new Vector3());
      const down = p.clone().normalize().negate();
      const ground = runtime.collision.raycast(p, down, 3);
      expect(ground, clueId).not.toBeNull();
      expect(sunkInGas(p, runtime.well.center, gas), clueId).toBe(false);
    }
  });

  it('has nothing to stand on under the clouds', () => {
    const between = toGltf(direction(-30, 50).multiplyScalar(GIANT_RADIUS + 5));
    const down = between.clone().normalize().negate();
    expect(runtime.collision.raycast(between, down, 60)).toBeNull();
    expect(sunkInGas(between.clone().setLength(GIANT_RADIUS - 8), runtime.well.center, gas)).toBe(
      true,
    );
  });

  it('keeps the islands apart and pulls towards the giant on each of them', () => {
    for (const island of ISLANDS) {
      const top = onIsland(island.id, [0, 0, 0]);
      const pull = gravityAt(top, [runtime.well], new Vector3());
      expect(pull.clone().normalize().dot(top.clone().normalize())).toBeCloseTo(-1, 6);
      for (const other of ISLANDS) {
        if (other === island) continue;
        const gap = top.distanceTo(onIsland(other.id, [0, 0, 0]));
        expect(gap).toBeGreaterThan(island.size + other.size + 10);
      }
    }
  });
});

describe('falling and the light bridges of 7:00', () => {
  it('kills you when you walk off an island into the clouds', () => {
    const { start, route } = bridgeRoute();
    const result = walk(start, route, envWith([]));
    expect(result.sunk).toBe(true);
    expect(result.reached).toBeLessThan(route.length);
  });

  it('lets you walk to the next island over the bridge while the sequence lasts', () => {
    const { start, route } = bridgeRoute();
    const result = walk(start, route, envWith([BRIDGE_EVENT]));
    expect(result.sunk).toBe(false);
    expect(result.reached).toBe(route.length);
    expect(result.state.position.distanceTo(onIsland('cuna', [0, 0, 0]))).toBeLessThan(
      islandOf('cuna').size,
    );
  });

  it('links all five islands, one after the other', () => {
    expect(runtime.eventCollision.map((e) => e.event)).toEqual([BRIDGE_EVENT]);
    ISLANDS.forEach((island, i) => {
      const next = ISLANDS[i + 1];
      if (!next) return;
      // A medio camino entre dos islas hay puente debajo (solo en su evento).
      const middle = onIsland(island.id, [0, 0, 0])
        .add(onIsland(next.id, [0, 0, 0]))
        .multiplyScalar(0.5);
      const above = middle.clone().setLength(Math.max(island.top, next.top) + 4);
      const down = above.clone().normalize().negate();
      const lit = envWith([BRIDGE_EVENT]).world as typeof runtime.collision;
      expect(lit.raycast(above, down, 20), `${island.id} → ${next.id}`).not.toBeNull();
      expect(runtime.collision.raycast(above, down, 20)).toBeNull();
    });
  });
});

describe('the teleporter of the Test Track and the Centre Room', () => {
  const ring = runtime.gates.find((g) => g.name === 'PASO_Pista');
  const back = runtime.gates.find((g) => g.name === 'PASO_Centro');

  it('locks the ring of the track and leaves the way back open', () => {
    expect(ring).toMatchObject({ target: 'PASO_Centro', lock: 'pista' });
    expect(back).toMatchObject({ target: 'PASO_Pista', lock: undefined });
  });

  it('lets you through only when the game opens it', () => {
    if (!ring) throw new Error('falta el anillo de la Pista');
    const from = ring.position
      .clone()
      .addScaledVector(ring.up, 1)
      .addScaledVector(ring.forward, -0.3);
    const to = from.clone().addScaledVector(ring.forward, 0.6);
    expect(findCrossing(from, to, runtime.gates, (g) => g.lock === undefined)).toBeUndefined();
    expect(findCrossing(from, to, runtime.gates)?.name).toBe('PASO_Pista');
  });

  it('takes you to the core, safe from the clouds, with its pull towards the centre', () => {
    if (!back) throw new Error('falta el anillo del Centro');
    const arrival = gateArrival(back);
    const above = arrival.feet.clone().addScaledVector(arrival.up, 2);
    const distance = runtime.collision.raycast(above, arrival.up.clone().negate(), 8);
    expect(distance).not.toBeNull();
    const landing = above.addScaledVector(arrival.up, -(distance ?? 0));
    expect(landing.length()).toBeCloseTo(CORE_RADIUS, 0);
    expect(sunkInGas(landing, runtime.well.center, gas)).toBe(false);
    const pull = gravityAt(landing, [runtime.well], new Vector3());
    expect(pull.dot(landing)).toBeLessThan(0);
  });

  it('brings you back onto the track, on the island', () => {
    if (!ring) throw new Error('falta el anillo de la Pista');
    const { feet } = gateArrival(ring);
    expect(feet.distanceTo(onIsland('pista', [0, 0, 0]))).toBeLessThan(islandOf('pista').size - 2);
  });
});

describe('the light of a spinning world', () => {
  it('follows the star around the frame of the world before drawing', () => {
    const scene = new Scene();
    const light = new PointLight();
    light.position.set(0, 0, 500);
    const pivot = new Object3D();
    pivot.rotation.y = Math.PI / 2;
    const object = new Object3D();
    pivot.add(object);
    scene.add(light, pivot);
    scene.updateMatrixWorld(true);
    const sun = new Vector3(1, 0, 0);
    followSun(object, [sun]);
    object.onBeforeRender(
      ...([undefined, scene] as unknown as Parameters<Object3D['onBeforeRender']>),
    );
    // El mundo giró 90° alrededor de Y: la estrella, en +Z de la escena, queda en −X de su marco.
    expect(sun.x).toBeCloseTo(-1, 6);
  });

  it('builds without the sky for quick checks', () => {
    const bare = buildTaller({ sky: false });
    expect(bare.getObjectByName('taller_Gigante')).toBeUndefined();
    expect(buildTaller().getObjectByName('taller_Gigante')).toBeDefined();
  });
});
