import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';
import sistema from '../../src/data/sistema.json';
import {
  MAX_WORLD_NAME,
  WORLD_LOG,
  cleanWorldName,
  displayName,
  needsNaming,
  shipLabel,
  withDiscovery,
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

describe('naming a world', () => {
  it('keeps the name the player writes, tidied up', () => {
    expect(cleanWorldName('  Mi   casa  roja ', 'Umbral')).toBe('Mi casa roja');
  });

  it('falls back to the official name when the player writes nothing', () => {
    expect(cleanWorldName('   ', 'Umbral')).toBe('Umbral');
  });

  it('cuts long names by letters and drops control characters', () => {
    const long = 'ñ'.repeat(40);

    expect(Array.from(cleanWorldName(long, 'Umbral'))).toHaveLength(MAX_WORLD_NAME);
    expect(cleanWorldName('Ho\u0000la\u0007', 'Umbral')).toBe('Hola');
  });
});

describe('which worlds ask for a name', () => {
  it('asks for Umbral and the rest of the system the first time', () => {
    expect(needsNaming({}, 'umbral')).toBe(true);
    expect(needsNaming({}, 'laboratorio')).toBe(true);
  });

  it('never asks for Hogar and the Moon (they are home) nor for places outside the log', () => {
    expect(needsNaming({}, 'hogar')).toBe(false);
    expect(needsNaming({}, 'luna')).toBe(false);
    expect(needsNaming({}, 'puertas')).toBe(false);
  });

  it('does not ask again once named, and naming does not touch the old log', () => {
    const before = {};
    const after = withDiscovery(before, 'umbral', 'Primera luz', 3);

    expect(needsNaming(after, 'umbral')).toBe(false);
    expect(after).toEqual({ umbral: { name: 'Primera luz', loop: 3 } });
    expect(before).toEqual({});
  });
});

describe('the names shown in the game', () => {
  const log = withDiscovery({}, 'umbral', 'Primera luz', 0);

  it('uses the player name where there is one, and the official one otherwise', () => {
    expect(displayName(log, 'umbral')).toBe('Primera luz');
    expect(displayName(log, 'archivo')).toBe('Archivo');
    expect(displayName(log, 'hogar')).toBe('Hogar');
    expect(displayName(log, 'puertas')).toBe('Puertas');
  });

  it('adds the official name in the ship when the player chose another', () => {
    expect(shipLabel(log, 'umbral')).toBe('Primera luz (Umbral)');
    expect(shipLabel(log, 'archivo')).toBe('Archivo');
    expect(shipLabel(withDiscovery({}, 'taller', 'Taller', 1), 'taller')).toBe('Taller');
  });
});

describe('the pages of the log', () => {
  it('has home and the Moon from the start, and the rest only once found', () => {
    const pages = worldPages({}, clues, new Set());

    expect(pages.map((page) => page.id)).toEqual(['hogar', 'luna']);
  });

  it('keeps the Hidden Laboratory out until it is found', () => {
    const log = withDiscovery({}, 'umbral', 'Umbral', 0);

    expect(worldPages(log, clues, new Set()).map((page) => page.id)).not.toContain('laboratorio');
  });

  it('lists in each page what was learned in that world, in the order of the log', () => {
    const log = withDiscovery(withDiscovery({}, 'archivo', 'Frío', 2), 'umbral', 'Primera luz', 0);
    const pages = worldPages(log, clues, new Set(['silencio.consejo_existe']));

    expect(pages.map((page) => page.id)).toEqual(['hogar', 'luna', 'umbral', 'archivo']);
    const umbral = pages.find((page) => page.id === 'umbral');
    expect(umbral).toMatchObject({ name: 'Primera luz', official: 'Umbral', loop: 0 });
    expect(umbral?.facts.map((fact) => fact.id)).toEqual(['silencio.consejo_existe']);
    expect(pages.find((page) => page.id === 'archivo')?.facts).toEqual([]);
  });
});

describe('the note of what is left to read (milestone C)', () => {
  const log = withDiscovery({}, 'umbral', 'Umbral', 0);
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
