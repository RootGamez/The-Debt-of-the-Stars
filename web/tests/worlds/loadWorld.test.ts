import { describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
} from 'three';
import { buildWorld, disposeWorld, loadWorld } from '../../src/worlds/loadWorld';
import { WorldDataError } from '../../src/worlds/markers';

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
    expect([...(world?.markers.spawns.keys() ?? [])].sort()).toEqual([
      'SPAWN_Despertar',
      'SPAWN_LaBoca',
    ]);
    expect([...(world?.markers.parks.keys() ?? [])].sort()).toEqual(['PARK_Caida', 'PARK_Nave']);
    expect(world?.markers.interactions.map((i) => i.clueId).sort()).toEqual([
      'umbral.atril',
      'umbral.aula',
      'umbral.boca',
      'umbral.campanas',
      'umbral.canal',
      'umbral.canal',
      'umbral.canal',
      'umbral.canal',
      'umbral.carta',
      'umbral.casas',
      'umbral.consola_mando',
      'umbral.cuaderno',
      'umbral.cuenta_ninos',
      'umbral.envios',
      'umbral.hoja_entrada',
      'umbral.llegada',
      'umbral.mesa_tallista',
      'umbral.mural',
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

  it('has no world for an id without a builder', () => {
    expect(buildWorld('sin-constructor')).toBeUndefined();
  });

  it('is what loadWorld returns, without downloading anything', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const world = loadWorld('umbral');

    expect(world.info.id).toBe('umbral');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('fails clearly when asked for a world that does not exist', () => {
    expect(() => loadWorld('sin-constructor')).toThrow(WorldDataError);
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

  it('also releases the dust of a world with wind (Points)', () => {
    const geometry = new BufferGeometry();
    const material = new PointsMaterial();
    const scene = new Group();
    scene.add(new Points(geometry, material));
    const disposeGeometry = vi.spyOn(geometry, 'dispose');
    const disposeMaterial = vi.spyOn(material, 'dispose');

    disposeWorld(scene);

    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
  });
});
