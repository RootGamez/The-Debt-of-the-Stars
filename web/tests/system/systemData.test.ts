import { describe, expect, it } from 'vitest';
import systemData from '../../src/data/sistema.json';
import { parseSystem } from '../../src/system/systemData';
import { WORLD_IDS } from '../../src/worlds/worldSelection';
import { loadBuiltWorld } from '../helpers/builtWorlds';

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
  ])('rejects %s with a Spanish message', (_name, raw) => {
    expect(() => parseSystem(raw, WORLD_IDS)).toThrow(/^sistema: /);
  });
});

async function radiusOf(world: string): Promise<number> {
  return (await loadBuiltWorld(world)).info.radius;
}

describe('the real system (sistema.json)', () => {
  const system = parseSystem(systemData, WORLD_IDS);

  it('holds the five worlds of the alien system', () => {
    expect(system.bodies.map((b) => b.world).sort()).toEqual(
      ['archivo', 'cicatriz', 'observatorio', 'taller', 'umbral'].sort(),
    );
  });

  it('keeps the worlds clear of the star and of each other, whatever the phases', async () => {
    const radii = new Map<string, number>();
    for (const body of system.bodies) radii.set(body.world, await radiusOf(body.world));
    const radiusOfWorld = (world: string): number => radii.get(world) ?? Infinity;

    for (const body of system.bodies) {
      // Todo el alcance de su gravedad (3 radios desde el centro) queda fuera de la Brasa.
      expect(body.orbitRadius - system.star.radius).toBeGreaterThan(radiusOfWorld(body.world) * 3);
    }
    for (const a of system.bodies) {
      for (const b of system.bodies) {
        if (a.world >= b.world) continue;
        const surfaces = radiusOfWorld(a.world) + radiusOfWorld(b.world);
        expect(Math.abs(a.orbitRadius - b.orbitRadius)).toBeGreaterThan(surfaces * 2);
      }
    }
  });

  it('puts the inner worlds on faster orbits (Kepler)', () => {
    const periods = [...system.bodies]
      .sort((a, b) => a.orbitRadius - b.orbitRadius)
      .map((b) => b.period);

    expect([...periods].sort((a, b) => a - b)).toEqual(periods);
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
