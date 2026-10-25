import { describe, expect, it } from 'vitest';
import {
  checkLabCloses,
  checkMarkers,
  checkReachability,
  checkReadings,
  checkRedundancy,
  checkSkippableWorlds,
  checkWorldContributions,
} from '../../src/registry/graphRules';
import { loadClues } from '../../src/data/pistas';
import { parseClues, type Clues } from '../../src/registry/clues';
import { EVENTS, WORLDS } from '../helpers/clueFixture';

/** Grafo pequeño para romper: dos hechos, una conclusión con dos fuentes y un hilo de cada tipo. */
function graph(overrides: {
  sources?: unknown[];
  conclusions?: unknown[];
  facts?: unknown[];
}): Clues {
  const reading = (facts: string[]) => ({ texto: ['texto'], hechos: facts });
  const source = (id: string, mundo: string, facts: string[], extra: object = {}) => ({
    id,
    mundo,
    tipo: 'texto',
    titulo: id,
    superficial: reading(facts),
    ...extra,
  });
  return parseClues(
    {
      hilos: [
        { id: 'H4', pregunta: 'p', respuesta: 'r' },
        { id: 'H5', pregunta: 'p', respuesta: 'r' },
      ],
      hechos: overrides.facts ?? [
        { id: 'a.uno', hilos: ['H5'], frase: 'uno' },
        { id: 'a.dos', hilos: ['H4'], frase: 'dos' },
      ],
      conclusiones: overrides.conclusions ?? [
        { id: 'K1', titulo: 'k', hilo: 'H5', requiere: ['a.uno'] },
      ],
      fuentes: overrides.sources ?? [
        source('umbral.a', 'umbral', ['a.uno']),
        source('archivo.a', 'archivo', ['a.uno', 'a.dos']),
      ],
    },
    { worlds: WORLDS, events: EVENTS },
  );
}

const source = (id: string, mundo: string, facts: string[], extra: object = {}) => ({
  id,
  mundo,
  tipo: 'texto',
  titulo: id,
  superficial: { texto: ['texto'], hechos: facts },
  ...extra,
});

describe('rule 1: every essential fact has several sources in different worlds', () => {
  it('passes when a fact has two sources in two worlds', () => {
    expect(checkRedundancy(graph({}))).toEqual([]);
  });

  it('fails when an essential fact depends on a single source', () => {
    const clues = graph({ sources: [source('umbral.a', 'umbral', ['a.uno'])] });

    const failures = checkRedundancy(clues);

    expect(failures).toHaveLength(2); // una sola fuente y un solo mundo
    expect(failures.join(' ')).toMatch(/K1.*1 fuente/);
    expect(failures.join(' ')).toMatch(/K1.*1 mundo/);
  });

  it('fails when all the sources are in the same world', () => {
    const clues = graph({
      sources: [source('umbral.a', 'umbral', ['a.uno']), source('umbral.b', 'umbral', ['a.uno'])],
    });

    expect(checkRedundancy(clues).join(' ')).toMatch(/K1.*mundos/);
  });

  it('counts the alternatives of a group together', () => {
    const clues = graph({
      conclusions: [{ id: 'K1', titulo: 'k', hilo: 'H5', requiere: [['a.uno', 'a.dos']] }],
      sources: [source('umbral.a', 'umbral', ['a.uno']), source('archivo.a', 'archivo', ['a.dos'])],
    });

    expect(checkRedundancy(clues)).toEqual([]);
  });

  it('only checks facts, not conclusions that depend on other conclusions', () => {
    const clues = graph({
      conclusions: [
        { id: 'K1', titulo: 'k', hilo: 'H5', requiere: ['a.uno'] },
        { id: 'K3', titulo: 'k', hilo: 'H5', requiere: ['K1'] },
      ],
    });

    expect(checkRedundancy(clues)).toEqual([]);
  });
});

describe('rule 2: nothing essential depends only on the optional world or the prologue', () => {
  const options = { optional: ['observatorio'], prologue: ['hogar', 'luna'] };
  const full = (sources: unknown[]) =>
    parseClues(
      {
        hilos: [{ id: 'H5', pregunta: 'p', respuesta: 'r' }],
        hechos: [{ id: 'a.uno', hilos: ['H5'], frase: 'uno' }],
        conclusiones: [{ id: 'K1', titulo: 'k', hilo: 'H5', requiere: ['a.uno'] }],
        fuentes: sources,
      },
      { worlds: ['umbral', 'observatorio', 'hogar', 'luna'], events: [] },
    );

  it('passes when the conclusion also has sources elsewhere', () => {
    const clues = full([
      source('umbral.a', 'umbral', ['a.uno']),
      source('observatorio.a', 'observatorio', ['a.uno']),
    ]);

    expect(checkSkippableWorlds(clues, options)).toEqual([]);
  });

  it('fails when only the optional world gives it', () => {
    const clues = full([
      source('observatorio.a', 'observatorio', ['a.uno']),
      source('observatorio.b', 'observatorio', ['a.uno']),
    ]);

    expect(checkSkippableWorlds(clues, options).join(' ')).toMatch(/K1.*observatorio/);
  });

  it('fails when only the prologue gives it', () => {
    const clues = full([
      source('instituto.a', 'hogar', ['a.uno']),
      source('instituto.b', 'luna', ['a.uno']),
    ]);

    expect(checkSkippableWorlds(clues, options).join(' ')).toMatch(/K1.*prólogo/);
  });
});

