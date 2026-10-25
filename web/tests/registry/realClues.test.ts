import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';

describe('the real clue data', () => {
  const clues = loadClues();

  it('loads and validates without errors', () => {
    expect(clues.sources.length).toBeGreaterThan(0);
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
    expect(clues.sources).toHaveLength(47);
  });

  it('spreads the sources over the places of the document', () => {
    const perWorld = new Map<string, number>();
    for (const s of clues.sources) perWorld.set(s.world, (perWorld.get(s.world) ?? 0) + 1);

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

  it('gives Umbral readable draft texts and leaves the other worlds as skeleton', () => {
    const umbral = clues.sources.filter((s) => s.world === 'umbral');
    const others = clues.sources.filter((s) => s.world !== 'umbral');

    expect(umbral.every((s) => s.draft)).toBe(true);
    expect(umbral.every((s) => !s.surface.text.includes('[texto pendiente]'))).toBe(true);
    expect(others.every((s) => s.surface.text[0] === '[texto pendiente]')).toBe(true);
  });
});
