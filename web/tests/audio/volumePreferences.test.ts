import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VOLUMES,
  VOLUME_KEY,
  VOLUME_STEPS,
  createVolumeSettings,
  loadVolumes,
  saveVolumes,
} from '../../src/audio/volumePreferences';
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

describe('the volume preferences', () => {
  it('starts at full volume for both buses', () => {
    expect(loadVolumes(memoryStore())).toEqual(DEFAULT_VOLUMES);
    expect(DEFAULT_VOLUMES).toEqual({ effects: 1, ambient: 1 });
  });

  it('offers silence and four more steps', () => {
    expect(VOLUME_STEPS).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('remembers what the player chose', () => {
    const store = memoryStore();

    saveVolumes(store, { effects: 0.5, ambient: 0.25 });

    expect(loadVolumes(store)).toEqual({ effects: 0.5, ambient: 0.25 });
  });

  it('falls back to the defaults for anything it does not understand', () => {
    for (const raw of ['no es json', '[]', 'null', '{"effects":0.3,"ambient":"alto"}', '7']) {
      const loaded = loadVolumes(memoryStore({ [VOLUME_KEY]: raw }));
      expect(loaded).toEqual(DEFAULT_VOLUMES);
    }
  });

  it('keeps the valid half when the other is wrong', () => {
    const store = memoryStore({ [VOLUME_KEY]: '{"effects":0,"ambient":0.3}' });

    expect(loadVolumes(store)).toEqual({ effects: 0, ambient: 1 });
  });

  it('does not throw without storage', () => {
    expect(loadVolumes(null)).toEqual(DEFAULT_VOLUMES);
    expect(saveVolumes(null, DEFAULT_VOLUMES)).toBe(false);
  });

  it('does not throw when the storage refuses to write', () => {
    const broken: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => undefined,
    };

    expect(saveVolumes(broken, DEFAULT_VOLUMES)).toBe(false);
  });
});

describe('the live volume settings', () => {
  it('apply a change at once, save it and tell the listener', () => {
    const store = memoryStore();
    const seen: unknown[] = [];
    const settings = createVolumeSettings(store, (volumes) => seen.push(volumes));

    settings.update({ effects: 0.25 });

    expect(settings.current).toEqual({ effects: 0.25, ambient: 1 });
    expect(loadVolumes(store)).toEqual({ effects: 0.25, ambient: 1 });
    // La primera llamada es la de arranque; la segunda, el cambio.
    expect(seen).toEqual([
      { effects: 1, ambient: 1 },
      { effects: 0.25, ambient: 1 },
    ]);
  });

  it('tell the listener the saved volumes right away', () => {
    const store = memoryStore();
    saveVolumes(store, { effects: 0.75, ambient: 0 });
    const seen: unknown[] = [];

    createVolumeSettings(store, (volumes) => seen.push(volumes));

    expect(seen).toEqual([{ effects: 0.75, ambient: 0 }]);
  });
});
