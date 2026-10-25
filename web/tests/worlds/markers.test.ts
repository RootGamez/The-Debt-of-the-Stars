import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { collectMarkers, readWorldInfo, WorldDataError } from '../../src/worlds/markers';

function node(name: string, userData: Record<string, unknown> = {}): Object3D {
  const o = new Object3D();
  o.name = name;
  o.userData = userData;
  return o;
}

function mesh(name: string): Mesh {
  const m = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  m.name = name;
  return m;
}

function umbralScene(): Group {
  const scene = new Group();
  const root = node('umbral', { world_id: 'umbral', radius: 90, gravity: 1, clock_rate: 1 });
  root.add(
    mesh('umbral_Terreno'),
    mesh('COL_umbral_Terreno'),
    node('SPAWN_LaBoca'),
    node('INT_placa_inauguracion', { clue_id: 'umbral.placa', kind: 'texto' }),
    node('TRIG_LaBoca_Destello', {
      event: 'boca_destello',
      loop_time: 600,
      duration: 3,
      radius: 12,
    }),
  );
  scene.add(root);
  return scene;
}

describe('readWorldInfo', () => {
  it('reads radius, gravity and clock rate from the world root', () => {
    const info = readWorldInfo(umbralScene(), 'umbral');

    expect(info).toEqual({ id: 'umbral', radius: 90, gravity: 1, clockRate: 1 });
  });

  it('throws when the world root is missing', () => {
    expect(() => readWorldInfo(umbralScene(), 'archivo')).toThrow(WorldDataError);
  });

  it('throws with the field name when a property is not a number', () => {
    const scene = umbralScene();
    const root = scene.getObjectByName('umbral');
    if (!root) throw new Error('test setup');
    root.userData.radius = 'noventa';

    expect(() => readWorldInfo(scene, 'umbral')).toThrow(/radius/);
  });
});

describe('collectMarkers', () => {
  it('hides collision meshes and keeps them apart from visible geometry', () => {
    const markers = collectMarkers(umbralScene());

    expect(markers.colliders.map((m) => m.name)).toEqual(['COL_umbral_Terreno']);
    expect(markers.colliders.every((m) => !m.visible)).toBe(true);
  });

  it('collects collision meshes nested inside a COL_ group', () => {
    const scene = umbralScene();
    const group = node('COL_Casa');
    group.add(mesh('COL_Casa_0'), mesh('COL_Casa_1'));
    scene.add(group);

    const markers = collectMarkers(scene);

    expect(markers.colliders.map((m) => m.name)).toContain('COL_Casa_1');
    expect(group.visible).toBe(false);
  });

  it('indexes spawn points by name', () => {
    const markers = collectMarkers(umbralScene());

    expect(markers.spawns.get('SPAWN_LaBoca')?.name).toBe('SPAWN_LaBoca');
  });

  it('reads interaction clue ids and kinds', () => {
    const [interaction] = collectMarkers(umbralScene()).interactions;

    expect(interaction).toMatchObject({
      name: 'INT_placa_inauguracion',
      clueId: 'umbral.placa',
      kind: 'texto',
    });
  });

  it('reads trigger timing and radius', () => {
    const [trigger] = collectMarkers(umbralScene()).triggers;

    expect(trigger).toMatchObject({
      name: 'TRIG_LaBoca_Destello',
      event: 'boca_destello',
      loopTime: 600,
      duration: 3,
      radius: 12,
    });
  });

  it('defaults trigger radius and leaves optional timing undefined', () => {
    const scene = umbralScene();
    scene.add(node('TRIG_Mirador', { event: 'mirador' }));

    const trigger = collectMarkers(scene).triggers.find((t) => t.name === 'TRIG_Mirador');

    expect(trigger).toMatchObject({ radius: 5, loopTime: undefined, duration: undefined });
  });

  it('rejects an interaction without clue id', () => {
    const scene = umbralScene();
    scene.add(node('INT_sin_pista', { kind: 'texto' }));

    expect(() => collectMarkers(scene)).toThrow(/INT_sin_pista.*clue_id/);
  });

  it('rejects an interaction with an unknown kind', () => {
    const scene = umbralScene();
    scene.add(node('INT_raro', { clue_id: 'x', kind: 'video' }));

    expect(() => collectMarkers(scene)).toThrow(/INT_raro.*kind/);
  });

  it('rejects a trigger without event', () => {
    const scene = umbralScene();
    scene.add(node('TRIG_vacio'));

    expect(() => collectMarkers(scene)).toThrow(/TRIG_vacio.*event/);
  });

  it('rejects duplicated spawn names', () => {
    const scene = umbralScene();
    scene.add(node('SPAWN_LaBoca'));

    expect(() => collectMarkers(scene)).toThrow(/SPAWN_LaBoca/);
  });
});
