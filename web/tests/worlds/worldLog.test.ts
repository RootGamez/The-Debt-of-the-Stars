import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';
import sistema from '../../src/data/sistema.json';
import {
  WORLD_LOG,
  isNewWorld,
  officialName,
  withDiscovery,
  worldAbout,
  worldPages,
} from '../../src/worlds/worldLog';

const clues = loadClues();

describe('the list of worlds of the log', () => {
  it('has every world of the system plus Hogar and the Moon, each with its official name', () => {
    const ids = WORLD_LOG.map((world) => world.id);

    for (const body of sistema.cuerpos) expect(ids).toContain(body.mundo);
    expect(ids).toContain('hogar');
    expect(ids).toContain('luna');
    expect(WORLD_LOG.every((world) => world.name.length > 0 && world.where.length > 0)).toBe(true);
  });
});

describe('which worlds show the new-world card', () => {
  it('shows it for Umbral and the rest of the system the first time', () => {
    expect(isNewWorld({}, 'umbral')).toBe(true);
    expect(isNewWorld({}, 'laboratorio')).toBe(true);
    expect(isNewWorld({}, 'anclaje_sur')).toBe(true);
  });

  it('never shows it for Hogar and the Moon (they are home) nor for places outside the log', () => {
    expect(isNewWorld({}, 'hogar')).toBe(false);
    expect(isNewWorld({}, 'luna')).toBe(false);
    expect(isNewWorld({}, 'puertas')).toBe(false);
  });

  it('does not show it again once found, and finding a world does not touch the old log', () => {
    const before = {};
    const after = withDiscovery(before, 'umbral', 3);

    expect(isNewWorld(after, 'umbral')).toBe(false);
    expect(after).toEqual({ umbral: { name: 'Umbral', loop: 3 } });
    expect(before).toEqual({});
  });
});

describe('the card of each world', () => {
  it('has a short description for every world of the log', () => {
    for (const world of WORLD_LOG) expect(worldAbout(world.id).length).toBeGreaterThan(10);
  });

  it('has no description outside the log', () => {
    expect(worldAbout('puertas')).toBe('');
  });

  it('always uses the official name, even with a name saved by an old game', () => {
    expect(officialName('umbral')).toBe('Umbral');
    const old = { umbral: { name: 'Primera luz', loop: 0 } };
    expect(worldPages(old, clues, new Set()).find((p) => p.id === 'umbral')?.name).toBe('Umbral');
  });
});

describe('the pages of the log', () => {
  it('has home and the Moon from the start, and the rest only once found', () => {
    const pages = worldPages({}, clues, new Set());

    expect(pages.map((page) => page.id)).toEqual(['hogar', 'luna']);
  });

  it('keeps the Hidden Laboratory out until it is found', () => {
    const log = withDiscovery({}, 'umbral', 0);

    expect(worldPages(log, clues, new Set()).map((page) => page.id)).not.toContain('laboratorio');
  });

  it('lists in each page what was learned in that world, in the order of the log', () => {
    const log = withDiscovery(withDiscovery({}, 'archivo', 2), 'umbral', 0);
    const pages = worldPages(log, clues, new Set(['silencio.consejo_existe']));

    expect(pages.map((page) => page.id)).toEqual(['hogar', 'luna', 'umbral', 'archivo']);
    const umbral = pages.find((page) => page.id === 'umbral');
    expect(umbral).toMatchObject({ name: 'Umbral', loop: 0 });
    expect(umbral?.facts.map((fact) => fact.id)).toEqual(['silencio.consejo_existe']);
    expect(pages.find((page) => page.id === 'archivo')?.facts).toEqual([]);
  });
});

describe('the note of what is left to read (milestone C)', () => {
  const log = withDiscovery({}, 'umbral', 0);
  const umbral = clues.sources.filter((s) => s.world === 'umbral').map((s) => s.id);

  it('says something is left until every source of the world is open', () => {
    const page = worldPages(log, clues, new Set(), new Set(umbral.slice(1))).find(
      (p) => p.id === 'umbral',
    );
    expect(page?.note).toBe('Aún queda algo por leer aquí');
    expect(page?.complete).toBe(false);
  });

  it('says it is all read once every source is open', () => {
    const page = worldPages(log, clues, new Set(), new Set(umbral)).find((p) => p.id === 'umbral');
    expect(page?.note).toBe('Aquí ya lo he leído todo');
    expect(page?.complete).toBe(true);
  });
});

describe('home in the log', () => {
  it('has no note of what is left: there is no going back during the loop', () => {
    const page = worldPages({}, clues, new Set(), new Set()).find((p) => p.id === 'hogar');
    expect(page?.note).toBeUndefined();
  });
});
