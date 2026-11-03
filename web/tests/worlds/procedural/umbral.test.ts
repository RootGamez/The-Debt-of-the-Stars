// Umbral modelado por código (Fase 11): que sea reproducible y que el juego se pueda jugar en él igual que en el
// modelo exportado de Blender: aparición, rampas, fuentes alcanzables y sitio para la nave.
import { describe, expect, it } from 'vitest';
import { Points, Vector3 } from 'three';
import { PHYSICS_STEP } from '../../../src/data/movement';
import { createCharacter, stepCharacter } from '../../../src/physics/characterMotor';
import { yaw } from '../../../src/physics/surfaceFrame';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { isMesh } from '../../../src/worlds/markers';
import {
  buildUmbral,
  sunInUmbral,
  UMBRAL_RADIUS,
  type UmbralStats,
} from '../../../src/worlds/procedural/umbral';
import { createWorldRuntime, environmentOf } from '../../../src/worlds/worldRuntime';

function umbral() {
  const world = buildWorld('umbral');
  if (!world) throw new Error('Umbral debería construirse por código');
  return world;
}

const runtime = createWorldRuntime(umbral());
const spawn = runtime.world.markers.spawns.get('SPAWN_LaBoca');

describe('building Umbral', () => {
  const terrainPositions = (scene: ReturnType<typeof buildUmbral>): number[] => {
    const mesh = scene.getObjectByName('umbral_Terreno');
    return mesh && isMesh(mesh) ? Array.from(mesh.geometry.getAttribute('position').array) : [];
  };
  const statsOf = (scene: ReturnType<typeof buildUmbral>): UmbralStats =>
    scene.getObjectByName('umbral')?.userData.stats as UmbralStats;

  it('gives the same world every time', () => {
    const a = buildUmbral({ detail: 12 });
    const b = buildUmbral({ detail: 12 });

    expect(statsOf(a)).toEqual(statsOf(b));
    expect(terrainPositions(a).length).toBeGreaterThan(0);
    expect(terrainPositions(a)).toEqual(terrainPositions(b));
  });

  it('keeps the terrain detail it was asked for, within the triangle budget', () => {
    const stats = statsOf(umbral().scene);

    expect(stats.terrain).toBe(20 * 49 * 49);
    expect(stats.places).toBeGreaterThan(10_000);
    expect(stats.colliders).toBeGreaterThan(1_000);
    // Orientativo (CONTEXTO_PLANETAS.md §2): manda que vaya fluido, pero que no se dispare sin querer.
    expect(stats.terrain + stats.places + stats.detail).toBeLessThan(150_000);
    expect(statsOf(buildUmbral({ detail: 20 })).terrain).toBe(20 * 21 * 21);
  });
});

describe('the Brasa over Umbral', () => {
  it('sits on the horizon at the Mirador and low over La Boca (CONTEXTO_PLANETAS.md §3)', () => {
    const sun = sunInUmbral();
    const letter = runtime.world.markers.interactions.find((i) => i.clueId === 'umbral.carta');
    const mouth = runtime.world.markers.triggers[0];
    // Las marcas están en el marco glTF (Y arriba); la Brasa, en el de Blender (Z arriba).
    const toGltf = (v: Vector3) => new Vector3(v.x, v.z, -v.y);
    const sunGltf = toGltf(sun);
    const elevation = (p: Vector3 | undefined) =>
      Math.asin(p ? p.clone().normalize().dot(sunGltf) : Number.NaN) * (180 / Math.PI);

    expect(sun.length()).toBeCloseTo(1);
    expect(Math.abs(elevation(letter?.object.getWorldPosition(new Vector3())))).toBeLessThan(5);
    const overMouth = elevation(mouth?.object.getWorldPosition(new Vector3()));
    expect(overMouth).toBeGreaterThan(5);
    expect(overMouth).toBeLessThan(25);
  });
});

