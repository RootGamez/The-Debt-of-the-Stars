import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';

describe('the real clue data', () => {
  const clues = loadClues();
  /** Las fuentes del grafo: todas menos las charlas de ambiente (gente de casa que solo habla). */
  const graph = clues.sources.filter(
    (s) => !(s.kind === 'charla' && s.surface.facts.length === 0 && !s.deep),
  );

  it('loads and validates without errors', () => {
    expect(clues.sources.length).toBeGreaterThan(0);
  });

  it('gives voice to the people at home: chats, some of them only small talk', () => {
    const chats = clues.sources.filter((s) => s.kind === 'charla');

    expect(chats.map((s) => s.id)).toContain('instituto.directora');
    expect(chats.every((s) => s.world === 'hogar')).toBe(true);
    expect(chats.length - (clues.sources.length - graph.length)).toBe(1); // solo la Directora da hechos
  });

  it('contains the 7 threads, the 9 conclusions and the 47 sources of CONTEXTO_PISTAS.md', () => {
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
    expect(graph).toHaveLength(47);
  });

  it('spreads the sources over the places of the document', () => {
    const perWorld = new Map<string, number>();
    for (const s of graph) perWorld.set(s.world, (perWorld.get(s.world) ?? 0) + 1);

    expect(Object.fromEntries(perWorld)).toEqual({
      hogar: 6,
      luna: 1,
      umbral: 8,
      archivo: 7,
      taller: 8,
      cicatriz: 7,
      observatorio: 3,
      laboratorio: 7,
    });
  });

  it('gives Umbral, home and the recordings readable draft texts and leaves the rest as skeleton', () => {
    // Las grabaciones necesitan un borrador para que su mecánica se pueda probar (Fase 7); casa, para el
    // prólogo (Fase 9).
    const drafted = (s: { world: string; kind: string }) =>
      s.world === 'umbral' || s.world === 'hogar' || s.kind === 'grabacion';
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
