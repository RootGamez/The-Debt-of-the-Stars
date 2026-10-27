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
    node('PARK_Nave'),
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

    const nested = markers.colliders.filter((m) => m.name.startsWith('COL_Casa_'));
    expect(nested.map((m) => m.name)).toEqual(['COL_Casa_0', 'COL_Casa_1']);
    expect(nested.every((m) => !m.visible)).toBe(true);
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

  it.each([
    ['radius', 0],
    ['radius', -3],
    ['loop_time', -1],
    ['duration', 0],
  ])('rejects a trigger with invalid %s = %d', (key, value) => {
    const scene = umbralScene();
    scene.add(node('TRIG_malo', { event: 'x', [key]: value }));

    expect(() => collectMarkers(scene)).toThrow(new RegExp(`TRIG_malo.*${key}`));
  });

  it('accepts a trigger at the very start of the loop', () => {
    const scene = umbralScene();
    scene.add(node('TRIG_inicio', { event: 'x', loop_time: 0 }));

    const trigger = collectMarkers(scene).triggers.find((t) => t.name === 'TRIG_inicio');

    expect(trigger?.loopTime).toBe(0);
  });
});

describe('readWorldInfo ranges', () => {
  it.each(['radius', 'gravity', 'clock_rate'])('rejects %s <= 0', (key) => {
    const scene = umbralScene();
    const root = scene.getObjectByName('umbral');
    if (!root) throw new Error('test setup');
    root.userData[key] = 0;

    expect(() => readWorldInfo(scene, 'umbral')).toThrow(new RegExp(key));
  });
});

describe('interaction kinds', () => {
  it.each(['texto', 'grabacion', 'objeto', 'observacion'])('accepts the kind %s', (kind) => {
    const scene = umbralScene();
    scene.add(node('INT_nueva', { clue_id: 'umbral.nueva', kind }));

    const found = collectMarkers(scene).interactions.find((i) => i.name === 'INT_nueva');

    expect(found?.kind).toBe(kind);
  });
});

describe('parking marks (PARK_)', () => {
  it('collects where the ship waits, apart from the player spawn points', () => {
    const markers = collectMarkers(umbralScene());

    expect([...markers.parks.keys()]).toEqual(['PARK_Nave']);
    expect([...markers.spawns.keys()]).toEqual(['SPAWN_LaBoca']);
  });

  it('is empty in a world without a parking spot', () => {
    expect(collectMarkers(new Group()).parks.size).toBe(0);
  });
});

describe('event props (EVT_)', () => {
  it('collects what only shows during an event, hidden until then', () => {
    const scene = umbralScene();
    const beam = mesh('EVT_ranura_luz_Haz');
    beam.userData = { event: 'ranura_luz' };
    scene.add(beam);

    const markers = collectMarkers(scene);

    expect(markers.eventProps).toEqual([{ event: 'ranura_luz', object: beam }]);
    expect(beam.visible).toBe(false);
  });

  it('needs the event name', () => {
    const scene = umbralScene();
    scene.add(mesh('EVT_sin_evento'));

    expect(() => collectMarkers(scene)).toThrow(/event/);
  });
});

describe('ambient light of a world', () => {
  it('reads its own ambient light when the world has one', () => {
    const scene = umbralScene();
    const root = scene.getObjectByName('umbral');
    if (!root) throw new Error('test setup');
    root.userData.ambient = 1.6;
    root.userData.ambient_color = '#8AA0C0';

    expect(readWorldInfo(scene, 'umbral').ambient).toEqual({ color: 0x8aa0c0, intensity: 1.6 });
  });

  it('has none by default (the game uses its general ambient light)', () => {
    expect(readWorldInfo(umbralScene(), 'umbral').ambient).toBeUndefined();
  });

  it('rejects a colour that is not #rrggbb', () => {
    const scene = umbralScene();
    const root = scene.getObjectByName('umbral');
    if (!root) throw new Error('test setup');
    root.userData.ambient = 1.2;
    root.userData.ambient_color = 'azul';

    expect(() => readWorldInfo(scene, 'umbral')).toThrow(/ambient_color/);
  });
});

describe('animated parts (ANIM_)', () => {
  it('collects parts that turn, always or only during an event', () => {
    const scene = umbralScene();
    const arm = mesh('ANIM_brazo_1');
    arm.userData = { spin: 0.4 };
    const core = mesh('ANIM_nucleo');
    core.userData = { spin: 2, event: 'secuencia_fabrica' };
    scene.add(arm, core);

    const markers = collectMarkers(scene);

    expect(markers.animated).toEqual([
      { object: arm, spin: 0.4, event: undefined },
      { object: core, spin: 2, event: 'secuencia_fabrica' },
    ]);
  });

  it('needs a spin speed', () => {
    const scene = umbralScene();
    scene.add(mesh('ANIM_quieto'));

    expect(() => collectMarkers(scene)).toThrow(/spin/);
  });
});
