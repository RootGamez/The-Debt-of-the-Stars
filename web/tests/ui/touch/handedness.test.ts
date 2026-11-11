// Mano zurda: el dock y el joystick se espejan; la elección se recuerda entre partidas.
import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../../src/core/save';
import {
  HANDEDNESS_KEY,
  loadLeftHanded,
  saveLeftHanded,
  stickSideIsLeft,
} from '../../../src/ui/touch/handedness';

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

describe('handedness', () => {
  it('is right-handed by default and with nothing or junk saved', () => {
    expect(loadLeftHanded(null)).toBe(false);
    expect(loadLeftHanded(memoryStore())).toBe(false);
    expect(loadLeftHanded(memoryStore({ [HANDEDNESS_KEY]: 'x' }))).toBe(false);
  });

  it('remembers the choice', () => {
    const store = memoryStore();
    expect(saveLeftHanded(store, true)).toBe(true);
    expect(loadLeftHanded(store)).toBe(true);
    saveLeftHanded(store, false);
    expect(loadLeftHanded(store)).toBe(false);
  });

  it('survives a store that refuses', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    };
    expect(loadLeftHanded(broken)).toBe(false);
    expect(saveLeftHanded(broken, true)).toBe(false);
    expect(saveLeftHanded(null, true)).toBe(false);
  });

  it('puts the joystick on the left half for right-handed players and the right half for left-handed ones', () => {
    expect(stickSideIsLeft(100, 800, false)).toBe(true);
    expect(stickSideIsLeft(700, 800, false)).toBe(false);
    expect(stickSideIsLeft(100, 800, true)).toBe(false);
    expect(stickSideIsLeft(700, 800, true)).toBe(true);
  });
});
