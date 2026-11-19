// El Nudo y el Laboratorio Oculto por código (Fase 11): cumple el contrato del laboratorio.glb de antes (raíz con
// la cavidad y la luz de dentro, COL_, INT_, PASO_ y SPAWN_), se anda por la cara interior sin saltar entre sus
// zonas y alrededor de la semilla orbita lo que el Laboratorio perdió.
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
import { buildLaboratorio } from '../../../src/worlds/procedural/laboratorio';
import {
  INNER_SITES,
  LAB_INNER_RADIUS,
  innerGround,
  insideFrame,
  insideHeading,
  type InnerSiteId,
} from '../../../src/worlds/procedural/laboratorioShape';
import { direction } from '../../../src/worlds/procedural/kit';
import { BUBBLE_MESH } from '../../../src/worlds/procedural/laboratorioBubble';
import { BED_STEP_LIGHTS, SCIENTIST_ANCHOR } from '../../../src/worlds/procedural/laboratorioCold';
import { LABORATORY_GATE } from '../../../src/game/fallenGate';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';

const world = buildWorld('laboratorio');
if (!world) throw new Error('El Laboratorio debería construirse por código');
const find = (name: string): Object3D | undefined => world.scene.getObjectByName(name);
const runtime = createWorldRuntime(world);
const env: MotorEnvironment = {
  wells: [runtime.well],
  world: runtime.collision,
  water: runtime.water,
};
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);
const positionOf = (object: Object3D): Vector3 => object.getWorldPosition(new Vector3());
/** Un punto de una zona (en su marco, de cara a `facing`, por donde se llega), a la altura de la cabeza. */
const siteAt = (id: InnerSiteId, x = 0, y = 0, facing?: InnerSiteId): Vector3 => {
  const s = INNER_SITES[id];
  const heading = facing ? insideHeading(s, INNER_SITES[facing]) : 0;
  return toGltf(insideFrame(s.lat, s.lon, heading).point([x, y, 1.2]));
};

/** Anda hacia cada punto en orden, como el jugador: sin saltar nunca. */
function walk(start: Vector3, waypoints: readonly Vector3[], limit = 60): number {
  const state = createCharacter(
    start,
    lookAlong(start.clone().normalize().negate(), new Vector3(0, 1, 0)),
  );
  const up = new Vector3();
  let reached = 0;
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      upOf(state.body, up);
      const offset = target.clone().sub(state.position);
      const flat = offset.clone().addScaledVector(up, -offset.dot(up));
      if (flat.length() < 0.6) break;
      if (t > limit) return reached;
      if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(up, flat));
      const intent: MoveIntent = { x: 0, z: 1, run: false, jump: false };
      stepCharacter(state, intent, env, PHYSICS_STEP);
    }
    reached++;
  }
  return reached;
}

