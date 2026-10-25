import { describe, expect, it } from 'vitest';
import {
  clearSave,
  freshSave,
  loadSave,
  MAX_LOOPS,
  SAVE_KEY,
  SAVE_VERSION,
  writeSave,
  type KeyValueStore,
} from '../../src/core/save';

function memoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function brokenStore(): KeyValueStore {
  const fail = (): never => {
    throw new Error('SecurityError: el almacenamiento está bloqueado');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('loadSave', () => {
  it('starts fresh when there is nothing saved', () => {
    const result = loadSave(memoryStore());

    expect(result.data).toEqual(freshSave());
    expect(result.warning).toBeUndefined();
  });

  it('reads back what was written', () => {
    const store = memoryStore();
    writeSave(store, { version: SAVE_VERSION, loopsCompleted: 7, facts: ['umbral.placa'] });

    expect(loadSave(store).data).toEqual({
      version: SAVE_VERSION,
      loopsCompleted: 7,
      facts: ['umbral.placa'],
    });
  });

  it.each([
    ['text that is not JSON', '{roto'],
    ['an unknown version', JSON.stringify({ version: 99, loopsCompleted: 1, facts: [] })],
    ['a negative loop count', JSON.stringify({ version: 1, loopsCompleted: -3, facts: [] })],
    ['a fractional loop count', JSON.stringify({ version: 1, loopsCompleted: 1.5, facts: [] })],
    ['facts that are not text', JSON.stringify({ version: 1, loopsCompleted: 1, facts: [1, 2] })],
    [
      'a fact with odd characters',
      JSON.stringify({ version: 1, loopsCompleted: 1, facts: ['<script>'] }),
    ],
    ['an array instead of an object', '[]'],
  ])('discards %s and starts fresh with a warning', (_name, stored) => {
    const result = loadSave(memoryStore({ [SAVE_KEY]: stored }));

    expect(result.data).toEqual(freshSave());
    expect(result.warning).toMatch(/guardado/);
  });

  it('removes duplicated facts', () => {
    const stored = JSON.stringify({ version: 1, loopsCompleted: 2, facts: ['a.b', 'a.b', 'c.d'] });

    expect(loadSave(memoryStore({ [SAVE_KEY]: stored })).data.facts).toEqual(['a.b', 'c.d']);
  });

  it('works without storage (private mode) and says so', () => {
    const result = loadSave(null);

    expect(result.data).toEqual(freshSave());
    expect(result.warning).toMatch(/sin guardar/);
  });

  it('does not crash when the storage throws', () => {
    const result = loadSave(brokenStore());

    expect(result.data).toEqual(freshSave());
    expect(result.warning).toBeDefined();
  });
});

describe('writeSave and clearSave', () => {
  it('reports failure instead of throwing when storage is unavailable', () => {
    expect(writeSave(brokenStore(), freshSave())).toBe(false);
    expect(writeSave(null, freshSave())).toBe(false);
  });

  it('clears the saved game', () => {
    const store = memoryStore();
    writeSave(store, { ...freshSave(), loopsCompleted: 3 });

    clearSave(store);

    expect(store.data.has(SAVE_KEY)).toBe(false);
    expect(loadSave(store).data.loopsCompleted).toBe(0);
  });

  it('never mutates the data it is given', () => {
    const data = Object.freeze({ ...freshSave(), facts: Object.freeze(['x.y']) });

    expect(() => writeSave(memoryStore(), data as never)).not.toThrow();
  });
});

describe('save safety (review fixes)', () => {
  it('keeps a save from a newer version of the game and marks it as read-only', () => {
    const newer = JSON.stringify({ version: SAVE_VERSION + 1, loopsCompleted: 40, facts: [] });
    const store = memoryStore({ [SAVE_KEY]: newer });

    const result = loadSave(store);

    expect(result.readOnly).toBe(true);
    expect(result.warning).toMatch(/versión más nueva/);
    expect(store.data.get(SAVE_KEY)).toBe(newer); // no se toca
  });

  it('is writable for current and fresh saves', () => {
    expect(loadSave(memoryStore()).readOnly).toBe(false);
  });

  it('never writes more loops than it accepts when reading', () => {
    const store = memoryStore();

    writeSave(store, { ...freshSave(), loopsCompleted: MAX_LOOPS + 1 });

    expect(loadSave(store).data.loopsCompleted).toBe(MAX_LOOPS);
  });

  it('tells whether clearing worked', () => {
    expect(clearSave(memoryStore())).toBe(true);
    expect(clearSave(brokenStore())).toBe(false);
    expect(clearSave(null)).toBe(true); // sin almacenamiento no hay nada guardado
  });
});
