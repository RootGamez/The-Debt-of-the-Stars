import { describe, expect, it } from 'vitest';
import homeData from '../../src/data/sistema-hogar.json';
import systemData from '../../src/data/sistema.json';
import { systemOf } from '../../src/game/loadSystem';
import { bodyPose } from '../../src/system/orbits';
import { parseSystem } from '../../src/system/systemData';
import { WORLD_IDS } from '../../src/worlds/worldSelection';
import { builtWorldInfo } from '../helpers/builtWorlds';

const valid = {
  estrella: { radio: 100 },
  cuerpos: [
    { mundo: 'taller', orbita: 500, periodo: 180, fase: 0, rotacion: 180 },
    {
      mundo: 'umbral',
      orbita: 1900,
      periodo: 1350,
      fase: 1,
      rotacion: 'bloqueada',
      faseRotacion: 2,
    },
  ],
};

function withBody(patch: Record<string, unknown>) {
  const [first, ...rest] = valid.cuerpos;
  return { ...valid, cuerpos: [{ ...first, ...patch }, ...rest] };
}

describe('parseSystem', () => {
  it('reads where the ship waits and whether the loop runs (yes unless it says no)', () => {
    expect(parseSystem(valid, WORLD_IDS)).toMatchObject({ ship: undefined, looping: true });
    expect(parseSystem({ ...valid, nave: 'umbral', bucle: false }, WORLD_IDS)).toMatchObject({
      ship: 'umbral',
      looping: false,
    });
  });

  it('rejects a ship waiting outside the system and a loop that is not true or false', () => {
    expect(() => parseSystem({ ...valid, nave: 'archivo' }, WORLD_IDS)).toThrow(/nave/);
    expect(() => parseSystem({ ...valid, bucle: 'no' }, WORLD_IDS)).toThrow(/bucle/);
  });

  it('reads a valid system', () => {
    const system = parseSystem(valid, WORLD_IDS);

    expect(system.star.radius).toBe(100);
    expect(system.bodies.map((b) => b.world)).toEqual(['taller', 'umbral']);
    expect(system.bodies[1]).toMatchObject({
      orbitRadius: 1900,
      period: 1350,
      phase: 1,
      spin: 'locked',
      spinPhase: 2,
    });
  });

  it('defaults the phases to 0 and a number spin to a period in seconds', () => {
    const [taller] = parseSystem(valid, WORLD_IDS).bodies;

    expect(taller).toMatchObject({ phase: 0, spinPhase: 0, spin: 180 });
  });

  it('marks hidden bodies (the Nudo), visible by default', () => {
    const system = parseSystem(withBody({ oculto: true }), WORLD_IDS);

    expect(system.bodies[0]?.hidden).toBe(true);
    expect(system.bodies[1]?.hidden).toBe(false);
  });

  it('gives the star the look of its kind, and lets the file override each part', () => {
    const plain = parseSystem(valid, WORLD_IDS).star;
    const red = parseSystem(
      { ...valid, estrella: { radio: 100, tipo: 'enana_roja' } },
      WORLD_IDS,
    ).star;
    const custom = parseSystem(
      {
        ...valid,
        estrella: {
          radio: 100,
          tipo: 'enana_roja',
          colorLuz: '#112233',
          intensidad: 3,
          caida: 1,
          manchas: 0.2,
          giro: 90,
        },
      },
      WORLD_IDS,
    ).star;

    expect(plain.kind).toBe('solar');
    expect(red.kind).toBe('enana_roja');
    expect(red.surfaceColor).not.toBe(plain.surfaceColor);
    expect(red.falloff).toBe(0);
    expect(custom).toMatchObject({
      lightColor: 0x112233,
      intensity: 3,
      falloff: 1,
      spots: 0.2,
      spin: 90,
    });
    expect(custom.surfaceColor).toBe(red.surfaceColor);
  });

  it.each([
    ['an unknown star kind', { radio: 100, tipo: 'pulsar' }],
    ['a colour that is not #rrggbb', { radio: 100, colorLuz: 'rojo' }],
    ['a negative intensity', { radio: 100, intensidad: -1 }],
    ['a falloff above 2', { radio: 100, caida: 3 }],
    ['spots outside 0 to 1', { radio: 100, manchas: 2 }],
    ['a negative star spin', { radio: 100, giro: -5 }],
  ])('rejects %s in the star with a Spanish message', (_name, star) => {
    expect(() => parseSystem({ ...valid, estrella: star }, WORLD_IDS)).toThrow(/^sistema: /);
  });

  it('places a fixed body at a point instead of on an orbit', () => {
    const fixed = parseSystem(
      withBody({ orbita: undefined, posicion: [0, 270, 0], periodo: undefined, rotacion: 0 }),
      WORLD_IDS,
    );
    const body = fixed.bodies[0];

    expect(body?.fixedPosition).toEqual([0, 270, 0]);
    expect(body?.orbitRadius).toBe(270);
    expect(body?.period).toBe(0);
    expect(fixed.bodies[1]?.fixedPosition).toBeUndefined();
  });

  it.each([
    ['a fixed position that is not three numbers', { orbita: undefined, posicion: [0, 270] }],
    ['a fixed position inside the star', { orbita: undefined, posicion: [0, 50, 0] }],
    ['an orbit and a fixed position together', { posicion: [0, 270, 0] }],
    ['a fixed body that moves', { orbita: undefined, posicion: [0, 270, 0], periodo: 10 }],
  ])('rejects %s with a Spanish message', (_name, patch) => {
    expect(() => parseSystem(withBody({ periodo: 0, ...patch }), WORLD_IDS)).toThrow(/^sistema: /);
  });

  it('reads the unfinished structure around the star', () => {
    const cerco = {
      anillos: [
        { radio: 260, giro: 720, terminado: 0.7 },
        { radio: 280, giro: -540, terminado: 0.45, fase: 1 },
      ],
      ancho: 14,
      grosor: 6,
      dovelas: 48,
      semilla: 4,
    };
    const system = parseSystem({ ...valid, estructura: cerco }, WORLD_IDS);

    expect(system.structure).toMatchObject({ width: 14, thickness: 6, segments: 48, seed: 4 });
    expect(system.structure?.rings).toEqual([
      { radius: 260, period: 720, complete: 0.7, phase: 0 },
      { radius: 280, period: -540, complete: 0.45, phase: 1 },
    ]);
    expect(parseSystem(valid, WORLD_IDS).structure).toBeUndefined();
  });

  it.each([
    ['one ring only', { anillos: [{ radio: 260, giro: 720, terminado: 0.5 }] }],
    [
      'two rings of the same radius',
      {
        anillos: [
          { radio: 260, giro: 720, terminado: 0.5 },
          { radio: 260, giro: -720, terminado: 0.5 },
        ],
      },
    ],
    [
      'rings turning the same way',
      {
        anillos: [
          { radio: 260, giro: 720, terminado: 0.5 },
          { radio: 280, giro: 540, terminado: 0.5 },
        ],
      },
    ],
    [
      'a ring inside the star',
      {
        anillos: [
          { radio: 90, giro: 720, terminado: 0.5 },
          { radio: 280, giro: -540, terminado: 0.5 },
        ],
      },
    ],
    [
      'a completion above 1',
      {
        anillos: [
          { radio: 260, giro: 720, terminado: 2 },
          { radio: 280, giro: -540, terminado: 0.5 },
        ],
      },
    ],
  ])('rejects a structure with %s', (_name, patch) => {
    const base = { ancho: 14, grosor: 6, dovelas: 48, semilla: 4 };
    expect(() => parseSystem({ ...valid, estructura: { ...base, ...patch } }, WORLD_IDS)).toThrow(
      /^sistema: /,
    );
  });

  it('measures the light from the world where the ship waits (or the first body without a ship)', () => {
    expect(parseSystem({ ...valid, nave: 'umbral' }, WORLD_IDS).referenceDistance).toBe(1900);
    expect(parseSystem(valid, WORLD_IDS).referenceDistance).toBe(500);
  });

  it('looks bodies up by world', () => {
    const system = parseSystem(valid, WORLD_IDS);

    expect(system.bodyOf('umbral')?.orbitRadius).toBe(1900);
    expect(system.bodyOf('hogar')).toBeUndefined();
  });

  it.each([
    ['a file that is not an object', null],
    ['no star', { cuerpos: [] }],
    ['a star without radius', { ...valid, estrella: {} }],
    ['a star with a negative radius', { ...valid, estrella: { radio: -1 } }],
    ['bodies that are not a list', { ...valid, cuerpos: {} }],
    ['an unknown world', withBody({ mundo: 'narnia' })],
    ['a repeated world', { ...valid, cuerpos: [valid.cuerpos[0], valid.cuerpos[0]] }],
    ['a zero orbit', withBody({ orbita: 0 })],
    ['an orbit inside the star', withBody({ orbita: 90 })],
    ['a negative period', withBody({ periodo: -5 })],
    ['a non numeric phase', withBody({ fase: 'x' })],
    ['an unknown spin word', withBody({ rotacion: 'rapida' })],
    ['a negative spin period', withBody({ rotacion: -1 })],
    ['a body without spin', withBody({ rotacion: undefined })],
    ['a hidden flag that is not true or false', withBody({ oculto: 'si' })],
  ])('rejects %s with a Spanish message', (_name, raw) => {
    expect(() => parseSystem(raw, WORLD_IDS)).toThrow(/^sistema: /);
  });
});

