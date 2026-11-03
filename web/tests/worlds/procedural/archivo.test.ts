// El Archivo de agua por código (Fase 11E): su forma, que el vidrio no deje entrar más que por la esclusa y que se
// pueda bajar buceando, entrar por el pozo y subir a la Galería antes de quedarse sin aire.
import { describe, expect, it } from 'vitest';
import { Mesh, SphereGeometry, Vector3, type ShaderMaterial } from 'three';
import { ATMOSPHERES } from '../../../src/data/atmospheres';
import type { MoveIntent } from '../../../src/core/input';
import { BREATH_SECONDS, PHYSICS_STEP } from '../../../src/data/movement';
import { createCharacter, stepCharacter } from '../../../src/physics/characterMotor';
import { lookAlong, upOf } from '../../../src/physics/surfaceFrame';
import { Breath, headUnder, isWet } from '../../../src/physics/water';
import { buildWorld } from '../../../src/worlds/loadWorld';
import {
  FLOOR_RADIUS,
  floorRadius,
  LOCK,
  SEA_LEVEL,
  SEABED,
  TUBE_MAJOR,
  TUBE_MINOR,
  WAVE_HEIGHT,
} from '../../../src/worlds/procedural/archivoShape';
import { ARCHIVO_SOURCES } from '../../../src/worlds/procedural/archivoGallery';
import { direction, frameAt, type Triple } from '../../../src/worlds/procedural/kit';
import { createWorldRuntime, environmentOf } from '../../../src/worlds/worldRuntime';

const world = buildWorld('archivo');
if (!world) throw new Error('El Archivo debería construirse por código');
const runtime = createWorldRuntime(world);
const env = environmentOf(runtime);
const water = runtime.water;

/** Del marco de Blender (Z arriba) al de glTF (Y arriba). */
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);
/** Un punto de la esclusa en su marco: X hacia el sur, Y hacia el este, Z hacia fuera desde el fondo. */
const lockFrame = frameAt({ radius: SEABED, groundRadius: () => SEABED }, 0, LOCK.lon, {
  heading: 90,
});
const atLock = (p: Triple): Vector3 => toGltf(lockFrame.point(p));

describe('the Archivo built in code', () => {
  it('keeps the world data, and adds its sea and its dry glass ring', () => {
    expect(world.info).toMatchObject({
      id: 'archivo',
      radius: 70,
      gravity: 1.5,
      clockRate: 0.8,
      sea: { level: 70, dry: { major: 70, minor: 9 }, waves: { height: WAVE_HEIGHT, seed: 3 } },
    });
  });

  it('keeps every source of the clue graph, the light-slot ray and the arrival', () => {
    expect(world.markers.interactions.map((i) => i.clueId).sort()).toEqual(
      ARCHIVO_SOURCES.map((s) => `archivo.${s.id}`).sort(),
    );
    expect(world.markers.eventProps.map((p) => p.event)).toEqual(['ranura_luz']);
    expect([...world.markers.spawns.keys()]).toEqual(['SPAWN_Borde']);
    expect(world.markers.colliders.map((c) => c.name).sort()).toEqual([
      'COL_archivo_Lugares',
      'COL_archivo_Terreno',
    ]);
  });

  it('puts every source inside the tube, dry, just above the gallery floor', () => {
    for (const interaction of world.markers.interactions) {
      const p = interaction.object.getWorldPosition(new Vector3());
      expect(water && isWet(p, water)).toBe(false);
      const ring = Math.hypot(Math.hypot(p.x, p.z) - TUBE_MAJOR, p.y);
      expect(ring).toBeLessThan(TUBE_MINOR);
      expect(p.length()).toBeGreaterThan(62);
      expect(p.length()).toBeLessThan(FLOOR_RADIUS + 3);
    }
  });

  it('wakes you up dry, on the islet of the Borde', () => {
    expect(water && isWet(runtime.spawn.feet, water)).toBe(false);
    expect(runtime.spawn.feet.length()).toBeGreaterThan(SEA_LEVEL);
  });

  it('sinks the Fondo of the gallery and keeps it dry', () => {
    expect(floorRadius(-100.957)).toBeLessThan(FLOOR_RADIUS - 2);
  });

  it('has clouds above the glass and inside its air, which the ship flies through', () => {
    const air = ATMOSPHERES.archivo;
    if (!air) throw new Error('el Archivo debería tener aire');
    for (const name of ['archivo_Nubes', 'archivo_Velos']) {
      const layer = world.scene.getObjectByName(name);
      if (!(layer instanceof Mesh)) throw new Error(`falta ${name}`);
      const radius = (layer.geometry as SphereGeometry).parameters.radius;
      expect(radius).toBeGreaterThan(TUBE_MAJOR + TUBE_MINOR + 5);
      expect(radius).toBeLessThan(SEA_LEVEL + air.height);
    }
    const above = toGltf(direction(10, 0).multiplyScalar(SEA_LEVEL + 50));
    const down = above.clone().normalize().negate();
    expect(Math.abs((runtime.hull.raycast(above, down, 60) ?? 0) - 50)).toBeLessThanOrEqual(
      WAVE_HEIGHT + 0.01,
    );
  });
});

