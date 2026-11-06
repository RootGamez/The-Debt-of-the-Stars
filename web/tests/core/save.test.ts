import { describe, expect, it } from 'vitest';
import {
  clearSave,
  freshSave,
  isSaveErased,
  loadSave,
  markEndingSeen,
  markPrologueDone,
  markTasksDone,
  markWorldNamed,
  MAX_TASKS,
  MAX_WORLDS,
  MAX_FACTS,
  MAX_LOOPS,
  SAVE_KEY,
  SAVE_VERSION,
  saveProgress,
  writeSave,
  type KeyValueStore,
  type SaveData,
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
    writeSave(store, {
      version: SAVE_VERSION,
      loopsCompleted: 7,
      facts: ['umbral.placa'],
      prologueDone: true,
      endings: ['B'],
      worlds: { umbral: { name: 'Primera luz', loop: 2 } },
      tasks: [],
    });

    expect(loadSave(store).data).toEqual({
      version: SAVE_VERSION,
      loopsCompleted: 7,
      facts: ['umbral.placa'],
      prologueDone: true,
      endings: ['B'],
      worlds: { umbral: { name: 'Primera luz', loop: 2 } },
      tasks: [],
    });
  });

  it('a new game has not played the prologue yet', () => {
    expect(freshSave().prologueDone).toBe(false);
  });

  it('reads a save from before the prologue (version 1) as one that already went through it', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 1, loopsCompleted: 4, facts: ['a.b'] }));

    expect(loadSave(store)).toEqual({
      data: {
        version: SAVE_VERSION,
        loopsCompleted: 4,
        facts: ['a.b'],
        prologueDone: true,
        endings: [],
        worlds: {},
        tasks: [],
      },
      readOnly: false,
    });
  });

  it('reads a save from before the endings (version 2) as one that has seen none', () => {
    const store = memoryStore();
    const v2 = { version: 2, loopsCompleted: 3, facts: ['a.b'], prologueDone: false };
    store.setItem(SAVE_KEY, JSON.stringify(v2));

    expect(loadSave(store).data).toEqual({
      ...v2,
      version: SAVE_VERSION,
      endings: [],
      worlds: {},
      tasks: [],
    });
  });

  it.each([
    ['without endings', undefined],
    ['with something that is not an ending', ['tarde']],
    ['with endings that are not a list', 'A'],
  ])('rejects a version 3 save %s', (_name, endings) => {
    const store = memoryStore();
    const raw = { version: 3, loopsCompleted: 1, facts: [], prologueDone: true, endings };
    store.setItem(SAVE_KEY, JSON.stringify(raw));

    expect(loadSave(store).data).toEqual(freshSave());
    expect(loadSave(store).warning).toBeDefined();
  });

  it('rejects a version 2 save without a clear prologue flag', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 2, loopsCompleted: 1, facts: [] }));

    expect(loadSave(store).data).toEqual(freshSave());
    expect(loadSave(store).warning).toBeDefined();
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

describe('saveProgress (two tabs never lose facts)', () => {
  const progress = (loops: number, facts: string[], prologueDone = false): SaveData => ({
    version: SAVE_VERSION,
    loopsCompleted: loops,
    facts,
    prologueDone,
    endings: [],
    worlds: {},
    tasks: [],
  });

  it('never forgets that the prologue was played, whichever tab saves last', () => {
    const store = memoryStore();
    saveProgress(store, progress(0, [], true));

    saveProgress(store, progress(1, ['a.b']));

    expect(loadSave(store).data.prologueDone).toBe(true);
  });

  it('keeps the facts another tab saved and adds the new ones', () => {
    const store = memoryStore();
    writeSave(store, progress(2, ['a.uno']));

    expect(saveProgress(store, progress(1, ['b.dos']))).toBe(true);

    expect([...loadSave(store).data.facts].sort()).toEqual(['a.uno', 'b.dos']);
  });

  it('keeps the highest loop count', () => {
    const store = memoryStore();
    writeSave(store, progress(5, []));

    saveProgress(store, progress(3, []));

    expect(loadSave(store).data.loopsCompleted).toBe(5);
  });

  it('does not duplicate facts', () => {
    const store = memoryStore();
    writeSave(store, progress(0, ['a.uno']));

    saveProgress(store, progress(0, ['a.uno', 'a.uno']));

    expect(loadSave(store).data.facts).toEqual(['a.uno']);
  });

  it('never overwrites a save from a newer version of the game', () => {
    const newer = JSON.stringify({ version: SAVE_VERSION + 1, loopsCompleted: 9, facts: [] });
    const store = memoryStore({ [SAVE_KEY]: newer });

    expect(saveProgress(store, progress(1, ['a.uno']))).toBe(false);

    expect(store.data.get(SAVE_KEY)).toBe(newer);
  });

  it('replaces a damaged save with the new progress', () => {
    const store = memoryStore({ [SAVE_KEY]: '{roto' });

    expect(saveProgress(store, progress(1, ['a.uno']))).toBe(true);

    expect(loadSave(store).data.facts).toEqual(['a.uno']);
  });

  it('keeps stored fact ids it does not know about (a newer data file may use them)', () => {
    const store = memoryStore();
    writeSave(store, progress(0, ['futuro.hecho']));

    saveProgress(store, progress(0, ['a.uno']));

    expect(loadSave(store).data.facts).toContain('futuro.hecho');
  });

  it('reports failure without throwing when storage is unavailable', () => {
    expect(saveProgress(null, progress(0, []))).toBe(false);
    expect(saveProgress(brokenStore(), progress(0, []))).toBe(false);
  });

  it('never stores more facts than it accepts when reading', () => {
    const store = memoryStore();
    const many = Array.from({ length: MAX_FACTS + 10 }, (_, i) => `f.n${i}`);

    saveProgress(store, progress(0, many));

    expect(loadSave(store).data.facts).toHaveLength(MAX_FACTS);
  });
});