async function radiusOf(world: string): Promise<number> {
  return (await builtWorldInfo(world)).radius;
}

describe('the real system (sistema.json)', () => {
  const system = parseSystem(systemData, WORLD_IDS);

  it('holds the five worlds of the alien system, the hidden Nudo and the two anchorages of the Cerco', () => {
    expect(system.bodies.map((b) => b.world).sort()).toEqual(
      [
        'anclaje_norte',
        'anclaje_sur',
        'archivo',
        'cicatriz',
        'laboratorio',
        'observatorio',
        'taller',
        'umbral',
      ].sort(),
    );
    expect(system.bodies.filter((b) => b.hidden).map((b) => b.world)).toEqual(['laboratorio']);
  });

  it('keeps the worlds clear of the star and of each other, whatever the phases', async () => {
    const radii = new Map<string, number>();
    for (const body of system.bodies) radii.set(body.world, await radiusOf(body.world));
    const radiusOfWorld = (world: string): number => radii.get(world) ?? Infinity;

    for (const body of system.bodies) {
      // Todo el alcance de su gravedad (3 radios desde el centro) queda fuera de la Brasa.
      expect(body.orbitRadius - system.star.radius).toBeGreaterThan(radiusOfWorld(body.world) * 3);
    }
    // Los anclajes están fijos fuera del plano de las órbitas: se comprueban aparte.
    const orbiting = system.bodies.filter((b) => !b.fixedPosition);
    for (const a of orbiting) {
      for (const b of orbiting) {
        if (a.world >= b.world) continue;
        const surfaces = radiusOfWorld(a.world) + radiusOfWorld(b.world);
        expect(Math.abs(a.orbitRadius - b.orbitRadius)).toBeGreaterThan(surfaces * 2);
      }
    }
  });

  it('puts the inner worlds on faster orbits (Kepler)', () => {
    const periods = system.bodies
      .filter((b) => !b.fixedPosition)
      .sort((a, b) => a.orbitRadius - b.orbitRadius)
      .map((b) => b.period);

    expect([...periods].sort((a, b) => a - b)).toEqual(periods);
  });

  it('ties the two anchorages to the poles of the Cerco, half way between its two rings', () => {
    const radii = (system.structure?.rings ?? []).map((r) => r.radius);
    const middle = (Math.min(...radii) + Math.max(...radii)) / 2;

    expect(system.bodyOf('anclaje_norte')?.fixedPosition).toEqual([0, middle, 0]);
    expect(system.bodyOf('anclaje_sur')?.fixedPosition).toEqual([0, -middle, 0]);
  });

  it('gives Taller a day of three minutes (CONTEXTO_PLANETAS.md)', () => {
    const taller = system.bodyOf('taller');
    if (!taller || typeof taller.spin !== 'number')
      throw new Error('Taller debe girar por su cuenta');

    // Día solar = tiempo entre dos amaneceres = 1 / |1/giro − 1/órbita|.
    const day = 1 / Math.abs(1 / taller.spin - 1 / taller.period);

    expect(day).toBeCloseTo(180, 6);
  });
});

