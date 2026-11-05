// Cicatriz hueca por código (Fase 11H): cuencos que dan a la cavidad, la cara interior con la cabeza hacia el
// centro, la máquina alrededor del micro agujero, la Cripta bajo la roca y el anillo con sus fragmentos.
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { MoveIntent } from '../../../src/core/input';
import { Player } from '../../../src/core/player';
import { PHYSICS_STEP } from '../../../src/data/movement';
import cicatrizSources from '../../../src/data/pistas/cicatriz.json';
import { createCharacter, stepCharacter } from '../../../src/physics/characterMotor';
import { gravityAt, insideCavity, surfaceUp } from '../../../src/physics/gravity';
import { spawnOnGround } from '../../../src/physics/spawn';
import { lookAlong, upOf } from '../../../src/physics/surfaceFrame';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { outsideFrame } from '../../../src/worlds/procedural/cicatrizKit';
import {
  biteAxis,
  BITES,
  CAVITY_LIMIT,
  ENGINE_AXIS,
  ENGINE_RADIUS,
  eyeAngle,
  GREAT_BITE,
  INNER_RADIUS,
  INNER_SITES,
  OUTER_RADIUS,
  OUTER_SITES,
  outerGround,
  outerGroundRadius,
  rimAngle,
} from '../../../src/worlds/procedural/cicatrizShape';
import { angleBetween, direction, type Triple } from '../../../src/worlds/procedural/kit';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';

const DEG = Math.PI / 180;
import { environmentOf } from '../../../src/worlds/worldRuntime';

const world = buildWorld('cicatriz');
if (!world) throw new Error('Cicatriz debería construirse por código');
const runtime = createWorldRuntime(world);

/** Del marco de Blender (Z arriba) al de glTF (Y arriba). */
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);

/** La explanada de la Primera Puerta (la Cripta baja desde ella, hacia +Y del marco). */
const primera = outsideFrame(OUTER_SITES.primera.lat, OUTER_SITES.primera.lon, {
  heading: 90,
  footprint: 7,
  ground: 'mean',
});
const onPrimera = (p: Triple): Vector3 => toGltf(primera.point(p));

/** Anda hacia cada punto en orden; devuelve cuántos alcanzó. */
function walk(start: Vector3, waypoints: readonly [Vector3, ...Vector3[]], limit = 30) {
  const env = environmentOf(runtime);
  const up = surfaceUp(start, runtime.well);
  const state = createCharacter(start, lookAlong(up, waypoints[0].clone().sub(start)));
  const bodyUp = new Vector3();
  let reached = 0;
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      upOf(state.body, bodyUp);
      const offset = target.clone().sub(state.position);
      const flat = offset.clone().addScaledVector(bodyUp, -offset.dot(bodyUp));
      if (flat.length() < 0.6) break;
      if (t > limit) return { reached, state };
      state.body.copy(lookAlong(bodyUp, flat));
      const intent: MoveIntent = { x: 0, z: 1, run: false, jump: false };
      stepCharacter(state, intent, env, PHYSICS_STEP);
    }
    reached++;
  }
  return { reached, state };
}

describe('Cicatriz built in code', () => {
  it('is a hollow world whose cavity starts just under the inner face, with the core tide', () => {
    expect(world.info).toMatchObject({
      id: 'cicatriz',
      radius: OUTER_RADIUS,
      innerRadius: INNER_RADIUS,
      cavityLimit: CAVITY_LIMIT,
      cavityTide: 'nucleo',
    });
  });

  it('keeps every source of the clue graph and the old motor with its place outside', () => {
    expect(world.markers.interactions.map((i) => i.clueId).sort()).toEqual(
      cicatrizSources.map((s) => s.id).sort(),
    );
    const names = new Set<string>();
    world.scene.traverse((o) => names.add(o.name));
    expect(names).toContain('cicatriz_MotorViejo');
    expect(names).toContain('cicatriz_MotorFuera');
    expect(world.markers.eventProps.map((p) => p.object.name)).toEqual([
      'EVT_pulso_cicatriz_Nucleo',
    ]);
  });

  it('builds the same world every time', () => {
    const again = buildWorld('cicatriz');
    expect(again?.scene.children[0]?.userData.stats).toEqual(
      world.scene.children[0]?.userData.stats,
    );
  });

  it('wakes you up on the Edge, on the outside', () => {
    expect([...world.markers.spawns.keys()].sort()[0]).toBe('SPAWN_Borde');
    expect(runtime.spawn.feet.length()).toBeGreaterThan(OUTER_RADIUS - 4);
    expect(insideCavity(runtime.spawn.feet, runtime.well)).toBe(false);
  });
});

