import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { followCrossing, replay, toArchive } from '../../src/game/crossings';
import { ARRIVAL_KEY } from '../../src/ui/arrival';

// Una pestaña falsa: adónde se va y de qué color se nace al llegar.
let replaced: string[];
let session: Map<string, string>;

beforeEach(() => {
  replaced = [];
  session = new Map();
  vi.stubGlobal('window', {
    location: {
      href: 'http://localhost:5180/?debug&mundo=puertas',
      replace: (url: string) => {
        replaced.push(url);
      },
    },
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => {
        session.set(key, value);
      },
      removeItem: (key: string) => {
        session.delete(key);
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('where each crossing leads', () => {
  it('goes home through a mouth with its ending, arriving in white', () => {
    followCrossing('boca', 'B', true);

    expect(replaced).toEqual(['http://localhost:5180/?debug=&mundo=hogar&final=B']);
    expect(session.get(ARRIVAL_KEY)).toBe('blanco');
  });

  it('goes to the Archive through the horizon, or through a mouth without an ending, arriving in black', () => {
    followCrossing('horizonte', undefined, true);
    followCrossing('boca', undefined, true);

    expect(replaced).toEqual([
      'http://localhost:5180/?debug=&mundo=puertas',
      'http://localhost:5180/?debug=&mundo=puertas',
    ]);
    expect(session.get(ARRIVAL_KEY)).toBe('negro');
  });

  it('goes to Umbral through the wormhole', () => {
    followCrossing('gusano', undefined, true);

    expect(replaced).toEqual(['http://localhost:5180/?debug=']);
  });

  it('refuses a crossing it has no way for', () => {
    expect(() => {
      followCrossing('caida', undefined, true);
    }).toThrow(/sin ruta/);
    expect(replaced).toEqual([]);
  });

  it('plays again without world or ending, and goes back to the Archive from home', () => {
    replay(true);
    expect(session.get(ARRIVAL_KEY)).toBe('blanco');
    replay(false);
    toArchive();

    expect(replaced).toEqual([
      'http://localhost:5180/?debug=',
      'http://localhost:5180/?debug=&mundo=umbral',
      'http://localhost:5180/?debug=&mundo=puertas',
    ]);
  });
});
