// La nave exportada de Blender (public/models/nave.glb) trae lo que el juego necesita y está aparcada
// donde tiene sentido: a la vista de la llegada, pero sin pisarla.
import { DoubleSide, Vector3, type Material, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { spawnOnGround } from '../../src/physics/spawn';
import { parseShipModel } from '../../src/ship/loadShip';
import { isMesh } from '../../src/worlds/markers';
import { createWorldRuntime } from '../../src/worlds/worldRuntime';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadBuiltWorld } from '../helpers/builtWorlds';

async function loadNave() {
  const bytes = readFileSync(
    fileURLToPath(new URL('../../public/models/nave.glb', import.meta.url)),
  );
  return parseShipModel(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function triangles(mesh: Mesh): number {
  const { index, attributes } = mesh.geometry;
  return (index ? index.count : (attributes.position?.count ?? 0)) / 3;
}

describe('the ship model', () => {
  it('collides as a sphere of 2 m and keeps the pilot inside the cockpit, facing forward', async () => {
    const nave = await loadNave();

    expect(nave.radius).toBe(2);
    expect(nave.seatOffset.x).toBeCloseTo(0, 3);
    expect(nave.seatOffset.y).toBeGreaterThan(0.2); // por encima del centro
    expect(nave.seatOffset.z).toBeLessThan(-0.3); // hacia proa (−Z)
    expect(nave.seatOffset.length()).toBeLessThan(nave.radius);
  });

  it('opens the hatch on the port side, at ground level and outside the hull', async () => {
    const nave = await loadNave();

    expect(nave.exitOffset.x).toBeLessThan(-1.5);
    expect(nave.exitOffset.y).toBeCloseTo(-nave.radius, 3);
    expect(nave.exitOffset.length()).toBeGreaterThan(nave.radius);
  });

  it('stays within the triangle budget of the ship (1 to 3 thousand)', async () => {
    const nave = await loadNave();
    let total = 0;
    nave.object.traverse((object) => {
      if (isMesh(object)) total += triangles(object);
    });

    expect(total).toBeGreaterThanOrEqual(1000);
    expect(total).toBeLessThanOrEqual(3000);
  });

  it('has glowing engines that the game can brighten with the thrust', async () => {
    const nave = await loadNave();

    expect(nave.engine).toBeDefined();
    const material = nave.engine?.material as Material & { emissive?: { r: number } };
    expect(material.emissive?.r ?? 0).toBeGreaterThan(0);
  });

  it('has a see-through glass bubble, visible from both sides', async () => {
    const nave = await loadNave();
    const material = nave.glass?.material as Material | undefined;

    expect(material?.transparent).toBe(true);
    expect(material?.opacity ?? 1).toBeLessThan(0.6);
    expect(material?.side).toBe(DoubleSide);
    expect(material?.depthWrite).toBe(false);
  });

  it('paints the hull with vertex colours (one palette, no textures)', async () => {
    const nave = await loadNave();
    const hull = nave.object.getObjectByName('nave_Casco');
    if (!hull || !isMesh(hull)) throw new Error('falta nave_Casco');

    expect(hull.geometry.attributes.color).toBeDefined();
  });
});

describe('where the ship waits in Umbral', () => {
  it('is in sight of the arrival but far enough not to be on top of it', async () => {
    const [nave, world] = await Promise.all([loadNave(), loadBuiltWorld('umbral')]);
    const runtime = createWorldRuntime(world);
    const park = runtime.world.markers.parks.get('PARK_Nave');
    if (!park) throw new Error('falta PARK_Nave');
    const parked = spawnOnGround(park, runtime.collision, runtime.well.center);
    const up = parked.feet.clone().sub(runtime.well.center).normalize();
    const center = parked.feet.clone().addScaledVector(up, nave.radius);
    const arrival = runtime.spawn.feet;

    expect(arrival.distanceTo(center)).toBeGreaterThan(nave.radius + 4);
    expect(arrival.distanceTo(center)).toBeLessThan(25);
    const hatch = nave.exitOffset.clone().applyQuaternion(parked.body).add(center);
    expect(hatch.distanceTo(new Vector3())).toBeGreaterThan(runtime.well.radius * 0.8);
  });
});