describe('the bites', () => {
  it('open every bowl into the cavity, and never on the far side of the planet', () => {
    for (const b of BITES) {
      const axis = biteAxis(b);
      expect(outerGround(axis).hole, b.id).toBe(true);
      expect(Number.isFinite(eyeAngle(b)), b.id).toBe(true);
      expect(outerGround(axis.clone().negate()).bite, b.id).not.toBe(b);
    }
  });

  it('keep the outside sites on whole ground', () => {
    for (const [id, site] of Object.entries(OUTER_SITES)) {
      const d = direction(site.lat, site.lon);
      for (const b of BITES) {
        if (id === 'pozo') continue; // el Pozo atraviesa la cáscara a propósito
        expect(angleBetween(d, biteAxis(b)), `${id}/${b.id}`).toBeGreaterThan(rimAngle(b));
      }
      expect(outerGroundRadius(d), id).toBeGreaterThan(OUTER_RADIUS - 3);
    }
  });

  it('let the ship fall through the Great Bite along the engine axis to the core', () => {
    const axis = toGltf(ENGINE_AXIS.clone());
    const side = new Vector3(0, 1, 0).cross(axis).normalize();
    const other = axis.clone().cross(side).normalize();
    for (const offset of [new Vector3(), side.multiplyScalar(2), other.multiplyScalar(2)]) {
      const from = axis.clone().multiplyScalar(100).add(offset);
      const hit = runtime.collision.raycast(from, axis.clone().negate(), 100 - ENGINE_RADIUS - 3);
      expect(hit).toBeNull();
    }
    expect(rimAngle(GREAT_BITE)).toBeGreaterThan(eyeAngle(GREAT_BITE));
  });
});

describe('two gravities', () => {
  it('pulls inward outside and outward on the inner face', () => {
    const out = toGltf(direction(OUTER_SITES.puesto.lat, OUTER_SITES.puesto.lon)).multiplyScalar(
      81,
    );
    const pullOut = gravityAt(out, [runtime.well], new Vector3());
    expect(pullOut.normalize().dot(out.clone().normalize())).toBeLessThan(-0.99);
    const site = INNER_SITES.partidas;
    const inside = toGltf(direction(site.lat, site.lon)).multiplyScalar(INNER_RADIUS - 1);
    const pullIn = gravityAt(inside, [runtime.well], new Vector3());
    expect(pullIn.normalize().dot(inside.clone().normalize())).toBeGreaterThan(0.99);
  });

  it('puts every source on solid ground under its own gravity', () => {
    for (const { object, clueId } of world.markers.interactions) {
      const p = object.getWorldPosition(new Vector3());
      const down = surfaceUp(p, runtime.well).negate();
      expect(runtime.collision.raycast(p, down, 3.5), clueId).not.toBeNull();
    }
  });

  it('lands every spawn on its ground', () => {
    for (const [name, marker] of world.markers.spawns) {
      const spot = spawnOnGround(marker, runtime.collision, runtime.well);
      expect(spot.feet.distanceTo(marker.getWorldPosition(new Vector3())), name).toBeLessThan(1.6);
    }
  });

  it('links outside, inner face and the engine band with folded gates', () => {
    const byName = new Map(runtime.gates.map((g) => [g.name, g]));
    const at = (name: string): Vector3 => {
      const gate = byName.get(name);
      if (!gate) throw new Error(`falta ${name}`);
      return gate.position;
    };
    expect([...byName.keys()].sort()).toEqual(['PASO_Eje', 'PASO_Fondo', 'PASO_Pozo', 'PASO_Sala']);
    for (const gate of runtime.gates) {
      expect(byName.get(gate.target)?.target, gate.name).toBe(gate.name);
    }
    expect(insideCavity(at('PASO_Pozo'), runtime.well)).toBe(false);
    for (const name of ['PASO_Fondo', 'PASO_Eje', 'PASO_Sala']) {
      expect(insideCavity(at(name), runtime.well), name).toBe(true);
    }
    expect(at('PASO_Sala').length()).toBeCloseTo(ENGINE_RADIUS, 0);
  });
});

