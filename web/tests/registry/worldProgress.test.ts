import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';
import { progressNote, worldProgress } from '../../src/registry/worldProgress';

const clues = loadClues();
const umbral = clues.sources.filter((s) => s.world === 'umbral').map((s) => s.id);

describe('what is left to read on each world', () => {
  it('counts every source of the world, opened once each', () => {
    const progress = worldProgress(clues, new Set([umbral[0] ?? '', umbral[0] ?? '']));
    expect(progress.get('umbral')).toEqual({ opened: 1, total: umbral.length });
  });

  it('ignores opened ids that are not sources any more', () => {
    const progress = worldProgress(clues, new Set(['umbral.no_existe']));
    expect(progress.get('umbral')?.opened).toBe(0);
  });

  it('writes "something is still left" until every source is open, then "read it all"', () => {
    const some = worldProgress(clues, new Set(umbral.slice(1))).get('umbral');
    expect(progressNote(some)).toBe('Aún queda algo por leer aquí');
    const all = worldProgress(clues, new Set(umbral)).get('umbral');
    expect(progressNote(all)).toBe('Aquí ya lo he leído todo');
  });

  it('writes nothing for a world with nothing to read', () => {
    expect(progressNote(undefined)).toBeUndefined();
    expect(progressNote({ opened: 0, total: 0 })).toBeUndefined();
  });
});
