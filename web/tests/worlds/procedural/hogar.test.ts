// Hogar por código (Fase 11G): un continente con el Instituto en su colina, la aldea, la ciudad, el campo y el Motor
// en la cara de día; mar con olas como el del Archivo; y, en la cara de noche, lo que se guarda para los curiosos.
import { describe, expect, it } from 'vitest';
import { Vector3, type Mesh, type Object3D } from 'three';
import type { MoveIntent } from '../../../src/core/input';
import { INTERACT_RANGE } from '../../../src/registry/interaction';
import { EYE_HEIGHT, PHYSICS_STEP } from '../../../src/data/movement';
import { loadClues } from '../../../src/data/pistas';
import {
  createCharacter,
  stepCharacter,
  type MotorEnvironment,
} from '../../../src/physics/characterMotor';
import { lookAlong, upOf } from '../../../src/physics/surfaceFrame';
import { leaveOut } from '../../../src/worlds/leaveOut';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { buildHogar } from '../../../src/worlds/procedural/hogar';
import { INSTITUTO_LAYOUT, TOWER_RAMP } from '../../../src/worlds/procedural/hogarInstituto';
import { GREAT_RING, motorHeading } from '../../../src/worlds/procedural/hogarMotor';
import {
  HOGAR_RADIUS,
  SEA_LEVEL,
  SITES,
  hogarGround,
  hogarSurface,
  landShare,
  surfaceDistance,
} from '../../../src/worlds/procedural/hogarShape';
import { direction, frameAt, type Triple } from '../../../src/worlds/procedural/kit';
import { sunInWorld } from '../../../src/worlds/procedural/sun';
import { NOT_YET_ARRIVED } from '../../../src/game/homecoming';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';

const world = buildWorld('hogar');
if (!world) throw new Error('Hogar debería construirse por código');
const runtime = createWorldRuntime(world);
const env: MotorEnvironment = {
  wells: [runtime.well],
  world: runtime.collision,
  water: runtime.water,
};

/** Del marco de Blender (Z arriba) al de glTF (Y arriba). */
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);
const instituto = frameAt(hogarSurface, SITES.instituto.lat, SITES.instituto.lon);
const atInstituto = (p: Triple): Vector3 => toGltf(instituto.point(p));
const aldea = frameAt(hogarSurface, SITES.aldea.lat, SITES.aldea.lon);
const atAldea = (p: Triple): Vector3 => toGltf(aldea.point(p));
const positionOf = (object: Object3D): Vector3 => object.getWorldPosition(new Vector3());

/** Anda hacia cada punto en orden (como el jugador, sin saltar). */
function walk(start: Vector3, waypoints: readonly Vector3[], limit = 30) {
  const state = createCharacter(start, lookAlong(start.clone().normalize(), new Vector3(0, 1, 0)));
  const up = new Vector3();
  let reached = 0;
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      upOf(state.body, up);
      const offset = target.clone().sub(state.position);
      const flat = offset.clone().addScaledVector(up, -offset.dot(up));
      if (flat.length() < 0.4) break;
      if (t > limit) return { reached, state };
      if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(up, flat));
      const intent: MoveIntent = { x: 0, z: 1, run: false, jump: false };
      stepCharacter(state, intent, env, PHYSICS_STEP);
    }
    reached++;
  }
  return { reached, state };
}