describe('the Crypt of the Throat', () => {
  it('stays under the rock, ceiling included', () => {
    const ceiling = 0.2 - 12 + 5.8;
    for (const x of [-6.2, 0, 6.2]) {
      for (const y of [17, 22, 27]) {
        const p = primera.point([x, y, ceiling]);
        expect(p.length(), `${x},${y}`).toBeLessThan(outerGroundRadius(p.clone().normalize()));
      }
    }
  });

  it('can be walked down into, from the plaza to the seal', () => {
    const start = onPrimera([0, 1.5, 1.2]);
    const route: [Vector3, ...Vector3[]] = [
      onPrimera([0, 4, 0]),
      onPrimera([0, 16.5, -11.2]),
      onPrimera([0, 21, -11.2]),
    ];
    const { reached, state } = walk(start, route);
    expect(reached).toBe(route.length);
    expect(state.position.length()).toBeLessThan(OUTER_RADIUS - 6);
  });
});

describe('the ring', () => {
  it('has rocks that do not collide and four fragments to stand on', () => {
    const fragments = [...world.markers.spawns.keys()].filter((n) => n.startsWith('SPAWN_Isla_'));
    expect(fragments.sort()).toEqual([
      'SPAWN_Isla_Andamio',
      'SPAWN_Isla_Faro',
      'SPAWN_Isla_Losa',
      'SPAWN_Isla_Muro',
    ]);
    expect(world.markers.colliders.some((c) => c.name.includes('Anillo'))).toBe(false);
    expect(world.markers.animated.map((a) => a.object.name)).toContain('ANIM_anillo');
  });
});

