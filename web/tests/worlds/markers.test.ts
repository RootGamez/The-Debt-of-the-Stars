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

describe('the Ool of a world (OOL_)', () => {
  it('finds each one with the mesh that glows, and not that mesh as another one', () => {
    const scene = new Group();
    const maestra = mesh('OOL_maestra');
    const luz = mesh('OOL_maestra_Luz');
    maestra.add(luz);
    scene.add(maestra, mesh('OOL_cria'));

    const { characters } = collectMarkers(scene);

    expect(characters.map((c) => c.id)).toEqual(['maestra', 'cria']);
    expect(characters[0]?.glow).toBe(luz);
    expect(characters[1]?.glow).toBeUndefined();
  });

  it('accepts chats among the interactions', () => {
    const scene = new Group();
    scene.add(node('INT_directora', { clue_id: 'instituto.directora', kind: 'charla' }));

    expect(collectMarkers(scene).interactions[0]?.kind).toBe('charla');
  });
});

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

describe('a hollow world (the Nudo)', () => {
  function hollow(extra: Record<string, unknown> = {}) {
    const scene = umbralScene();
    const root = scene.getObjectByName('umbral');
    if (!root) throw new Error('test setup');
    Object.assign(root.userData, { radius: 25, inner_radius: 21, ...extra });
    return scene;
  }

  it('reads the radius of its cavity and the light inside', () => {
    const info = readWorldInfo(
      hollow({ interior_light: 2, interior_light_color: '#C0D8C8' }),
      'umbral',
    );

    expect(info.innerRadius).toBe(21);
    expect(info.interiorLight).toEqual({ color: 0xc0d8c8, intensity: 2 });
  });

  it('is an ordinary world without a cavity', () => {
    const info = readWorldInfo(umbralScene(), 'umbral');

    expect(info.innerRadius).toBeUndefined();
    expect(info.interiorLight).toBeUndefined();
  });

  it('reads where the gravity turns around and which tide fills the cavity', () => {
    const info = readWorldInfo(
      hollow({
        interior_light: 2,
        interior_light_color: '#C0D8C8',
        cavity_limit: 22,
        cavity_tide: 'nucleo',
      }),
      'umbral',
    );

    expect(info.cavityLimit).toBe(22);
    expect(info.cavityTide).toBe('nucleo');
  });

  it('defaults to the tide of the seed (the Nudo)', () => {
    const info = readWorldInfo(
      hollow({ interior_light: 2, interior_light_color: '#C0D8C8' }),
      'umbral',
    );

    expect(info.cavityLimit).toBeUndefined();
    expect(info.cavityTide).toBe('semilla');
  });

  it('rejects a turning point outside the shell or an unknown tide', () => {
    const light = { interior_light: 2, interior_light_color: '#C0D8C8' };
    expect(() => readWorldInfo(hollow({ ...light, cavity_limit: 20 }), 'umbral')).toThrow(
      /cavity_limit/,
    );
    expect(() => readWorldInfo(hollow({ ...light, cavity_limit: 25 }), 'umbral')).toThrow(
      /cavity_limit/,
    );
    expect(() => readWorldInfo(hollow({ ...light, cavity_tide: 'luna' }), 'umbral')).toThrow(
      /cavity_tide/,
    );
  });

  it('reads the holes of the shell, four numbers each, and rejects broken ones', () => {
    const light = { interior_light: 2, interior_light_color: '#C0D8C8' };
    const info = readWorldInfo(hollow({ ...light, cavity_holes: [0, 2, 0, 0.3] }), 'umbral');
    expect(info.cavityHoles).toHaveLength(1);
    expect(info.cavityHoles?.[0]?.axis.toArray()).toEqual([0, 1, 0]);
    expect(info.cavityHoles?.[0]?.angle).toBe(0.3);
    expect(readWorldInfo(hollow(light), 'umbral').cavityHoles).toBeUndefined();
    for (const bad of [[0, 1, 0], [0, 0, 0, 0.3], [0, 1, 0, 2], ['x', 1, 0, 0.3], 'ojos']) {
      expect(() => readWorldInfo(hollow({ ...light, cavity_holes: bad }), 'umbral')).toThrow(
        /cavity_holes/,
      );
    }
  });

  it('rejects a cavity as big as the world', () => {
    expect(() => readWorldInfo(hollow({ inner_radius: 25 }), 'umbral')).toThrow(/inner_radius/);
  });
});

describe('folded gates (PASO_)', () => {
  it('collects the two twin rings with their destination', () => {
    const scene = umbralScene();
    const out = node('PASO_Boca', { destino: 'PASO_Dentro' });
    const back = node('PASO_Dentro', { destino: 'PASO_Boca' });
    scene.add(out, back);

    const { gates } = collectMarkers(scene);

    expect(gates).toEqual([
      { name: 'PASO_Boca', object: out, target: 'PASO_Dentro' },
      { name: 'PASO_Dentro', object: back, target: 'PASO_Boca' },
    ]);
  });

  it('needs a destination', () => {
    const scene = umbralScene();
    scene.add(node('PASO_Suelto'));

    expect(() => collectMarkers(scene)).toThrow(/destino/);
  });

  it('rejects a destination that is not another ring of the same world', () => {
    const scene = umbralScene();
    scene.add(node('PASO_Boca', { destino: 'PASO_Inexistente' }));

    expect(() => collectMarkers(scene)).toThrow(/PASO_Inexistente/);
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

describe('the Taller of gas (Phase 11F)', () => {
  it('reads a ring that only the game can open', () => {
    const scene = umbralScene();
    const out = node('PASO_Pista', { destino: 'PASO_Centro', cerradura: 'pista' });
    scene.add(out, node('PASO_Centro', { destino: 'PASO_Pista' }));

    const { gates } = collectMarkers(scene);

    expect(gates.map((g) => [g.name, g.lock])).toEqual([
      ['PASO_Pista', 'pista'],
      ['PASO_Centro', undefined],
    ]);
  });

  it('keeps the colliders of an event apart from the ones that are always there', () => {
    const scene = umbralScene();
    const bridges = mesh('COL_Taller_Puentes');
    bridges.userData = { event: 'secuencia_fabrica' };
    scene.add(bridges);

    const markers = collectMarkers(scene);

    expect(markers.colliders.map((c) => c.name)).toEqual(['COL_umbral_Terreno']);
    expect(markers.eventColliders).toEqual([{ event: 'secuencia_fabrica', mesh: bridges }]);
    expect(bridges.visible).toBe(false);
  });

  it('reads the layer of gas that kills, with its safe room in the middle', () => {
    const scene = new Group();
    scene.add(
      node('taller', {
        radius: 80,
        gravity: 0.6,
        clock_rate: 0.85,
        gas_lethal_radius: 74,
        gas_safe_radius: 22,
      }),
    );

    expect(readWorldInfo(scene, 'taller').gas).toEqual({ lethal: 74, safe: 22 });
  });

  it('rejects a safe room as big as the gas around it', () => {
    const scene = new Group();
    scene.add(
      node('taller', {
        radius: 80,
        gravity: 0.6,
        clock_rate: 0.85,
        gas_lethal_radius: 20,
        gas_safe_radius: 22,
      }),
    );

    expect(() => readWorldInfo(scene, 'taller')).toThrow(WorldDataError);
  });
});
