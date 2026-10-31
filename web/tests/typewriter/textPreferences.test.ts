import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/core/save';
import {
  DEFAULT_TEXT_PREFERENCES,
  TEXT_PREFERENCES_KEY,
  createTextSettings,
  lettersPerSecond,
  loadTextPreferences,
  saveTextPreferences,
} from '../../src/typewriter/textPreferences';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  },
};

describe('the text preferences', () => {
  it('start at normal speed with the letter sound off', () => {
    expect(loadTextPreferences(memoryStore())).toEqual({ speed: 'normal', letterSound: false });
    expect(DEFAULT_TEXT_PREFERENCES).toEqual({ speed: 'normal', letterSound: false });
  });

  it('are remembered between games', () => {
    const store = memoryStore();

    expect(saveTextPreferences(store, { speed: 'rapida', letterSound: true })).toBe(true);

    expect(loadTextPreferences(store)).toEqual({ speed: 'rapida', letterSound: true });
  });

  it('ignore what they do not understand, field by field', () => {
    const store = memoryStore({
      [TEXT_PREFERENCES_KEY]: JSON.stringify({ speed: 'supersonica', letterSound: true }),
    });

    expect(loadTextPreferences(store)).toEqual({ speed: 'normal', letterSound: true });
  });

  it('survive damaged data and blocked storage', () => {
    expect(loadTextPreferences(memoryStore({ [TEXT_PREFERENCES_KEY]: '{no' }))).toEqual(
      DEFAULT_TEXT_PREFERENCES,
    );
    expect(loadTextPreferences(memoryStore({ [TEXT_PREFERENCES_KEY]: '[1]' }))).toEqual(
      DEFAULT_TEXT_PREFERENCES,
    );
    expect(loadTextPreferences(broken)).toEqual(DEFAULT_TEXT_PREFERENCES);
    expect(loadTextPreferences(null)).toEqual(DEFAULT_TEXT_PREFERENCES);
    expect(saveTextPreferences(broken, DEFAULT_TEXT_PREFERENCES)).toBe(false);
    expect(saveTextPreferences(null, DEFAULT_TEXT_PREFERENCES)).toBe(false);
  });

  it('turn each speed into letters per second', () => {
    expect(lettersPerSecond('lenta')).toBe(22);
    expect(lettersPerSecond('normal')).toBe(40);
    expect(lettersPerSecond('rapida')).toBe(75);
    expect(lettersPerSecond('instante')).toBe(Infinity);
  });

  it('are shared live: a change is saved and every reader sees it', () => {
    const store = memoryStore();
    const settings = createTextSettings(store);
    const seen: string[] = [];
    settings.onChange((prefs) => seen.push(prefs.speed));

    settings.update({ speed: 'lenta' });

    expect(settings.current).toEqual({ speed: 'lenta', letterSound: false });
    expect(seen).toEqual(['lenta']);
    expect(loadTextPreferences(store).speed).toBe('lenta');
  });
});
