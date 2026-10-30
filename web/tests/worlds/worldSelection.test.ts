import { describe, expect, it } from 'vitest';
import {
  arrivalHref,
  DEFAULT_WORLD,
  epilogueHref,
  EPILOGUE_WORLD,
  homecomingHref,
  PROLOGUE_WORLD,
  replayHref,
  startWorld,
  WORLD_IDS,
  worldFromQuery,
  worldTitle,
} from '../../src/worlds/worldSelection';

describe('where the game starts', () => {
  it('starts a new game at home and, once through the wormhole, in Umbral', () => {
    expect(startWorld('', false)).toBe(PROLOGUE_WORLD);
    expect(PROLOGUE_WORLD).toBe('hogar');
    expect(startWorld('', true)).toBe('umbral');
  });

  it('lets ?mundo= choose, whatever the save says', () => {
    expect(startWorld('?debug&mundo=umbral', false)).toBe('umbral');
    expect(startWorld('?mundo=hogar', true)).toBe('hogar');
    expect(startWorld('?mundo=marte', false)).toBe('hogar');
  });
});

describe('the way to the Archivo de las Puertas through the stable horizon (Phase 10)', () => {
  it('asks for the Archivo in the address, keeping the rest and dropping the fragment', () => {
    expect(EPILOGUE_WORLD).toBe('puertas');
    expect(epilogueHref('http://localhost:5180/?debug&mundo=umbral#x')).toBe(
      'http://localhost:5180/?debug=&mundo=puertas',
    );
  });

  it('goes home through a mouth of the Archive with the ending it gave', () => {
    expect(homecomingHref('http://localhost:5180/?debug&mundo=puertas#x', 'A')).toBe(
      'http://localhost:5180/?debug=&mundo=hogar&final=A',
    );
  });

  it('plays again after an ending without world or ending, keeping the rest of the address', () => {
    expect(replayHref('http://localhost:5180/?debug&mundo=hogar&final=B#x')).toBe(
      'http://localhost:5180/?debug=',
    );
  });
});

describe('the way to Umbral through the wormhole', () => {
  it('drops ?mundo= and keeps the rest of the address', () => {
    expect(arrivalHref('http://localhost:5180/?debug&mundo=hogar&ciclo=60', true)).toBe(
      'http://localhost:5180/?debug=&ciclo=60',
    );
  });

  it('drops the fragment, so going there always loads the page again', () => {
    expect(arrivalHref('http://localhost:5180/#algo', true)).toBe('http://localhost:5180/');
  });

  it('asks for Umbral in the address when the save could not be written', () => {
    expect(arrivalHref('http://localhost:5180/', false)).toBe(
      'http://localhost:5180/?mundo=umbral',
    );
  });
});

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

  it('knows the eight base worlds of CONTEXTO_PLANETAS.md and the Archivo de las Puertas', () => {
    expect(WORLD_IDS).toEqual([
      'umbral',
      'archivo',
      'taller',
      'cicatriz',
      'observatorio',
      'laboratorio',
      'hogar',
      'luna',
      'puertas',
    ]);
  });
});

describe('worldTitle', () => {
  it('capitalizes the provisional name', () => {
    expect(worldTitle('cicatriz')).toBe('Cicatriz');
  });
});
