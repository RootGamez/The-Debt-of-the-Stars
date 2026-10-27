import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { disposeWorld, parseWorld, worldUrl } from '../../src/worlds/loadWorld';

const UMBRAL_GLB = fileURLToPath(new URL('../../public/models/umbral.glb', import.meta.url));

function readGlb(path: string): ArrayBuffer {
  const bytes = readFileSync(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('worldUrl', () => {
  it('points to the exported model inside public/models', () => {
    expect(worldUrl('umbral')).toBe(`${import.meta.env.BASE_URL}models/umbral.glb`);
  });
});

describe('parseWorld with the real exported Umbral', () => {
  it('keeps world data and every marker after Blender export and meshopt', async () => {
    const world = await parseWorld(readGlb(UMBRAL_GLB), 'umbral');

    expect(world.info).toEqual({ id: 'umbral', radius: 90, gravity: 1, clockRate: 1 });
    expect([...world.markers.spawns.keys()]).toEqual(['SPAWN_LaBoca']);
    expect(world.markers.interactions.map((i) => i.clueId).sort()).toEqual([
      'umbral.aula',
      'umbral.boca',
      'umbral.carta',
      'umbral.casas',
      'umbral.cuaderno',
      'umbral.envios',
      'umbral.placa',
    ]);
    expect(world.markers.triggers.map((t) => t.event)).toEqual(['boca_destello']);
    // El terreno y los lugares de arte_umbral.py (Fase 6).
    expect(world.markers.colliders.map((c) => c.name).sort()).toEqual([
      'COL_umbral_Lugares',
      'COL_umbral_Terreno',
    ]);
  });

  it('computes world matrices so markers can be used before the first render', async () => {
    const world = await parseWorld(readGlb(UMBRAL_GLB), 'umbral');
    const spawn = world.markers.spawns.get('SPAWN_LaBoca');

    expect(spawn?.matrixWorld.elements.some((v, i) => i >= 12 && i < 15 && v !== 0)).toBe(true);
  });
});

describe('disposeWorld', () => {
  it('releases geometries and materials of every mesh', () => {
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial();
    const scene = new Group();
    scene.add(new Mesh(geometry, material));
    const disposeGeometry = vi.spyOn(geometry, 'dispose');
    const disposeMaterial = vi.spyOn(material, 'dispose');

    disposeWorld(scene);

    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
  });
});