describe('falling into a bowl on foot', () => {
  /** Deja caer al personaje (sin tocar nada) unos segundos desde `start`. */
  /** Deja caer al personaje desde `start`; con `towards`, además anda hacia ese punto todo el rato. */
  function drop(start: Vector3, seconds: number, towards?: Vector3) {
    const env = environmentOf(runtime);
    const state = createCharacter(
      start,
      lookAlong(surfaceUp(start, runtime.well), new Vector3(0, 0, 1)),
    );
    const intent: MoveIntent = { x: 0, z: towards ? 1 : 0, run: false, jump: false };
    const bodyUp = new Vector3();
    let radiusFlips = 0;
    let wasInside = state.position.length() < CAVITY_LIMIT;
    for (let t = 0; t < seconds; t += PHYSICS_STEP) {
      if (towards && state.cavitySide !== 'inside') {
        upOf(state.body, bodyUp);
        const offset = towards.clone().sub(state.position);
        const flat = offset.addScaledVector(bodyUp, -offset.dot(bodyUp));
        if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(bodyUp, flat));
        stepCharacter(state, intent, env, PHYSICS_STEP);
      } else {
        stepCharacter(state, { ...intent, z: 0 }, env, PHYSICS_STEP);
      }
      const inside = state.position.length() < CAVITY_LIMIT;
      if (inside !== wasInside) radiusFlips++;
      wasInside = inside;
    }
    return { state, radiusFlips };
  }

  it('drops you through an eye onto the inner face, beside it, landing on your feet instead of bobbing in the hole', () => {
    const above = toGltf(biteAxis(GREAT_BITE)).multiplyScalar(66);
    const { state, radiusFlips } = drop(above, 8);
    expect(state.grounded).toBe(true);
    expect(state.cavitySide).toBe('inside');
    expect(state.position.length()).toBeGreaterThan(INNER_RADIUS - 3);
    expect(state.position.length()).toBeLessThan(INNER_RADIUS + 0.5);
    expect(radiusFlips).toBeLessThan(3);
    // De pie: la cabeza hacia el centro, sin teletransporte (solo la gravedad del ojo).
    const head = upOf(state.body, new Vector3());
    expect(head.dot(state.position.clone().negate().normalize())).toBeGreaterThan(0.9);
  });

  it('lets you stand still on the rim of an eye', () => {
    for (const b of BITES) {
      const d = new Vector3();
      let found = false;
      // Un punto del fondo del cuenco entre el ojo (60 m) y el límite (61 m), si lo hay.
      for (let extra = 0.2; extra < 3 && !found; extra += 0.2) {
        const axis = biteAxis(b);
        const helper = Math.abs(axis.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
        const side = helper.cross(axis).normalize();
        const angle = eyeAngle(b) + extra * DEG;
        d.copy(axis).multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
        const r = outerGroundRadius(d);
        found = r > INNER_RADIUS && r < CAVITY_LIMIT;
      }
      if (!found) continue;
      const start = toGltf(d).multiplyScalar(outerGroundRadius(d) + 0.2);
      const { state, radiusFlips } = drop(start, 4);
      expect(radiusFlips, b.id).toBeLessThan(3);
      expect(state.takeoffs, b.id).toBeLessThan(3);
      return;
    }
    throw new Error('ningún cuenco tiene fondo entre el ojo y el límite');
  });

  it('never traps you in a bowl: from any wall you can walk down into the eye and come out on the inner face', () => {
    const stuck: string[] = [];
    for (const b of BITES) {
      const axis = biteAxis(b);
      const helper = Math.abs(axis.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
      const side = helper.cross(axis).normalize();
      for (const bearing of [0, 2.1, 4.2]) {
        const across = side.clone().applyAxisAngle(axis, bearing);
        // A media pared: entre el borde del cuenco y el ojo.
        const angle = (rimAngle(b) + eyeAngle(b)) / 2;
        const d = axis
          .clone()
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(across, Math.sin(angle));
        const start = toGltf(d).multiplyScalar(outerGroundRadius(d) + 0.3);
        const { state } = drop(start, 25, toGltf(axis).multiplyScalar(INNER_RADIUS - 5));
        const ok = state.cavitySide === 'inside' && state.grounded;
        if (!ok) stuck.push(`${b.id}@${bearing}: r=${state.position.length().toFixed(1)}`);
      }
    }
    expect(stuck).toEqual([]);
  });

  it('keeps you upright and on the ground on the inner face right by every eye', () => {
    const tilted: string[] = [];
    for (const b of BITES) {
      const axis = biteAxis(b);
      const helper = Math.abs(axis.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
      const side = helper.cross(axis).normalize();
      for (const extra of [0.3, 0.8, 1.5]) {
        const angle = eyeAngle(b) + extra * DEG;
        const d = axis
          .clone()
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(side, Math.sin(angle));
        const start = toGltf(d).multiplyScalar(INNER_RADIUS - 0.3);
        const { state } = drop(start, 3);
        const head = upOf(state.body, new Vector3());
        const upright = head.dot(state.position.clone().negate().normalize());
        if (!state.grounded || upright < 0.95)
          tilted.push(`${b.id}+${extra}: ${upright.toFixed(2)}`);
      }
    }
    expect(tilted).toEqual([]);
  });

  it('lets you work in the Engine Room, 12 m from the centre, without being sent back', () => {
    const marker = world.markers.spawns.get('SPAWN_Motor');
    if (!marker) throw new Error('falta SPAWN_Motor');
    const player = new Player(
      spawnOnGround(marker, runtime.collision, runtime.well),
      environmentOf(runtime),
      runtime.well,
    );
    for (let k = 0; k < 120; k++)
      player.step({ x: 0, z: 0, run: false, jump: false }, PHYSICS_STEP);
    expect(player.respawnCount).toBe(0);
    expect(player.state.position.length()).toBeCloseTo(ENGINE_RADIUS, 0);
  });
});
