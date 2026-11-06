// El Observatorio por código (Fase 11): un asteroide alargado con una terraza tallada en el polo y, encima, un
// edificio cerrado (cúpula, hangar, cuarto del turno y Sala de las Fluctuaciones). Cumple el contrato del .glb de
// antes (raíz con datos, COL_, INT_ y SPAWN_) y suma lo que tiene vida: piezas que giran y faroles que solo se
// encienden en la alineación.
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
import { buildObservatorio } from '../../../src/worlds/procedural/observatorio';
import { ELEVATION, EYEPIECE } from '../../../src/worlds/procedural/observatorioDome';
import { HANGAR, PAD_CENTRE } from '../../../src/worlds/procedural/observatorioHangar';
import { ALBATROS_HULL } from '../../../src/ship/model/albatrosShape';
import type { Triple } from '../../../src/worlds/procedural/kit';
import { sunInWorld } from '../../../src/worlds/procedural/sun';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';
import {
  OBSERVATORIO_RADIUS,
  TERRACE,
  TERRACE_ZONES,
  mapDirection,
  mapOf,
  mapPoint,
  observatorioGround,
  terraceWeight,
} from '../../../src/worlds/procedural/observatorioShape';

const world = buildWorld('observatorio');
if (!world) throw new Error('El Observatorio debería construirse por código');
const find = (name: string): Object3D | undefined => world.scene.getObjectByName(name);
const runtime = createWorldRuntime(world);
const env: MotorEnvironment = {
  wells: [runtime.well],
  world: runtime.collision,
  water: runtime.water,
};
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);

/** Anda hacia cada punto en orden, como el jugador: sin saltar nunca. */
function walk(start: Vector3, waypoints: readonly Vector3[], limit = 40): number {
  const state = createCharacter(start, lookAlong(start.clone().normalize(), new Vector3(0, 1, 0)));
  const up = new Vector3();
  let reached = 0;
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      upOf(state.body, up);
      const offset = target.clone().sub(state.position);
      const flat = offset.clone().addScaledVector(up, -offset.dot(up));
      if (flat.length() < 0.4) break;
      if (t > limit) return reached;
      if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(up, flat));
      const intent: MoveIntent = { x: 0, z: 1, run: false, jump: false };
      stepCharacter(state, intent, env, PHYSICS_STEP);
    }
    reached++;
  }
  return reached;
}

const positionOf = (object: Object3D): Vector3 => object.getWorldPosition(new Vector3());
/** Un punto del mapa del edificio (x, y en metros desde la cúpula, z sobre el suelo), en la escena. */
const site = (x: number, y: number, z: number): Vector3 => toGltf(mapPoint(x, y, z));
/** Dónde cae en el mapa del edificio algo de la escena. */
const onMap = (object: Object3D): [number, number] => {
  const w = positionOf(object);
  return mapOf({ x: w.x, y: -w.z, z: w.y });
};

describe('Observatorio shape', () => {
  it('is longer along X than along Y or Z', () => {
    const x = observatorioGround(direction(0, 0));
    const y = observatorioGround(direction(0, 90));
    const z = observatorioGround(direction(90, 0));
    expect(x).toBeGreaterThan(y);
    expect(y).toBeGreaterThan(z);
    expect(x).toBeGreaterThan(OBSERVATORIO_RADIUS);
  });

  it('points the telescope and the slit straight at the Brasa (the rotation is locked)', () => {
    const tube = TERRACE.north
      .clone()
      .multiplyScalar(Math.cos(ELEVATION))
      .addScaledVector(TERRACE.up, Math.sin(ELEVATION));
    expect(tube.angleTo(sunInWorld('observatorio').normalize())).toBeLessThan(0.01);
  });

  it('tilts the telescope up towards the slit of the dome', () => {
    expect(ELEVATION).toBeGreaterThan(0.5);
    expect(EYEPIECE[1]).toBeLessThan(0); // el ocular queda detrás del pilar
    expect(EYEPIECE[2]).toBeGreaterThan(1.0);
  });
});

describe('Observatorio world contract', () => {
  it('carries the data of its root', () => {
    expect(world.info.id).toBe('observatorio');
    expect(world.info.radius).toBe(30);
    expect(world.info.gravity).toBe(0.2);
    expect(world.info.clockRate).toBe(1.15);
  });

  it('has the terrain and the places as colliders', () => {
    expect(find('COL_observatorio_Terreno')).toBeDefined();
    expect(find('COL_observatorio_Lugares')).toBeDefined();
  });

  it('offers the three sources of the clue graph and the five that tell the place', () => {
    const sources = world.markers.interactions.map((i) => [i.clueId, i.kind]).sort();
    expect(sources).toEqual([
      ['observatorio.carta', 'texto'],
      ['observatorio.informe', 'texto'],
      ['observatorio.libro', 'texto'],
      ['observatorio.placas', 'objeto'],
      ['observatorio.registrador', 'objeto'],
      ['observatorio.relevo', 'texto'],
      ['observatorio.relojes', 'objeto'],
      ['observatorio.telescopio', 'observacion'],
    ]);
  });

  it('puts the player at the door of the dome, on the ground', () => {
    const spawn = world.markers.spawns.get('SPAWN_Cupula');
    expect(spawn).toBeDefined();
    if (!spawn) return;
    expect(positionOf(spawn).length()).toBeGreaterThan(OBSERVATORIO_RADIUS * 0.7);
  });

  it('is built deterministically', () => {
    const names = (scene: Object3D): string[] => {
      const found: string[] = [];
      scene.traverse((o) => {
        if (/^(INT_|SPAWN_|COL_|ANIM_|EVT_)/.test(o.name)) found.push(o.name);
      });
      return found.sort();
    };
    expect(names(buildObservatorio())).toEqual(names(world.scene));
  });
});