describe('rule 3: every world gives a "where" piece and a "why" piece', () => {
  it('passes when each listed world has an H5 source and an H3/H4 source', () => {
    expect(checkWorldContributions(graph({}), ['archivo'])).toEqual([]);
  });

  it('fails when a world has no "where" source (thread H5)', () => {
    const clues = graph({
      sources: [
        source('umbral.a', 'umbral', ['a.dos']),
        source('archivo.a', 'archivo', ['a.uno', 'a.dos']),
      ],
    });

    expect(checkWorldContributions(clues, ['umbral']).join(' ')).toMatch(/umbral.*dónde/);
  });

  it('fails when a world has no "why" source (thread H3 or H4)', () => {
    const clues = graph({ sources: [source('umbral.a', 'umbral', ['a.uno'])] });

    expect(checkWorldContributions(clues, ['umbral']).join(' ')).toMatch(/umbral.*por qué/);
  });
});

describe('rule 4: every fact and conclusion can be reached', () => {
  it('passes for a graph that can be played in some order', () => {
    expect(checkReachability(graph({}))).toEqual([]);
  });

  it('fails when two deep readings wait for each other', () => {
    const clues = graph({
      sources: [
        source('umbral.a', 'umbral', [], {
          profunda: { requiere: ['a.dos'], texto: ['t'], hechos: ['a.uno'] },
        }),
        source('archivo.a', 'archivo', [], {
          profunda: { requiere: ['a.uno'], texto: ['t'], hechos: ['a.dos'] },
        }),
      ],
    });

    const failures = checkReachability(clues).join(' ');

    expect(failures).toMatch(/a\.uno/);
    expect(failures).toMatch(/a\.dos/);
    expect(failures).toMatch(/K1/);
  });

  it('fails for a fact no source gives', () => {
    const clues = graph({ sources: [source('umbral.a', 'umbral', ['a.uno'])] });

    expect(checkReachability(clues).join(' ')).toMatch(/a\.dos/);
  });
});

describe('rule 5: the sources and the Blender markers match', () => {
  const clues = graph({
    sources: [
      source('umbral.a', 'umbral', ['a.uno']),
      source('umbral.evento', 'umbral', ['a.dos'], { tipo: 'evento', evento: 'boca_destello' }),
      source('archivo.a', 'archivo', ['a.uno']),
    ],
  });

  it('passes when every source has its marker and every marker has its source', () => {
    expect(
      checkMarkers(clues, 'umbral', { clueIds: ['umbral.a'], events: ['boca_destello'] }),
    ).toEqual([]);
  });

  it('fails for a marker whose clue_id does not exist', () => {
    const failures = checkMarkers(clues, 'umbral', {
      clueIds: ['umbral.a', 'umbral.fantasma'],
      events: ['boca_destello'],
    });

    expect(failures.join(' ')).toMatch(/umbral\.fantasma/);
  });

  it('fails for a marker that belongs to a source of another world', () => {
    const failures = checkMarkers(clues, 'umbral', {
      clueIds: ['umbral.a', 'archivo.a'],
      events: ['boca_destello'],
    });

    expect(failures.join(' ')).toMatch(/archivo\.a/);
  });

  it('fails for a source without marker', () => {
    expect(
      checkMarkers(clues, 'umbral', { clueIds: [], events: ['boca_destello'] }).join(' '),
    ).toMatch(/umbral\.a/);
  });

  it('fails for an event source whose trigger is missing', () => {
    expect(checkMarkers(clues, 'umbral', { clueIds: ['umbral.a'], events: [] }).join(' ')).toMatch(
      /boca_destello/,
    );
  });
});

describe('rule 6: readings', () => {
  it('passes for sources that give facts and prologue sources with a deep reading', () => {
    expect(checkReadings(graph({}), [])).toEqual([]);
  });

  it('fails for a source that never gives any fact', () => {
    const clues = graph({
      sources: [source('umbral.a', 'umbral', ['a.uno']), source('umbral.vacia', 'umbral', [])],
    });

    expect(checkReadings(clues, []).join(' ')).toMatch(/umbral\.vacia/);
  });

  it('fails for a prologue source without deep reading', () => {
    const clues = graph({});

    expect(checkReadings(clues, ['umbral']).join(' ')).toMatch(/umbral\.a.*profunda/);
  });
});

describe('rule 7: what is needed to reach the Laboratory is not inside it', () => {
  it('passes when the conclusion can be unlocked without the laboratory', () => {
    expect(checkLabCloses(graph({}), 'K1', 'archivo')).toEqual([]);
  });

  it('fails when the conclusion needs a source of the laboratory', () => {
    const clues = graph({ sources: [source('archivo.a', 'archivo', ['a.uno', 'a.dos'])] });

    expect(checkLabCloses(clues, 'K1', 'archivo').join(' ')).toMatch(/K1.*archivo/);
  });
});

describe('the real graph of CONTEXTO_PISTAS.md', () => {
  const clues = loadClues();

  it('rule 1 holds', () => {
    expect(checkRedundancy(clues)).toEqual([]);
  });

  it('rule 2 holds (without the Observatory and without the prologue)', () => {
    expect(
      checkSkippableWorlds(clues, { optional: ['observatorio'], prologue: ['hogar', 'luna'] }),
    ).toEqual([]);
  });

  it('rule 3 holds for the four worlds of the alien system', () => {
    expect(checkWorldContributions(clues, ['umbral', 'archivo', 'taller', 'cicatriz'])).toEqual([]);
  });

  it('rule 4 holds', () => {
    expect(checkReachability(clues)).toEqual([]);
  });

  it('rule 6 holds (the prologue has deep readings)', () => {
    expect(checkReadings(clues, ['hogar', 'luna'])).toEqual([]);
  });

  it('rule 7 holds (the position of the Laboratory is deduced outside it)', () => {
    expect(checkLabCloses(clues, 'K3', 'laboratorio')).toEqual([]);
  });
});