describe('arriving at La Boca', () => {
  it('puts the traveller on the mesa, facing the ring', () => {
    const ring = runtime.world.markers.triggers[0]?.object.getWorldPosition(new Vector3());
    if (!spawn || !ring) throw new Error('faltan SPAWN_LaBoca o TRIG_LaBoca_Destello');
    const feet = runtime.spawn.feet;
    const up = feet.clone().normalize();
    const forward = new Vector3(0, 0, -1).applyQuaternion(runtime.spawn.body);
    const towards = ring.clone().sub(feet);
    towards.addScaledVector(up, -towards.dot(up)).normalize();

    expect(forward.dot(towards)).toBeGreaterThan(0.95);
    expect(feet.length()).toBeGreaterThan(UMBRAL_RADIUS - 3);
  });

  it('can go down the ramp to the plain and back up to the mesa', () => {
    const env = environmentOf(runtime);
    const state = createCharacter(runtime.spawn.feet, runtime.spawn.body);
    const walk = { x: 0, z: 1, run: false, jump: false };
    const startHeight = runtime.spawn.feet.length();
    let farthest = 0;

    yaw(state.body, Math.PI);
    for (let i = 0; i < 3.5 / PHYSICS_STEP; i++) {
      stepCharacter(state, walk, env, PHYSICS_STEP);
      farthest = Math.max(farthest, state.position.distanceTo(runtime.spawn.feet));
    }
    yaw(state.body, Math.PI);
    for (let i = 0; i < 3.3 / PHYSICS_STEP; i++) stepCharacter(state, walk, env, PHYSICS_STEP);

    expect(farthest).toBeGreaterThan(10); // salió de la meseta (acaba a unos 6 m del borde)
    expect(state.position.distanceTo(runtime.spawn.feet)).toBeLessThan(3); // volvió a subir por la rampa
    expect(Math.abs(state.position.length() - startHeight)).toBeLessThan(0.15);
  });
});

describe('the sources of Umbral', () => {
  it.each(runtime.world.markers.interactions.map((i) => [i.clueId, i] as const))(
    '%s has ground right below it, within reach',
    (_id, interaction) => {
      const p = interaction.object.getWorldPosition(new Vector3());
      const up = p.clone().normalize();
      const origin = p.clone().addScaledVector(up, 0.5);

      const distance = runtime.collision.raycast(origin, up.clone().negate(), 10);

      expect(distance).not.toBeNull();
      expect(distance ?? Infinity).toBeLessThan(3.5);
    },
  );
});

describe('where the ship waits', () => {
  it('is flat and clear for a few metres around PARK_Nave', () => {
    const park = runtime.world.markers.parks.get('PARK_Nave')?.getWorldPosition(new Vector3());
    if (!park) throw new Error('falta PARK_Nave');
    const up = park.clone().normalize();
    const side = new Vector3(0, 1, 0).cross(up).normalize();
    const other = up.clone().cross(side);
    const heights: number[] = [];

    for (let k = 0; k < 12; k++) {
      const a = (2 * Math.PI * k) / 12;
      for (const r of [0, 2, 4]) {
        const point = park
          .clone()
          .addScaledVector(side, Math.cos(a) * r)
          .addScaledVector(other, Math.sin(a) * r);
        const origin = point
          .clone()
          .normalize()
          .multiplyScalar(UMBRAL_RADIUS + 15);
        const hit = runtime.collision.raycast(origin, origin.clone().normalize().negate(), 40);
        heights.push(UMBRAL_RADIUS + 15 - (hit ?? Infinity));
      }
    }

    // Nada por encima del suelo (ni piedras ni mojones) y casi llano.
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.6);
    expect(Math.abs(park.length() - Math.max(...heights))).toBeLessThan(0.3);
  });
});

describe('the air of Umbral (Phase 11)', () => {
  it('carries dust close to the ground, never inside it nor up in the sky', () => {
    const dust = runtime.world.scene.getObjectByName('umbral_Polvo');
    if (!(dust instanceof Points)) throw new Error('falta umbral_Polvo');
    const geometry = (dust as Points).geometry;
    const positions = geometry.getAttribute('position');
    const p = new Vector3();
    let lowest = Infinity;
    let highest = -Infinity;

    for (let i = 0; i < positions.count; i += 37) {
      p.fromBufferAttribute(positions, i);
      const ground = runtime.collision.raycast(
        p.clone().setLength(UMBRAL_RADIUS + 40),
        p.clone().normalize().negate(),
        80,
      );
      if (ground === null) continue;
      const above = p.length() - (UMBRAL_RADIUS + 40 - ground);
      lowest = Math.min(lowest, above);
      highest = Math.max(highest, above);
    }

    expect(positions.count).toBeGreaterThan(3000);
    expect(lowest).toBeGreaterThan(-25); // bajo una mesa o un edificio puede quedar alguna, nunca enterrada lejos
    expect(highest).toBeLessThan(6);
  });
});

describe('the flash of La Boca', () => {
  it('only shows while its event lasts (EVT_)', () => {
    const [flash] = runtime.world.markers.eventProps;

    expect(flash?.event).toBe('boca_destello');
    expect(flash?.object.visible).toBe(false);
  });
});