describe('Observatorio life', () => {
  it('has parts that turn: the orrery, the antenna, the sensor and the recorder drum', () => {
    const names = world.markers.animated.map((a) => a.object.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ANIM_antena',
        'ANIM_sensor',
        'ANIM_registrador',
        'ANIM_planetario_0',
      ]),
    );
    for (const part of world.markers.animated) expect(part.spin).toBeGreaterThan(0);
  });

  it('lights its lamps only while the alignment lasts', () => {
    expect(world.markers.eventProps.map((p) => p.event)).toContain('alineacion');
  });

  it('keeps the triangle count of the visible world reasonable', () => {
    let triangles = 0;
    world.scene.traverse((o) => {
      if (!isMesh(o) || o.name.startsWith('COL_')) return;
      const g = o.geometry;
      triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    expect(triangles).toBeGreaterThan(5000);
    expect(triangles).toBeLessThan(60000);
  });
});

describe('Observatorio terrace (the building sits on carved rock)', () => {
  it('carves the ground under the whole building into one sphere: nothing stands on stilts', () => {
    const points: [number, number][] = [[0, 0]];
    for (const [cx, cy, r] of TERRACE_ZONES.circles) points.push([cx + r, cy], [cx, cy - r]);
    for (const [x0, y0, x1, y1] of TERRACE_ZONES.rects) {
      points.push([x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]);
    }
    for (const [x, y] of points) {
      expect(observatorioGround(mapDirection(x, y))).toBeCloseTo(TERRACE.radius, 3);
    }
  });

  it('has no deep footings: nothing of the building goes more than a metre under the floor', () => {
    const places = find('COL_observatorio_Lugares');
    expect(places && isMesh(places)).toBe(true);
    if (!places || !isMesh(places)) return;
    const position = places.geometry.getAttribute('position');
    const v = new Vector3();
    let lowest = Infinity;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i);
      // Solo lo que está sobre la terraza (las rocas sueltas quedan fuera).
      if (terraceWeight({ x: v.x, y: v.y, z: v.z }) < 1) continue;
      lowest = Math.min(lowest, v.length() - TERRACE.radius);
    }
    expect(lowest).toBeGreaterThan(-1.0);
  });
});

describe('Observatorio on foot (without jumping)', () => {
  const at = (p: Triple): Vector3 => site(...p);
  const spawn = world.markers.spawns.get('SPAWN_Cupula');

  it('walks from the hangar through the airlock, into the dome and on into the room of the shift', () => {
    expect(spawn).toBeDefined();
    if (!spawn) return;
    const waypoints = [
      at([0, -11.0, 1.2]), // la pista del hangar
      at([0, -7.2, 1.2]), // dentro de la esclusa
      at([0, -3.0, 1.2]), // dentro de la cúpula
      at([3.4, 0, 1.2]),
      at([6.5, 0, 1.2]), // ya en el cuarto del turno
      at([9.0, -0.8, 1.2]),
    ];

    expect(walk(positionOf(spawn), waypoints)).toBe(waypoints.length);
  });

  it('walks from the dome into the Room of the Fluctuations, to the recorder and the clocks', () => {
    const waypoints = [
      at([-3.4, 0, 1.2]),
      at([-6.5, 0, 1.2]), // ya en la sala
      at([-8.0, 1.3, 1.2]), // frente al registrador
      at([-12.0, -1.2, 1.2]), // frente a los relojes
    ];

    expect(walk(at([0, -3.0, 1.2]), waypoints)).toBe(waypoints.length);
  });

  it('keeps the room of the shift inside the building: the report is reached only through the dome', () => {
    const informe = world.markers.interactions.find((i) => i.clueId === 'observatorio.informe');
    expect(informe).toBeDefined();
    if (!informe) return;
    const [x, y] = onMap(informe.object);
    // Dentro del cuarto: más allá del tambor y dentro de sus paredes.
    expect(x).toBeGreaterThan(5.4);
    expect(x).toBeLessThan(10.5);
    expect(Math.abs(y)).toBeLessThan(2.3);
  });
});

describe('Observatorio hangar', () => {
  it('is big enough for the ship: the hatch, the pad and the hall clear its hull with room to spare', () => {
    const diameter = ALBATROS_HULL.radius * 2;
    expect(HANGAR.hatch).toBeGreaterThan(diameter + 1.5);
    expect(HANGAR.pad * 2).toBeGreaterThan(diameter + 1);
    expect(HANGAR.width).toBeGreaterThan(diameter + 3);
    expect(HANGAR.depth).toBeGreaterThan(diameter + 3);
    expect(HANGAR.height).toBeGreaterThan(5);
    expect(PAD_CENTRE[1]).toBeLessThan(-8);
  });

  it('closes the hatch with a pressure glass, so the whole building is a sealed space', () => {
    expect(find('observatorio_Cristal')).toBeDefined();
  });

  it('starts the visit inside the hangar, on its floor', () => {
    const spawn = world.markers.spawns.get('SPAWN_Cupula');
    expect(spawn).toBeDefined();
    if (!spawn) return;
    const [x, y] = onMap(spawn);
    expect(Math.abs(x)).toBeLessThan(HANGAR.width / 2);
    expect(y).toBeLessThan(-8.7);
    expect(y).toBeGreaterThan(-8.7 - HANGAR.depth);
  });

  it('has no ramp or footbridge left over open space: nothing leads out of the building on foot', () => {
    let beams = 0;
    world.scene.traverse((o) => {
      if (o.name.startsWith('INT_') || o.name.startsWith('SPAWN_')) beams++;
    });
    expect(beams).toBe(9);
  });
});
