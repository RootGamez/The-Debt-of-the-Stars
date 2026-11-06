// Las estructuras nuevas de Umbral (Fase 11): están donde dicen, son sólidas y no cierran el paso.
import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { PHYSICS_STEP } from '../../../src/data/movement';
import { createCharacter, stepCharacter } from '../../../src/physics/characterMotor';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { isMesh } from '../../../src/worlds/markers';
import { direction, triangleCount } from '../../../src/worlds/procedural/kit';
import { UMBRAL_RADIUS } from '../../../src/worlds/procedural/umbral';
import { annulus, LANDMARKS } from '../../../src/worlds/procedural/umbralLandmarks';
import { createWorldRuntime, environmentOf } from '../../../src/worlds/worldRuntime';

const world = buildWorld('umbral');
if (!world) throw new Error('Umbral debería construirse por código');
const runtime = createWorldRuntime(world);

/** Del marco de Blender (Z arriba) al de glTF (Y arriba), donde viven las mallas y las marcas. */
const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);
const surfaceAt = (lat: number, lon: number): Vector3 =>
  toGltf(direction(lat, lon)).multiplyScalar(UMBRAL_RADIUS);

describe('annulus', () => {
  it('closes a full ring with top and both walls, and caps a partial one', () => {
    expect(triangleCount(annulus(2, 3, 1, 10))).toBe(10 * 6);
    expect(triangleCount(annulus(2, 3, 1, 10, 0, Math.PI))).toBe(10 * 6 + 4);
  });

  it('stays between its two radii and its height', () => {
    const geometry = annulus(4, 6, 2, 16);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;

    expect(box?.max.z).toBeCloseTo(1);
    expect(box?.min.z).toBeCloseTo(-1);
    expect(box?.max.x).toBeCloseTo(6);
  });
});

describe('the new places of Umbral', () => {
  const places = world.scene.getObjectByName('COL_umbral_Lugares');
  const solid = places && isMesh(places) ? places.geometry.getAttribute('position') : undefined;

  it.each(Object.entries(LANDMARKS))('%s is built and solid on its own ground', (_id, site) => {
    if (!solid) throw new Error('falta COL_umbral_Lugares');
    const center = surfaceAt(site.lat, site.lon);
    const p = new Vector3();
    let near = 0;
    for (let i = 0; i < solid.count; i++) {
      p.fromBufferAttribute(solid, i).applyMatrix4(places?.matrixWorld ?? new Matrix4());
      if (p.distanceTo(center) < site.pad + 2) near++;
    }

    expect(near).toBeGreaterThan(60);
  });

  it('keeps away from the places with clues and from where the ship waits', () => {
    // El Anfiteatro lleva sus propias fuentes (las campanas, P1): lo demás debe quedar lejos de él.
    const own = new Set(['umbral.campanas', 'umbral.canal', 'umbral.atril']);
    const parks = [...runtime.world.markers.parks.values()];
    const others = runtime.world.markers.interactions.filter((i) => !own.has(i.clueId));

    for (const [name, site] of Object.entries(LANDMARKS)) {
      const marks = name === 'amphitheatre' ? others : runtime.world.markers.interactions;
      const taken = [...marks.map((i) => i.object), ...parks].map((o) =>
        o.getWorldPosition(new Vector3()),
      );
      const center = surfaceAt(site.lat, site.lon);
      const closest = Math.min(...taken.map((t) => t.distanceTo(center)));
      expect(closest, name).toBeGreaterThan(site.pad + 4);
    }
  });
});

/** Camina en línea recta de `fromDir` hacia `toDir` (direcciones glTF) durante `seconds`. */
function walkTowards(fromDir: Vector3, toDir: Vector3, seconds: number) {
  const up = fromDir.clone().normalize();
  const forward = toDir.clone().sub(up);
  forward.addScaledVector(up, -forward.dot(up)).normalize();
  const back = forward.clone().negate(); // la cámara mira hacia −Z
  const side = up.clone().cross(back).normalize();
  const body = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(side, up, back));
  const ground = runtime.collision.raycast(
    up.clone().multiplyScalar(UMBRAL_RADIUS + 20),
    up.clone().negate(),
    40,
  );
  if (ground === null) throw new Error('sin suelo');
  const feet = up.clone().multiplyScalar(UMBRAL_RADIUS + 20 - ground + 0.05);
  const state = createCharacter(feet, body);
  const env = environmentOf(runtime);
  const walk = { x: 0, z: 1, run: false, jump: false };
  for (let i = 0; i < seconds / PHYSICS_STEP; i++) stepCharacter(state, walk, env, PHYSICS_STEP);
  return { feet, forward, position: state.position };
}

describe('the Amphitheatre', () => {
  it('opens towards the Casas: coming from there you walk straight to the middle', () => {
    const site = LANDMARKS.amphitheatre;
    const center = toGltf(direction(site.lat, site.lon));
    const plaza = toGltf(direction(5, 150));
    // A 14 m del centro, en el camino que llega de la plaza.
    const start = center
      .clone()
      .lerp(plaza, 14 / (center.angleTo(plaza) * UMBRAL_RADIUS))
      .normalize();

    const { position } = walkTowards(start, center, 9);

    expect(position.clone().normalize().angleTo(center) * UMBRAL_RADIUS).toBeLessThan(3);
  });
});

describe('the Way of the Rings', () => {
  it('lets the traveller walk through, from La Boca towards the Muelle', () => {
    const mouth = toGltf(direction(8, 22.5));
    const dock = toGltf(direction(-5, 40));
    // Desde un poco antes del primer anillo, caminando hacia el Muelle por el camino.
    const startDir = mouth.clone().lerp(dock, 0.36).normalize();
    const up = startDir.clone();
    const forward = dock.clone().sub(startDir);
    forward.addScaledVector(up, -forward.dot(up)).normalize();
    const back = forward.clone().negate(); // la cámara mira hacia −Z
    const side = up.clone().cross(back).normalize();
    const body = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(side, up, back));
    const ground = runtime.collision.raycast(
      up.clone().multiplyScalar(UMBRAL_RADIUS + 20),
      up.clone().negate(),
      40,
    );
    if (ground === null) throw new Error('sin suelo en el camino');
    const feet = up.clone().multiplyScalar(UMBRAL_RADIUS + 20 - ground + 0.05);
    const state = createCharacter(feet, body);
    const env = environmentOf(runtime);
    const walk = { x: 0, z: 1, run: false, jump: false };

    for (let i = 0; i < 9 / PHYSICS_STEP; i++) stepCharacter(state, walk, env, PHYSICS_STEP);

    // Las tres paradas quedan entre el 42 % y el 66 % del camino (unos 8 m): hay que pasarlas todas.
    const travelled = state.position.clone().sub(feet).dot(forward);
    expect(travelled).toBeGreaterThan(9);
  });
});