describe('the home system of the prologue (sistema-hogar.json)', () => {
  const home = parseSystem(homeData, WORLD_IDS);

  it('holds Hogar and its Luna, still, with the ship at home and no loop', () => {
    expect(home.bodies.map((b) => b.world).sort()).toEqual(['hogar', 'luna']);
    expect(home.bodies.every((b) => b.period === 0)).toBe(true);
    expect(home.ship).toBe('hogar');
    expect(home.looping).toBe(false);
  });

  it('puts the Luna a short flight away: clear of Hogar but under a kilometre', async () => {
    const [hogar, luna] = [home.bodyOf('hogar'), home.bodyOf('luna')];
    if (!hogar || !luna) throw new Error('faltan Hogar o la Luna');
    const gap =
      bodyPose(hogar, 0).position.distanceTo(bodyPose(luna, 0).position) -
      (await radiusOf('hogar')) -
      (await radiusOf('luna'));

    expect(gap).toBeGreaterThan(300);
    expect(gap).toBeLessThan(1000);
  });

  it('no world is in both systems', () => {
    const alien = parseSystem(systemData, WORLD_IDS);
    for (const world of WORLD_IDS) {
      expect(Boolean(alien.bodyOf(world)) && Boolean(home.bodyOf(world))).toBe(false);
    }
    expect(systemOf('luna')?.looping).toBe(false);
  });

  it('every world is found in its own system, and the alien one keeps the ship at La Boca', () => {
    expect(systemOf('hogar')?.looping).toBe(false);
    expect(systemOf('umbral')?.ship).toBe('umbral');
    expect(systemOf('umbral')?.looping).toBe(true);
  });

  it('keeps the Archive of the Gates out of time: no loop, but with a ship (the mouths are reached by flying, T11)', () => {
    const gates = systemOf('puertas');

    expect(gates?.looping).toBe(false);
    expect(gates?.ship).toBe('puertas');
    expect(gates?.bodies.map((b) => b.world)).toEqual(['puertas']);
  });
});
