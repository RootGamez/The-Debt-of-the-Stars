import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/core/save';
import {
  AUTO_LEVELS,
  GRAPHICS_KEY,
  createGraphicsSettings,
  defaultPreferences,
  detailsOf,
  loadGraphics,
  presetDetails,
  requiresReload,
} from '../../src/core/graphics';
import { createFpsGovernor } from '../../src/core/graphicsGovernor';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const PC = { touch: false };
const PHONE = { touch: true };

describe('graphics presets', () => {
  it('start in automatic mode, at full on a PC and halfway on a phone', () => {
    expect(defaultPreferences().preset).toBe('auto');
    expect(detailsOf(defaultPreferences(), PC)).toMatchObject({
      shadowSize: 2048,
      pixelRatio: 1.5,
    });
    expect(detailsOf(defaultPreferences(), PHONE)).toMatchObject({
      shadowSize: 1024,
      pixelRatio: 1.25,
      antialias: false,
    });
  });

  it('gets cheaper from high to medium to low', () => {
    const [high, medium, low] = [
      presetDetails('alto'),
      presetDetails('medio'),
      presetDetails('bajo'),
    ];
    expect(high.shadowSize).toBeGreaterThan(medium.shadowSize);
    expect(medium.shadowSize).toBeGreaterThan(low.shadowSize);
    expect(high.pixelRatio).toBeGreaterThan(low.pixelRatio);
    expect(low.antialias).toBe(false);
  });
});

describe('loading graphics preferences', () => {
  it('falls back to the defaults for missing or broken data', () => {
    expect(loadGraphics(null)).toEqual(defaultPreferences());
    expect(loadGraphics(memoryStore({ [GRAPHICS_KEY]: '{no json' }))).toEqual(defaultPreferences());
    expect(loadGraphics(memoryStore({ [GRAPHICS_KEY]: '[1]' }))).toEqual(defaultPreferences());
  });

  it('keeps valid values and discards the rest field by field', () => {
    const store = memoryStore({
      [GRAPHICS_KEY]: JSON.stringify({
        preset: 'custom',
        autoLevel: 99,
        custom: { shadowSize: 4096, eclipseShadows: false, pixelRatio: 1, antialias: 'si' },
      }),
    });
    const loaded = loadGraphics(store);
    expect(loaded.preset).toBe('custom');
    expect(loaded.autoLevel).toBeNull();
    expect(loaded.custom.shadowSize).toBe(defaultPreferences().custom.shadowSize);
    expect(loaded.custom.eclipseShadows).toBe(false);
    expect(loaded.custom.pixelRatio).toBe(1);
    expect(loaded.custom.antialias).toBe(defaultPreferences().custom.antialias);
  });
});

describe('graphics settings', () => {
  it('saves and restores the chosen preset', () => {
    const store = memoryStore();
    createGraphicsSettings(store, PC).choosePreset('bajo');
    expect(createGraphicsSettings(store, PC).preferences.preset).toBe('bajo');
  });

  it('turns custom when one detail is touched, starting from what was in force', () => {
    const settings = createGraphicsSettings(memoryStore(), PC);
    settings.choosePreset('alto');
    settings.setDetail({ shadowSize: 0 });
    expect(settings.preferences.preset).toBe('custom');
    expect(settings.details).toEqual({ ...presetDetails('alto'), shadowSize: 0 });
  });

  it('tells its listener now and on every change', () => {
    const settings = createGraphicsSettings(memoryStore(), PC);
    const seen: number[] = [];
    settings.subscribe((d) => seen.push(d.shadowSize));
    settings.choosePreset('bajo');
    expect(seen).toEqual([2048, 512]);
  });

  it('steps down one level at a time in automatic mode, and stops at the lowest', () => {
    const store = memoryStore();
    const settings = createGraphicsSettings(store, PC);
    let steps = 0;
    while (settings.stepDown()) steps += 1;
    expect(steps).toBe(AUTO_LEVELS - 1);
    expect(settings.details.shadowSize).toBe(0);
    // y lo recuerda para la próxima vez
    expect(createGraphicsSettings(store, PC).details.shadowSize).toBe(0);
  });

  it('does not step down by itself when a fixed mode was chosen', () => {
    const settings = createGraphicsSettings(memoryStore(), PC);
    settings.choosePreset('alto');
    expect(settings.stepDown()).toBe(false);
    expect(settings.details.shadowSize).toBe(2048);
  });

  it('starts again from the device level when automatic is chosen again', () => {
    const settings = createGraphicsSettings(memoryStore(), PHONE);
    settings.stepDown();
    settings.choosePreset('auto');
    expect(settings.details.shadowSize).toBe(1024);
  });
});

describe('what needs a reload', () => {
  const high = presetDetails('alto');
  it('is not needed for live details', () => {
    expect(requiresReload(high, { ...high, pixelRatio: 1, shadowSize: 512 }, true)).toBe(false);
  });
  it('is needed to change the edge smoothing', () => {
    expect(requiresReload(high, { ...high, antialias: false }, true)).toBe(true);
  });
  it('is needed to turn on shadows that began switched off', () => {
    expect(requiresReload(high, high, false)).toBe(true);
    expect(requiresReload(high, { ...high, shadowSize: 0 }, false)).toBe(false);
  });
  it('is reported by the live settings', () => {
    const settings = createGraphicsSettings(memoryStore(), PC);
    expect(settings.needsReload).toBe(false);
    settings.setDetail({ antialias: false });
    expect(settings.needsReload).toBe(true);
  });
});

describe('the frame governor', () => {
  const run = (governor: ReturnType<typeof createFpsGovernor>, seconds: number, frames: number) => {
    let down = 0;
    for (let i = 0; i < frames; i++) if (governor.sample(seconds)) down += 1;
    return down;
  };

  it('stays quiet while the frame rate holds', () => {
    expect(run(createFpsGovernor(), 1 / 60, 2000)).toBe(0);
  });

  it('asks to step down when the frame rate is too low, once the warm-up and a window pass', () => {
    const governor = createFpsGovernor({ warmupFrames: 10, windowFrames: 20 });
    expect(run(governor, 1 / 15, 29)).toBe(0);
    expect(run(governor, 1 / 15, 1)).toBe(1);
  });

  it('waits and measures again after a step down', () => {
    const governor = createFpsGovernor({ warmupFrames: 10, windowFrames: 20 });
    expect(run(governor, 1 / 15, 30)).toBe(1);
    expect(run(governor, 1 / 15, 29)).toBe(0);
    expect(run(governor, 1 / 15, 1)).toBe(1);
  });

  it('ignores stalls such as a hidden tab', () => {
    const governor = createFpsGovernor({ warmupFrames: 0, windowFrames: 5 });
    expect(run(governor, 3, 50)).toBe(0);
    expect(run(governor, 0, 50)).toBe(0);
    expect(run(governor, Number.NaN, 50)).toBe(0);
  });
});