describe('saveProgress with a full store (review fixes)', () => {
  it('keeps the new facts even when the stored list is already at the limit', () => {
    const store = memoryStore();
    const junk = Array.from({ length: MAX_FACTS }, (_, i) => `junk.n${i}`);
    writeSave(store, { ...freshSave(), facts: junk });

    saveProgress(store, { ...freshSave(), facts: ['a.uno'] });

    const saved = loadSave(store).data.facts;
    expect(saved).toContain('a.uno');
    expect(saved).toHaveLength(MAX_FACTS);
  });
});

describe('isSaveErased', () => {
  it('is true when another tab removes the save or clears the storage', () => {
    expect(isSaveErased({ key: SAVE_KEY, newValue: null })).toBe(true);
    expect(isSaveErased({ key: null, newValue: null })).toBe(true);
  });

  it('is false for changes of the save and for other keys', () => {
    expect(isSaveErased({ key: SAVE_KEY, newValue: '{}' })).toBe(false);
    expect(isSaveErased({ key: 'otra-cosa', newValue: null })).toBe(false);
  });
});

describe('markPrologueDone (crossing the wormhole)', () => {
  it('saves the prologue as played, keeping the facts and loops already there', () => {
    const store = memoryStore();
    writeSave(store, { ...freshSave(), facts: ['casa.mision_luna'] });

    expect(markPrologueDone(store, loadSave(store), 0)).toBe(true);

    expect(loadSave(store).data).toMatchObject({ prologueDone: true, facts: ['casa.mision_luna'] });
  });

  it('cannot save without storage, and leaves a save from a newer version alone', () => {
    expect(markPrologueDone(null, { data: freshSave(), readOnly: false }, 0)).toBe(false);

    const newer = JSON.stringify({ version: SAVE_VERSION + 1, loopsCompleted: 3, facts: [] });
    const store = memoryStore({ [SAVE_KEY]: newer });
    expect(markPrologueDone(store, loadSave(store), 0)).toBe(false);
    expect(store.data.get(SAVE_KEY)).toBe(newer);
  });
});

describe('markEndingSeen (reaching an ending)', () => {
  it('adds the ending to the ones already seen, keeping everything else', () => {
    const store = memoryStore();
    writeSave(store, { ...freshSave(), loopsCompleted: 5, facts: ['a.b'], endings: ['A'] });

    expect(markEndingSeen(store, loadSave(store), 'B')).toBe(true);
    expect(markEndingSeen(store, loadSave(store), 'B')).toBe(true);

    expect(loadSave(store).data).toMatchObject({
      loopsCompleted: 5,
      facts: ['a.b'],
      endings: ['A', 'B'],
    });
  });

  it('cannot save without storage, and leaves a save from a newer version alone', () => {
    expect(markEndingSeen(null, { data: freshSave(), readOnly: false }, 'A')).toBe(false);

    const newer = JSON.stringify({ version: SAVE_VERSION + 1, loopsCompleted: 3, facts: [] });
    const store = memoryStore({ [SAVE_KEY]: newer });
    expect(markEndingSeen(store, loadSave(store), 'A')).toBe(false);
    expect(store.data.get(SAVE_KEY)).toBe(newer);
  });
});

