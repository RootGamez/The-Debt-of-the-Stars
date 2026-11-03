import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import {
  buildWorld,
  disposeWorld,
  loadWorld,
  parseWorld,
  worldUrl,
} from '../../src/worlds/loadWorld';

const ARCHIVO_GLB = fileURLToPath(new URL('../../public/models/archivo.glb', import.meta.url));

function readGlb(path: string): ArrayBuffer {
  const bytes = readFileSync(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('worldUrl', () => {
  it('points to the exported model inside public/models', () => {
    expect(worldUrl('archivo')).toBe(`${import.meta.env.BASE_URL}models/archivo.glb`);
  });
});

describe('parseWorld with a real exported world (the Archivo, still from Blender)', () => {
  it('keeps world data and every marker after Blender export and meshopt', async () => {
    const world = await parseWorld(readGlb(ARCHIVO_GLB), 'archivo');

    expect(world.info).toEqual({
      id: 'archivo',
      radius: 70,
      gravity: 1.5,
      clockRate: 0.8,
      ambient: { color: 0x8fa4c4, intensity: 1.8 },
    });
    expect([...world.markers.spawns.keys()]).toEqual(['SPAWN_Borde']);
    expect(world.markers.colliders.map((c) => c.name).sort()).toEqual([
      'COL_archivo_Lugares',
      'COL_archivo_Terreno',
    ]);
  });

  it('computes world matrices so markers can be used before the first render', async () => {
    const world = await parseWorld(readGlb(ARCHIVO_GLB), 'archivo');
    const spawn = world.markers.spawns.get('SPAWN_Borde');

    expect(spawn?.matrixWorld.elements.some((v, i) => i >= 12 && i < 15 && v !== 0)).toBe(true);
  });
});

describe('buildWorld (worlds modelled in code, Phase 11)', () => {
  it('builds Umbral with the same shape the exported model had', () => {
    const world = buildWorld('umbral');

    expect(world?.info).toEqual({
      id: 'umbral',
      radius: 90,
      gravity: 1,
      clockRate: 1,
      ambient: { color: 0x7a6a8c, intensity: 0.35 },
    });
    expect([...(world?.markers.spawns.keys() ?? [])]).toEqual(['SPAWN_LaBoca']);
    expect([...(world?.markers.parks.keys() ?? [])]).toEqual(['PARK_Nave']);
    expect(world?.markers.interactions.map((i) => i.clueId).sort()).toEqual([
      'umbral.aula',
      'umbral.boca',
      'umbral.carta',
      'umbral.casas',
      'umbral.cuaderno',
      'umbral.envios',
      'umbral.placa',
    ]);
    expect(world?.markers.triggers.map((t) => t.event)).toEqual(['boca_destello']);
    expect(world?.markers.eventProps.map((p) => p.event)).toEqual(['boca_destello']);
    expect(world?.markers.colliders.map((c) => c.name).sort()).toEqual([
      'COL_umbral_Lugares',
      'COL_umbral_Terreno',
    ]);
  });

  it('computes world matrices so markers can be used before the first render', () => {
    const spawn = buildWorld('umbral')?.markers.spawns.get('SPAWN_LaBoca');

    expect(spawn?.matrixWorld.elements.some((v, i) => i >= 12 && i < 15 && v !== 0)).toBe(true);
  });

  it('leaves the worlds not migrated yet to their exported model', () => {
    expect(buildWorld('archivo')).toBeUndefined();
  });

  it('is what loadWorld returns for a world modelled in code (no download)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const world = await loadWorld('umbral');

    expect(world.info.id).toBe('umbral');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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