describe('Hogar built in code', () => {
  it('keeps the world data and adds the sea', () => {
    expect(world.info).toMatchObject({
      id: 'hogar',
      radius: HOGAR_RADIUS,
      gravity: 1,
      clockRate: 1,
      sea: { level: SEA_LEVEL },
    });
    expect(runtime.water?.level).toBe(SEA_LEVEL);
  });

  it('builds the same world every time, within its budget', () => {
    const stats = (s: ReturnType<typeof buildHogar>) =>
      s.getObjectByName('hogar')?.userData.stats as {
        terrain: number;
        places: number;
        ool: number;
        scatter: number;
      };
    const a = stats(buildHogar({ detail: 12 }));
    expect(stats(buildHogar({ detail: 12 }))).toEqual(a);
    const full = stats(world.scene);
    expect(full.terrain + full.places + full.ool + full.scatter).toBeLessThan(260_000);
  });

  it('is mostly sea, with a continent of home and islands far away', () => {
    let land = 0;
    const samples = 2000;
    for (let i = 0; i < samples; i++) {
      const z = 1 - (2 * (i + 0.5)) / samples;
      const a = i * 2.399963;
      const r = Math.sqrt(1 - z * z);
      if (hogarGround({ x: r * Math.cos(a), y: r * Math.sin(a), z }) > SEA_LEVEL) land++;
    }
    expect(land / samples).toBeGreaterThan(0.1);
    expect(land / samples).toBeLessThan(0.4);
    for (const site of Object.values(SITES)) {
      expect(landShare(direction(site.lat, site.lon))).toBeGreaterThan(0.5);
    }
  });

  it('keeps every flat place clear of its neighbours', () => {
    const sites = Object.entries(SITES).filter(([, s]) => s.pad > 0);
    for (const [id, site] of sites) {
      for (const [other, them] of sites) {
        if (other <= id) continue;
        const reach = site.pad + them.pad + 2;
        const apart = surfaceDistance(direction(site.lat, site.lon), them.lat, them.lon);
        expect(apart, `${id} y ${other}`).toBeGreaterThan(reach);
      }
    }
  });

  it('puts the places of home on the day side and the secrets on the night side', () => {
    const sun = sunInWorld('hogar');
    const light = (id: keyof typeof SITES) => direction(SITES[id].lat, SITES[id].lon).dot(sun);
    for (const id of ['instituto', 'aldea', 'ciudad', 'huertos', 'motor', 'embarcadero'] as const) {
      expect(light(id)).toBeGreaterThan(0.15);
    }
    for (const id of ['albatros', 'primera_piedra', 'astronoma', 'prado_luces'] as const) {
      expect(light(id)).toBeLessThan(0);
    }
  });
});

describe('the Instituto', () => {
  it('wakes you up on the square of the village, above the sea', () => {
    const feet = runtime.spawn.feet;
    expect(feet.distanceTo(atAldea([0.4, -6.5, 0]))).toBeLessThan(1);
    expect(feet.length()).toBeGreaterThan(SEA_LEVEL + 1);
  });

  it('lets you walk from the square of the Instituto into the Sala de Fragmentos without jumping', () => {
    const [x, y] = INSTITUTO_LAYOUT.rotunda;
    const { reached, state } = walk(atInstituto([0, -5, 0.3]), [
      atInstituto([x, y - 7.5, 0]),
      atInstituto([x, y - 2, 0]),
    ]);
    expect(reached).toBe(2);
    expect(state.takeoffs).toBe(0);
  });

  it('takes you up the ramp of the Maestra’s tower to its balcony', () => {
    const [tx, ty] = INSTITUTO_LAYOUT.tower;
    const { radius, from, to, top } = TOWER_RAMP;
    const point = (deg: number, r: number, z: number): Vector3 =>
      atInstituto([
        tx + Math.sin((deg * Math.PI) / 180) * r,
        ty + Math.cos((deg * Math.PI) / 180) * r,
        z,
      ]);
    const start = point(from - 25, radius + 1.5, 0.3);
    const route: Vector3[] = [];
    const steps = Math.round((to - from) / 15);
    for (let k = 0; k <= steps; k++) {
      route.push(point(from + ((to - from) * k) / steps, radius, (top * k) / steps));
    }
    route.push(point(to, 3.2, top));
    const { reached, state } = walk(start, route);
    expect(reached).toBe(route.length);
    const height = state.position.length() - SITES.instituto.height;
    expect(height).toBeGreaterThan(top - 0.4);
  });

  it('keeps the Albatros II pad clear up to the sky', () => {
    const park = world.markers.parks.get('PARK_Hangar');
    if (!park) throw new Error('falta PARK_Hangar');
    const p = positionOf(park);
    const up = p.clone().normalize();
    for (const side of [new Vector3(1, 0, 0), new Vector3(0, 0, 1)]) {
      const offset = side
        .clone()
        .addScaledVector(up, -side.dot(up))
        .normalize()
        .multiplyScalar(2.5);
      const from = p.clone().add(offset).addScaledVector(up, 0.5);
      expect(runtime.collision.raycast(from, up, 40)).toBeNull();
    }
  });
});