describe('Laboratorio world contract', () => {
  it('carries the same root data as the exported model: a hollow world lit from inside', () => {
    expect(world.info).toEqual({
      id: 'laboratorio',
      radius: 25,
      gravity: 0.3,
      // E2: el mundo marca el ritmo del Nudo; el 5 del Laboratorio lo pone la burbuja del Contrapeso (antes 0,20).
      clockRate: 1,
      // E7: luz cálida de lámpara (antes, un verde clínico: 0xa8b8a8 a 1,4 y 0xf0ddb8 a 1,5).
      ambient: { color: 0xb4ac9c, intensity: 1.05 },
      innerRadius: 21,
      cavityTide: 'semilla',
      interiorLight: { color: 0xffe2b6, intensity: 1.7 },
    });
  });

  it('has the terrain and the places as colliders', () => {
    expect(find('COL_laboratorio_Terreno')).toBeDefined();
    expect(find('COL_laboratorio_Lugares')).toBeDefined();
  });

  it('offers the seven sources of the clue graph, the records that tell the place and her (E4)', () => {
    expect(world.markers.interactions.map((i) => i.clueId).sort()).toEqual([
      'lab.calendario',
      'lab.camara',
      'lab.cientifica',
      'lab.comedor',
      'lab.contrapeso',
      'lab.dormitorio',
      'lab.encargo.cientifica',
      'lab.escritorio_vacio',
      'lab.invernadero',
      'lab.lecho',
      'lab.mediciones',
      'lab.mesa_partida',
      'lab.notas_esceptico',
      'lab.notas_investigadora',
      'lab.noticias.cientifica',
      'lab.orden_silencio',
      'lab.pizarra',
      'lab.radio',
      'lab.reloj_puerta',
    ]);
  });

  it('keeps the folded gate: each ring sends to its twin, one outside and one inside', () => {
    const boca = find('PASO_Boca');
    const dentro = find('PASO_Dentro');
    expect(boca?.userData.destino).toBe('PASO_Dentro');
    expect(dentro?.userData.destino).toBe('PASO_Boca');
    if (!boca || !dentro) return;
    expect(positionOf(boca).length()).toBeGreaterThan(24);
    expect(positionOf(dentro).length()).toBeLessThan(LAB_INNER_RADIUS);
  });

  it('locks both rings with the fallen gate of the Knot, set from the dock clock outside (E4)', () => {
    expect(find('PASO_Boca')?.userData.cerradura).toBe(LABORATORY_GATE.lock);
    expect(find('PASO_Dentro')?.userData.cerradura).toBe(LABORATORY_GATE.lock);
    const clock = world.markers.interactions.find((i) => i.clueId === 'lab.reloj_puerta');
    const boca = find('PASO_Boca');
    if (!clock || !boca) throw new Error('sin reloj o sin anillo');
    // En la cáscara, junto al anillo de fuera.
    expect(positionOf(clock.object).length()).toBeGreaterThan(24);
    expect(positionOf(clock.object).distanceTo(positionOf(boca))).toBeLessThan(8);
    // La membrana y la luz de la hora de cada anillo van sueltas, para apagarlas mientras está caído.
    const parts: string[] = [];
    world.scene.traverse((o) => {
      if (o.userData.fallen_lock === LABORATORY_GATE.lock)
        parts.push(String(o.userData.fallen_part));
    });
    expect(parts.filter((p) => p === 'membrane')).toHaveLength(2);
    expect(parts.filter((p) => p === 'blink')).toHaveLength(3);
  });

  it('keeps her anchor, the four step lights and the bubble around the Counterweight (E4)', () => {
    const anchor = find(SCIENTIST_ANCHOR);
    const bed = world.markers.interactions.find((i) => i.clueId === 'lab.lecho');
    expect(anchor).toBeDefined();
    expect(bed).toBeDefined();
    if (!anchor || !bed) return;
    expect(positionOf(anchor).length()).toBeLessThan(LAB_INNER_RADIUS);
    expect(positionOf(anchor).distanceTo(positionOf(bed.object))).toBeLessThan(3);
    let steps = 0;
    world.scene.traverse((o) => {
      if (typeof o.userData.lab_bed_step === 'number') steps++;
    });
    expect(steps).toBe(BED_STEP_LIGHTS);
    const bubble = find(BUBBLE_MESH);
    const counterweight = world.markers.interactions.find((i) => i.clueId === 'lab.contrapeso');
    if (!bubble || !counterweight) throw new Error('sin burbuja o sin Contrapeso');
    expect(positionOf(bubble).distanceTo(positionOf(counterweight.object))).toBeLessThan(0.05);
  });

  it('puts the player inside the cavity, in front of the inner gate', () => {
    const spawn = world.markers.spawns.get('SPAWN_Laboratorio');
    const dentro = find('PASO_Dentro');
    expect(spawn).toBeDefined();
    if (!spawn || !dentro) return;
    expect(positionOf(spawn).length()).toBeLessThan(LAB_INNER_RADIUS - 0.5);
    expect(positionOf(spawn).distanceTo(positionOf(dentro))).toBeLessThan(4);
  });

  it('is built deterministically', () => {
    const names = (scene: Object3D): string[] => {
      const found: string[] = [];
      scene.traverse((o) => {
        if (/^(INT_|SPAWN_|COL_|ANIM_|PASO_)/.test(o.name)) found.push(o.name);
      });
      return found.sort();
    };
    expect(names(buildLaboratorio())).toEqual(names(world.scene));
  });

  it('keeps the triangle count reasonable', () => {
    let triangles = 0;
    world.scene.traverse((o) => {
      if (!isMesh(o) || o.name.startsWith('COL_')) return;
      const g = o.geometry;
      triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    expect(triangles).toBeLessThan(150000);
  });
});

describe('Laboratorio life', () => {
  it('turns the desk clock, the rings of the seed and the debris orbiting it', () => {
    const names = world.markers.animated.map((a) => a.object.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ANIM_reloj_mesa',
        'ANIM_semilla_0',
        'ANIM_semilla_1',
        'ANIM_semilla_2',
        'ANIM_orbita_0',
        'ANIM_orbita_4',
      ]),
    );
    for (const part of world.markers.animated) expect(part.spin).toBeGreaterThan(0);
  });

  it('turns the desk clock at the pace of the bubble, and only the desk clock (E2)', () => {
    const inBubble = world.markers.animated.filter((a) => a.bubble).map((a) => a.object.name);

    expect(inBubble).toEqual(['ANIM_reloj_mesa']);
  });

  it('keeps the floor flat under every room, so nothing sticks out or floats', () => {
    for (const s of Object.values(INNER_SITES)) {
      expect(innerGround(direction(s.lat, s.lon))).toBeCloseTo(LAB_INNER_RADIUS, 6);
    }
  });
});

describe('Laboratorio on foot (inside, without jumping)', () => {
  it('walks from the gate to the work room, the crossing and the Chamber', () => {
    const spawn = world.markers.spawns.get('SPAWN_Laboratorio');
    if (!spawn) throw new Error('sin aparición');
    // La pizarra está al fondo de la sala: se rodea por un lado, como haría el jugador.
    const waypoints = [
      siteAt('sala', 0, 1.5, 'recibidor'),
      siteAt('sala', 3.3, -0.8, 'recibidor'),
      siteAt('sala', 3.0, -3.3, 'recibidor'),
      siteAt('cruce'),
      siteAt('camara', 0, 2.0, 'cruce'),
    ];
    expect(walk(positionOf(spawn), waypoints)).toBe(waypoints.length);
  });

  it('walks from the researcher’s desk along the path into the dining room', () => {
    const waypoints = [siteAt('comedor', 0, 1.6, 'investigadora')];
    expect(walk(siteAt('investigadora', 0, 1.0), waypoints)).toBe(waypoints.length);
  });
});
