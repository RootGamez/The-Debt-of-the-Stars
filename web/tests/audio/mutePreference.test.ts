import { describe, expect, it } from 'vitest';
import { loadMuted, saveMuted } from '../../src/audio/mutePreference';
import type { KeyValueStore } from '../../src/core/save';

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

describe('the mute preference', () => {
  it('starts with sound on', () => {
    expect(loadMuted(memoryStore())).toBe(false);
  });

  it('remembers that the player muted the game', () => {
    const store = memoryStore();

    saveMuted(store, true);

    expect(loadMuted(store)).toBe(true);
  });

  it('remembers that the player turned the sound back on', () => {
    const store = memoryStore();
    saveMuted(store, true);

    saveMuted(store, false);

    expect(loadMuted(store)).toBe(false);
  });

  it('ignores a stored value it does not understand', () => {
    expect(loadMuted(memoryStore({ 'bucle-tiempo:silencio': 'quizá' }))).toBe(false);
  });

  it('works without storage', () => {
    expect(loadMuted(null)).toBe(false);
    expect(() => {
      saveMuted(null, true);
    }).not.toThrow();
  });

  it('survives a storage that throws', () => {
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

    expect(loadMuted(broken)).toBe(false);
    expect(() => {
      saveMuted(broken, true);
    }).not.toThrow();
  });
});