describe('the people of home', () => {
  const clues = loadClues();
  const home = clues.sources.filter((s) => s.world === 'hogar');

  it('has a marker you can reach for every source of home', () => {
    const interactions = new Map(world.markers.interactions.map((i) => [i.clueId, i]));
    for (const source of home) {
      const marker = interactions.get(source.id);
      expect(marker, source.id).toBeDefined();
      if (!marker) continue;
      const position = positionOf(marker.object);
      const up = position.clone().normalize();
      // Como al teletransportarse: algún suelo a un paso desde el que los ojos llegan a la fuente.
      const side = new Vector3(1, 0, 0).addScaledVector(up, -up.x).normalize();
      let reachable = false;
      for (let turn = 0; turn < 8 && !reachable; turn++) {
        for (const probe of [1.2, 3]) {
          const above = position.clone().addScaledVector(side, 1.1).addScaledVector(up, probe);
          const distance = runtime.collision.raycast(above, up.clone().negate(), 40);
          if (distance === null) continue;
          const eye = above.addScaledVector(up, EYE_HEIGHT - distance);
          if (eye.distanceTo(position) <= INTERACT_RANGE * 0.9) reachable = true;
        }
        side.applyAxisAngle(up, Math.PI / 4);
      }
      expect(reachable, source.id).toBe(true);
    }
  });

  it('puts every Ool on its feet, by the place where it talks', () => {
    for (const { id, object, glow } of world.markers.characters) {
      expect(glow, id).toBeDefined();
      const p = positionOf(object);
      const d = p.clone().normalize();
      const ground = hogarGround({ x: d.x, y: -d.z, z: d.y });
      if (id === 'pescador') {
        expect(p.length()).toBeGreaterThan(SEA_LEVEL); // en el muelle, sobre el agua
      } else {
        expect(Math.abs(p.length() - ground), id).toBeLessThan(0.8);
      }
    }
  });

  it('waits for you at the Motor: the Directora, by the Puerta Mayor', () => {
    const directora = world.markers.characters.find((c) => c.id === 'directora');
    if (!directora) throw new Error('falta la Directora');
    const motor = frameAt(hogarSurface, SITES.motor.lat, SITES.motor.lon, {
      heading: motorHeading(),
    });
    const ring = toGltf(motor.point(GREAT_RING.center));
    expect(positionOf(directora.object).distanceTo(ring)).toBeLessThan(20);
    // La Puerta Mayor, alta: se ve desde la plaza.
    expect(ring.length() + GREAT_RING.radius).toBeGreaterThan(SITES.instituto.height + 5);
  });

  it('tells the sky and the sea where each Ool really stands, so none is tinted as if under water', () => {
    for (const { id, object } of world.markers.characters) {
      const body = object.getObjectByName(`hogar_ool_${id}`) as Mesh | undefined;
      const planet = body?.geometry.getAttribute('skyPlanet');
      expect(planet, id).toBeDefined();
      if (!planet) continue;
      const feet = new Vector3().fromBufferAttribute(planet, 0).length();
      expect(feet, id).toBeGreaterThan(SEA_LEVEL);
      expect(Math.abs(feet - positionOf(object).length()), id).toBeLessThan(2);
    }
  });

  it('keeps the young Ool lighter than the old ones', () => {
    const ageOf = (id: string) =>
      world.markers.characters.find((c) => c.id === id)?.object.userData.age as number;
    expect(ageOf('cria')).toBeLessThan(ageOf('maestra'));
    expect(ageOf('astronoma')).toBeGreaterThan(ageOf('directora'));
  });

  it('can leave out what had not arrived yet in the earlier home', () => {
    const fresh = buildWorld('hogar');
    if (!fresh) throw new Error('Hogar debería construirse por código');
    expect(fresh.scene.getObjectByName('hogar_FragmentosVitrinas')).toBeDefined();
    const earlier = leaveOut(fresh, NOT_YET_ARRIVED);
    expect(earlier.scene.getObjectByName('hogar_FragmentosVitrinas')).toBeUndefined();
    // La vitrina de los bordes curvos es una fuente: se queda.
    expect(world.markers.interactions.some((i) => i.clueId === 'instituto.vitrina_bordes')).toBe(
      true,
    );
  });
});