describe('the glass of the gallery', () => {
  it('cannot be crossed anywhere but over the shaft of the lock', () => {
    let blocked = 0;
    let tried = 0;
    for (let lon = -175; lon < 180; lon += 9) {
      if (Math.abs(lon - LOCK.lon) < 6) continue;
      for (let v = 0; v < 360; v += 30) {
        // Desde fuera del vidrio hacia la línea central del tubo.
        const out = new Vector3(
          Math.cos((lon * Math.PI) / 180),
          Math.sin((lon * Math.PI) / 180),
          0,
        );
        const center = out.clone().multiplyScalar(TUBE_MAJOR);
        const around = out
          .clone()
          .multiplyScalar(Math.cos((v * Math.PI) / 180))
          .add(new Vector3(0, 0, Math.sin((v * Math.PI) / 180)));
        const from = toGltf(center.clone().addScaledVector(around, TUBE_MINOR + 1.5));
        const towards = toGltf(around.clone().negate());
        tried++;
        const hit = runtime.collision.raycast(from, towards, 3);
        if (hit !== null && hit < 1.8) blocked++;
      }
    }
    expect(blocked).toBe(tried);
  });

  it('lets the ship rest on the sea instead of sinking to the seabed', () => {
    const above = toGltf(direction(30, 60).multiplyScalar(SEA_LEVEL + 10));
    const down = above.clone().normalize().negate();

    // Sobre las olas: la nave sube y baja con ellas, nunca más que su altura.
    expect(Math.abs((runtime.hull.raycast(above, down, 40) ?? 0) - 10)).toBeLessThanOrEqual(
      WAVE_HEIGHT + 0.01,
    );
    expect(runtime.collision.raycast(above, down, 40)).toBeGreaterThan(20);
  });
});

/** Lleva al jugador por una serie de puntos: anda o nada hacia cada uno; sube (Espacio) o baja (Mayús) en el agua. */
function traverse(start: Vector3, waypoints: readonly Vector3[], limit: number) {
  const up = start.clone().normalize();
  const state = createCharacter(start, lookAlong(up, toGltf(new Vector3(0, 0, 1))));
  const breath = new Breath();
  let seconds = 0;
  let drowned = false;
  const reached: number[] = [];
  const bodyUp = new Vector3();
  for (const target of waypoints) {
    for (let t = 0; ; t += PHYSICS_STEP) {
      upOf(state.body, bodyUp);
      const offset = target.clone().sub(state.position);
      const rise = offset.dot(bodyUp);
      const flat = offset.clone().addScaledVector(bodyUp, -rise);
      const close = flat.length() < 0.45 && (!state.swimming || Math.abs(rise) < 0.7);
      if (close) break;
      if (t > limit) throw new Error(`no llega al punto ${String(reached.length)}`);
      // Se mira siempre hacia el punto: la intención es solo hacia delante.
      if (flat.lengthSq() > 1e-6) state.body.copy(lookAlong(bodyUp, flat));
      const intent: MoveIntent = {
        x: 0,
        z: flat.length() > 0.2 ? 1 : 0,
        run: state.swimming && rise < -0.15,
        jump: state.swimming && rise > 0.3,
      };
      stepCharacter(state, intent, env, PHYSICS_STEP);
      if (water && breath.update(headUnder(state.position, bodyUp, water), PHYSICS_STEP)) {
        drowned = true;
      }
      seconds += PHYSICS_STEP;
    }
    reached.push(seconds);
  }
  return { state, seconds, drowned, reached };
}

describe('the lock, the only way in', () => {
  it('is reached by diving: through the door, up the shaft and the two ramps, into the gallery', () => {
    const start = atLock([-0.6, -6, 0.2]);
    const route = [
      atLock([-0.6, 0.3, 0.9]), // por la puerta, pegado al fondo
      atLock([-0.6, 1.2, 3.6]), // sube por el pozo hasta la superficie
      atLock([1.0, 1.7, 3.6]), // al pie de la rampa
      atLock([1.0, -2.2, 6.0]), // rampa arriba, hacia el oeste
      atLock([0, -3.4, 6.0]), // a la cámara, al pie de la otra rampa
      atLock([0, -12, 8]), // y por el hueco del suelo, a la Galería
    ];

    const { state, seconds, drowned } = traverse(start, route, 20);

    expect(drowned).toBe(false);
    expect(seconds).toBeLessThan(BREATH_SECONDS);
    expect(state.swimming).toBe(false);
    expect(state.grounded).toBe(true);
    expect(state.position.length()).toBeCloseTo(FLOOR_RADIUS, 0);
  });

  it('opens into a shaft whose water ends where the dry tube begins', () => {
    expect(water && isWet(atLock([-0.6, 0, 3]), water)).toBe(true);
    expect(water && isWet(atLock([-0.6, 0, 5.6]), water)).toBe(false);
  });
});

describe('the open sea of the Archivo', () => {
  it('moves with the same waves the physics uses', () => {
    expect(water?.waves?.length).toBeGreaterThan(0);
    const sea = world.scene.getObjectByName('archivo_Mar');
    if (!(sea instanceof Mesh)) throw new Error('falta archivo_Mar');
    const uniforms = (sea.material as ShaderMaterial).uniforms;
    expect(uniforms.uWaveA?.value).toEqual(water?.waves?.map((w) => w.amplitude));
    expect(uniforms.uLevel?.value).toBe(SEA_LEVEL);
  });
});
