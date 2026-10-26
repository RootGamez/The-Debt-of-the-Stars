import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { describe, expect, it } from 'vitest';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

async function loadNave() {
  const bytes = readFileSync(
    fileURLToPath(new URL('../../public/models/nave.glb', import.meta.url)),
  );
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await loader.parseAsync(data, '');
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}

describe('nave 3D model (El Albatros II)', () => {
  it('loads successfully from public/models/nave.glb', async () => {
    const scene = await loadNave();
    expect(scene).toBeDefined();
  });

  it('contains the root nave node with collision_radius 2.0', async () => {
    const scene = await loadNave();
    const root = scene.getObjectByName('nave');
    expect(root).toBeDefined();
    expect(root?.userData.collision_radius).toBe(2.0);
  });

  it('contains the SEAT_Piloto and EXIT_Escotilla markers', async () => {
    const scene = await loadNave();
    const seat = scene.getObjectByName('SEAT_Piloto');
    const exit = scene.getObjectByName('EXIT_Escotilla');

    expect(seat).toBeDefined();
    expect(exit).toBeDefined();

    // En glTF / Three.js: Y es arriba, -Z es proa (+Y en Blender -> -Z en Three.js, +Z en Blender -> +Y en Three.js)
    // El asiento está dentro de la cabina (x centrado, z hacia proa -Z, y elevado +Y)
    expect(seat?.position.x).toBeCloseTo(0, 1);
    expect(seat?.position.y).toBeGreaterThan(0.2); // altura sobre el centro (Blender Z = 0.45)
    expect(seat?.position.z).toBeLessThan(-0.4); // hacia proa (Blender Y = 0.75 -> Three.js Z = -0.75)

    // La escotilla de salida está a la altura del suelo (Three.js Y = -2.0 m)
    expect(exit?.position.y).toBeCloseTo(-2.0, 1);
    expect(exit?.position.x).toBeGreaterThan(1.5);
  });

  it('has a single hull mesh within polygon budget (1000 - 3000 triangles)', async () => {
    const scene = await loadNave();
    const casco = scene.getObjectByName('nave_Casco');
    expect(casco).toBeDefined();
    if (!casco || !('isMesh' in casco)) throw new Error('nave_Casco debe ser una Mesh');

    const geom = (casco as Mesh).geometry;
    const index = geom.index;
    const pos = geom.attributes.position;
    const triangles = index ? index.count / 3 : pos ? pos.count / 3 : 0;

    expect(triangles).toBeGreaterThanOrEqual(1000);
    expect(triangles).toBeLessThanOrEqual(3000);
  });

  it('has vertex color attributes for stylized shading', async () => {
    const scene = await loadNave();
    const casco = scene.getObjectByName('nave_Casco');
    expect(casco).toBeDefined();
    if (!casco || !('isMesh' in casco)) throw new Error('nave_Casco debe ser una Mesh');

    const geom = (casco as Mesh).geometry;
    const hasColor = 'color' in geom.attributes || '_color' in geom.attributes;
    expect(hasColor).toBe(true);
  });
});
