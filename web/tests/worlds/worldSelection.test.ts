import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORLD,
  WORLD_IDS,
  worldFromQuery,
  worldTitle,
} from '../../src/worlds/worldSelection';

describe('worldFromQuery', () => {
  it('starts in Umbral by default', () => {
    expect(worldFromQuery('')).toBe(DEFAULT_WORLD);
    expect(DEFAULT_WORLD).toBe('umbral');
  });

  it('accepts any known world in the mundo parameter, ignoring case', () => {
    expect(worldFromQuery('?mundo=Archivo')).toBe('archivo');
    expect(worldFromQuery('?debug&mundo=taller')).toBe('taller');
  });

  it('ignores unknown worlds so the URL cannot load arbitrary files', () => {
    expect(worldFromQuery('?mundo=../../secreto')).toBe(DEFAULT_WORLD);
    expect(worldFromQuery('?mundo=marte')).toBe(DEFAULT_WORLD);
  });

  it('knows the eight base worlds of CONTEXTO_PLANETAS.md', () => {
    expect(WORLD_IDS).toEqual([
      'umbral',
      'archivo',
      'taller',
      'cicatriz',
      'observatorio',
      'laboratorio',
      'hogar',
      'luna',
    ]);
  });
});

describe('worldTitle', () => {
  it('capitalizes the provisional name', () => {
    expect(worldTitle('cicatriz')).toBe('Cicatriz');
  });
});