describe('the named worlds (version 4)', () => {
  it('reads a save from before the log of worlds (version 3) with no world named yet', () => {
    const store = memoryStore();
    const v3 = {
      version: 3,
      loopsCompleted: 2,
      facts: ['a.b'],
      prologueDone: true,
      endings: ['A'],
    };
    store.setItem(SAVE_KEY, JSON.stringify(v3));

    expect(loadSave(store).data).toEqual({ ...v3, version: SAVE_VERSION, worlds: {}, tasks: [] });
  });

  it.each([
    ['without worlds', undefined],
    ['with worlds that are a list', []],
    ['with a world id with odd characters', { '<b>': { name: 'x', loop: 0 } }],
    ['with an empty name', { umbral: { name: '', loop: 0 } }],
    ['with a name that is too long', { umbral: { name: 'a'.repeat(25), loop: 0 } }],
    ['with control characters in a name', { umbral: { name: 'a b', loop: 0 } }],
    ['with a broken loop', { umbral: { name: 'Umbral', loop: -1 } }],
    ['with a world that is not an object', { umbral: 'Umbral' }],
  ])('rejects a version 4 save %s', (_name, worlds) => {
    const store = memoryStore();
    const raw = {
      version: 4,
      loopsCompleted: 1,
      facts: [],
      prologueDone: true,
      endings: [],
      worlds,
    };
    store.setItem(SAVE_KEY, JSON.stringify(raw));

    expect(loadSave(store).data).toEqual(freshSave());
    expect(loadSave(store).warning).toBeDefined();
  });

  it('rejects a save with more worlds than it accepts', () => {
    const worlds = Object.fromEntries(
      Array.from({ length: MAX_WORLDS + 1 }, (_, i) => [`mundo${i}`, { name: 'x', loop: 0 }]),
    );
    const store = memoryStore();
    const raw = {
      version: 4,
      loopsCompleted: 1,
      facts: [],
      prologueDone: true,
      endings: [],
      worlds,
    };
    store.setItem(SAVE_KEY, JSON.stringify(raw));

    expect(loadSave(store).data).toEqual(freshSave());
  });

  it('keeps the worlds another tab named and adds the new one', () => {
    const store = memoryStore();
    writeSave(store, { ...freshSave(), worlds: { umbral: { name: 'Primera luz', loop: 0 } } });

    saveProgress(store, { ...freshSave(), worlds: { archivo: { name: 'Frío', loop: 3 } } });

    expect(loadSave(store).data.worlds).toEqual({
      umbral: { name: 'Primera luz', loop: 0 },
      archivo: { name: 'Frío', loop: 3 },
    });
  });

  it('saves the name of a world keeping everything else, and not over a newer save', () => {
    const store = memoryStore();
    writeSave(store, { ...freshSave(), loopsCompleted: 4, facts: ['a.b'] });

    expect(markWorldNamed(store, loadSave(store), 'umbral', 'Primera luz', 4)).toBe(true);

    expect(loadSave(store).data).toMatchObject({
      loopsCompleted: 4,
      facts: ['a.b'],
      worlds: { umbral: { name: 'Primera luz', loop: 4 } },
      tasks: [],
    });
    const newer = JSON.stringify({ version: SAVE_VERSION + 1, loopsCompleted: 3, facts: [] });
    const other = memoryStore({ [SAVE_KEY]: newer });
    expect(markWorldNamed(other, loadSave(other), 'umbral', 'x', 0)).toBe(false);
    expect(other.data.get(SAVE_KEY)).toBe(newer);
  });
});

describe('the loop tasks in the save (version 5)', () => {
  it('reads a save from before them (version 4) with none done, keeping the rest', () => {
    const v4 = { ...freshSave(), version: 4, facts: ['llegada.gusano'], tasks: undefined };
    const store = memoryStore({ [SAVE_KEY]: JSON.stringify(v4) });
    const { data, warning } = loadSave(store);
    expect(warning).toBeUndefined();
    expect(data.tasks).toEqual([]);
    expect(data.facts).toEqual(['llegada.gusano']);
  });

  it('keeps the tasks done, merged with what another tab saved', () => {
    const store = memoryStore();
    expect(markTasksDone(store, loadSave(store), ['explorar'])).toBe(true);
    expect(markTasksDone(store, loadSave(store), ['nave_umbral', 'explorar'])).toBe(true);
    expect(loadSave(store).data.tasks).toEqual(['explorar', 'nave_umbral']);
  });

  it('throws away a save whose tasks are not a short list of ids', () => {
    for (const tasks of [
      'explorar',
      [3],
      ['<script>'],
      Array.from({ length: MAX_TASKS + 1 }, (_, i) => `t${String(i)}`),
    ]) {
      const store = memoryStore({ [SAVE_KEY]: JSON.stringify({ ...freshSave(), tasks }) });
      expect(loadSave(store).warning).toBeDefined();
    }
  });
});
