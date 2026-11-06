// El Archivo de las Puertas por código (Fase 11): cumple el contrato de puertas.glb (raíz, COL_, INT_, SPAWN_, los
// planos sueltos y las vistas de casa), se anda sin saltar entre sus sitios y su cielo gira.
import { describe, expect, it } from 'vitest';
import { Vector3, type Object3D } from 'three';
import type { MoveIntent } from '../../../src/core/input';
import { PHYSICS_STEP } from '../../../src/data/movement';
import {
  createCharacter,
  stepCharacter,
  type MotorEnvironment,
} from '../../../src/physics/characterMotor';
import { lookAlong, upOf } from '../../../src/physics/surfaceFrame';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { isMesh } from '../../../src/worlds/markers';
import { direction } from '../../../src/worlds/procedural/kit';
import { buildPuertas } from '../../../src/worlds/procedural/puertas';
import { ripplePhase } from '../../../src/worlds/procedural/puertasFloor';
import { PUERTAS_RADIUS, SITES, puertasGround } from '../../../src/worlds/procedural/puertasShape';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';

const world = buildWorld('puertas');
if (!world) throw new Error('El Archivo de las Puertas debería construirse por código');
const find = (name: string): Object3D | undefined => world.scene.getObjectByName(name);
const runtime = createWorldRuntime(world);
const env: MotorEnvironment = {
  wells: [runtime.well],
  world: runtime.collision,
  water: runtime.water,
};
const positionOf = (object: Object3D): Vector3 => object.getWorldPosition(new Vector3());
const source = (id: string): Vector3 => {
  const found = world.markers.interactions.find((i) => i.clueId === id);
  if (!found) throw new Error(`falta ${id}`);
  return positionOf(found.object);
};

/** Anda hacia cada punto en orden, como el jugador: sin saltar nunca. */
function walk(start: Vector3, waypoints: readonly Vector3[], limit = 60): number {
  const state = createCharacter(start, lookAlong(start.clone().normalize(), new Vector3(0, 1, 0)));
  const up = new Vector3();
  let reached = 0;
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      upOf(state.body, up);
      const offset = target.clone().sub(state.position);
      const flat = offset.clone().addScaledVector(up, -offset.dot(up));
      if (flat.length() < 0.9) break;
      if (t > limit) return reached;
      if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(up, flat));
      const intent: MoveIntent = { x: 0, z: 1, run: false, jump: false };
      stepCharacter(state, intent, env, PHYSICS_STEP);
    }
    reached++;
  }
  return reached;
}

describe('Puertas world contract', () => {
  it('carries the same root data as the exported model', () => {
    expect(world.info).toEqual({
      id: 'puertas',
      radius: 30,
      gravity: 0.5,
      clockRate: 1,
      ambient: { color: 0x8c96c8, intensity: 0.7 },
    });
  });

  it('has the terrain and the places as colliders', () => {
    expect(find('COL_puertas_Terreno')).toBeDefined();
    expect(find('COL_puertas_Lugares')).toBeDefined();
  });

  it('offers the three sources of the epilogue and three that tell the place', () => {
    expect(world.markers.interactions.map((i) => i.clueId).sort()).toEqual([
      'puertas.bocas',
      'puertas.cielo',
      'puertas.ofrendas',
      'puertas.planos',
      'puertas.primera',
      'puertas.rastros',
    ]);
  });

  it('keeps the plans loose on the Bench, by the plans source, so the game can hide them', () => {
    const plans = find('puertas_Planos');
    expect(plans).toBeDefined();
    if (!plans) return;
    expect(isMesh(plans)).toBe(true);
    expect(positionOf(plans).distanceTo(source('puertas.planos'))).toBeLessThan(2);
  });

  it('gives the three open mouths of home their own view, each in its own colour', () => {
    const colours = [0, 1, 2].map((k) => {
      const view = find(`puertas_VistaCasa_${String(k)}`);
      expect(view && isMesh(view)).toBe(true);
      return view && isMesh(view) ? JSON.stringify(view.material) : '';
    });
    expect(new Set(colours).size).toBe(3);
    expect(find('puertas_VistaCasa_3')).toBeUndefined();
  });

  it('wakes the player at the arrival, standing on the ground', () => {
    const spawn = world.markers.spawns.get('SPAWN_Puertas');
    expect(spawn).toBeDefined();
    if (!spawn) return;
    const at = positionOf(spawn);
    const arrival = direction(SITES.llegada.lat, SITES.llegada.lon);
    expect(
      at
        .clone()
        .normalize()
        .angleTo(new Vector3(arrival.x, arrival.z, -arrival.y)),
    ).toBeLessThan(0.1);
    expect(at.length() - PUERTAS_RADIUS).toBeGreaterThan(0.5);
    expect(at.length() - PUERTAS_RADIUS).toBeLessThan(1.5);
  });

  it('is built deterministically', () => {
    const names = (scene: Object3D): string[] => {
      const found: string[] = [];
      scene.traverse((o) => {
        if (/^(INT_|SPAWN_|COL_|ANIM_|puertas_)/.test(o.name)) found.push(o.name);
      });
      return found.sort();
    };
    expect(names(buildPuertas())).toEqual(names(world.scene));
  });

  it('keeps the triangle count reasonable', () => {
    let triangles = 0;
    world.scene.traverse((o) => {
      if (!isMesh(o) || o.name.startsWith('COL_')) return;
      const g = o.geometry;
      triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    expect(triangles).toBeLessThan(120000);
  });
});

describe('Puertas, outside time', () => {
  it('turns the mouths of the sky and the horizon', () => {
    const names = world.markers.animated.map((a) => a.object.name);
    expect(names).toEqual(
      expect.arrayContaining(['ANIM_cielo_0', 'ANIM_cielo_1', 'ANIM_cielo_2', 'ANIM_horizonte']),
    );
    for (const part of world.markers.animated) expect(part.spin).not.toBe(0);
  });

  it('keeps every site flat, so nothing floats or sinks', () => {
    for (const s of Object.values(SITES)) {
      expect(puertasGround(direction(s.lat, s.lon))).toBeCloseTo(PUERTAS_RADIUS, 6);
    }
  });

  it('moves the rings of light away from home as time goes by', () => {
    expect(ripplePhase(5, 0)).toBeCloseTo(ripplePhase(5 + 0.7, 1), 6);
    expect(ripplePhase(5, 0)).not.toBeCloseTo(ripplePhase(5, 1), 2);
  });
});

describe('Puertas on foot (without jumping)', () => {
  it('walks from the arrival to the lectern and the Bench of home', () => {
    const spawn = world.markers.spawns.get('SPAWN_Puertas');
    if (!spawn) throw new Error('sin aparición');
    const waypoints = [source('puertas.bocas'), source('puertas.planos')];
    expect(walk(positionOf(spawn), waypoints)).toBe(waypoints.length);
  });

  it('walks from the arrival to the wall of traces, the offerings and back home', () => {
    const spawn = world.markers.spawns.get('SPAWN_Puertas');
    if (!spawn) throw new Error('sin aparición');
    const waypoints = [
      source('puertas.rastros'),
      source('puertas.ofrendas'),
      source('puertas.bocas'),
    ];
    expect(walk(positionOf(spawn), waypoints)).toBe(waypoints.length);
  });

  it('walks from the arrival to the first Gate', () => {
    const spawn = world.markers.spawns.get('SPAWN_Puertas');
    if (!spawn) throw new Error('sin aparición');
    expect(walk(positionOf(spawn), [source('puertas.primera')])).toBe(1);
  });
});
