import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';

describe('the real clue data', () => {
  const clues = loadClues();
  /** Las fuentes del grafo: todas menos las de ambiente (gente de casa que solo habla, notas para curiosos). */
  const graph = clues.sources.filter(
    (s) => !s.ambient && !(s.kind === 'charla' && s.surface.facts.length === 0 && !s.deep),
  );

  it('teaches the way into the Archivo outside the Archivo (Phase 11E): the loose sheet of the Muelle', () => {
    const teaching = clues.sources.filter((s) =>
      [...s.surface.facts, ...(s.deep?.facts ?? [])].includes('archivo.entrada'),
    );

    expect(teaching.map((s) => s.id)).toEqual(['umbral.hoja_entrada']);
    expect(teaching.every((s) => s.world !== 'archivo')).toBe(true);
  });

  it('loads and validates without errors', () => {
    expect(clues.sources.length).toBeGreaterThan(0);
  });

  it('gives voice to the people at home: chats, some of them only small talk', () => {
    const chats = clues.sources.filter((s) => s.kind === 'charla');

    expect(chats.map((s) => s.id)).toContain('instituto.directora');
    expect(chats.every((s) => s.world === 'hogar')).toBe(true);
    // Solo la Directora da hechos.
    expect(chats.filter((s) => s.surface.facts.length > 0 || s.deep).map((s) => s.id)).toEqual([
      'instituto.directora',
    ]);
  });

  it('keeps the notes for the curious (home, Observatorio) out of the graph (Phase 11G)', () => {
    const ambient = clues.sources.filter((s) => s.ambient);

    expect(ambient.length).toBeGreaterThanOrEqual(10);
    expect(
      ambient.every(
        (s) =>
          ['hogar', 'observatorio', 'laboratorio', 'puertas'].includes(s.world) &&
          s.surface.facts.length === 0 &&
          !s.deep,
      ),
    ).toBe(true);
    expect(ambient.map((s) => s.id)).toContain('hogar.bitacora_albatros');
    expect(ambient.map((s) => s.id)).toContain('observatorio.registrador');
  });

  it('contains the 7 threads, the 9 conclusions and the 60 sources of CONTEXTO_PISTAS.md', () => {
    expect(clues.threads.map((t) => t.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']);
    expect(clues.conclusions.map((c) => c.id)).toEqual([
      'K1',
      'K2',
      'KC',
      'K3',
      'K4',
      'K5',
      'K6',
      'K7',
      'K8',
    ]);
    expect(graph).toHaveLength(60);
  });

  it('spreads the sources over the places of the document', () => {
    const perWorld = new Map<string, number>();
    for (const s of graph) perWorld.set(s.world, (perWorld.get(s.world) ?? 0) + 1);

    expect(Object.fromEntries(perWorld)).toEqual({
      hogar: 6,
      luna: 1,
      umbral: 9,
      archivo: 7,
      taller: 10,
      cicatriz: 14,
      observatorio: 3,
      laboratorio: 7,
      puertas: 3,
    });
  });

  const CICATRIZ_DRAFTS = [
    'cicatriz.cripta',
    'cicatriz.friso',
    'cicatriz.nucleo',
    'cicatriz.partidas',
    'cicatriz.anillo',
  ];

  it('gives Umbral, home and the recordings readable draft texts and leaves the rest as skeleton', () => {
    // Las grabaciones necesitan un borrador para que su mecánica se pueda probar (Fase 7); casa, para el
    // prólogo (Fase 9).
    // Las fuentes nuevas de Cicatriz (Fase 11H) llegan con borrador para que se lean en su sitio, y el Observatorio
    // (Fase 11), con el que se cuenta el lugar.
    const drafted = (s: { id: string; world: string; kind: string }) =>
      s.world === 'umbral' ||
      s.world === 'hogar' ||
      s.world === 'luna' ||
      s.world === 'observatorio' ||
      s.world === 'laboratorio' ||
      s.world === 'puertas' ||
      s.kind === 'grabacion' ||
      CICATRIZ_DRAFTS.includes(s.id);
    const readable = clues.sources.filter(drafted);
    const others = clues.sources.filter((s) => !drafted(s));

    expect(readable.map((s) => s.id)).toContain('cicatriz.grabacion_esceptico');
    expect(readable.every((s) => s.draft)).toBe(true);
    expect(readable.every((s) => !s.surface.text.includes('[texto pendiente]'))).toBe(true);
    expect(others.every((s) => s.surface.text[0] === '[texto pendiente]')).toBe(true);
  });

  it('every recording carries the clock it was recorded with', () => {
    const recordings = clues.sources.filter((s) => s.kind === 'grabacion');

    expect(recordings.length).toBeGreaterThan(0);
    for (const recording of recordings) expect(recording.recordedRate).toBeGreaterThan(0);
  });
});
