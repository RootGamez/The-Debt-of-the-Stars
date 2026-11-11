import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/core/save';
import {
  ACCESSIBILITY_KEY,
  DEFAULT_ACCESSIBILITY,
  createAccessibilitySettings,
  defaultAccessibility,
  loadAccessibility,
  saveAccessibility,
} from '../../src/accessibility/preferences';

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
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

function fakeRoot() {
  const vars = new Map<string, string>();
  return { vars, setProperty: (name: string, value: string) => void vars.set(name, value) };
}

describe('the accessibility preferences', () => {
  it('start at the design size', () => {
    expect(loadAccessibility(memoryStore())).toEqual({ uiScale: 1, textScale: 1 });
  });

  it('are read back after saving', () => {
    const store = memoryStore();
    expect(saveAccessibility(store, { uiScale: 1.5, textScale: 2 })).toBe(true);
    expect(loadAccessibility(store)).toEqual({ uiScale: 1.5, textScale: 2 });
  });

  it('fall back to the default for anything that is not an offered scale', () => {
    const bad = JSON.stringify({ uiScale: 9, textScale: 'big' });
    expect(loadAccessibility(memoryStore({ [ACCESSIBILITY_KEY]: bad }))).toEqual(
      DEFAULT_ACCESSIBILITY,
    );
  });

  it('survive corrupt JSON, non-objects and a blocked store', () => {
    expect(loadAccessibility(memoryStore({ [ACCESSIBILITY_KEY]: '{no' }))).toEqual(
      DEFAULT_ACCESSIBILITY,
    );
    expect(loadAccessibility(memoryStore({ [ACCESSIBILITY_KEY]: '[1]' }))).toEqual(
      DEFAULT_ACCESSIBILITY,
    );
    expect(loadAccessibility(broken)).toEqual(DEFAULT_ACCESSIBILITY);
    expect(saveAccessibility(broken, DEFAULT_ACCESSIBILITY)).toBe(false);
    expect(saveAccessibility(null, DEFAULT_ACCESSIBILITY)).toBe(false);
  });

  it('are applied as CSS variables at once and on every change', () => {
    const root = fakeRoot();
    const store = memoryStore();
    const settings = createAccessibilitySettings(store, root);
    expect(root.vars.get('--ui-scale')).toBe('1');
    settings.update({ uiScale: 1.75 });
    expect(root.vars.get('--ui-scale')).toBe('1.75');
    expect(root.vars.get('--text-scale')).toBe('1');
    expect(loadAccessibility(store).uiScale).toBe(1.75);
  });
});

describe('defaults for a phone held sideways', () => {
  const phone = { touch: true, height: 390 };

  it('start the interface at 125 % on a low touch screen', () => {
    expect(defaultAccessibility(phone)).toEqual({ uiScale: 1.25, textScale: 1 });
  });

  it('keep 100 % with a mouse or on a tall screen', () => {
    expect(defaultAccessibility({ touch: false, height: 390 })).toEqual(DEFAULT_ACCESSIBILITY);
    expect(defaultAccessibility({ touch: true, height: 820 })).toEqual(DEFAULT_ACCESSIBILITY);
  });

  it('are used only when nothing was saved', () => {
    expect(loadAccessibility(memoryStore(), phone)).toEqual({ uiScale: 1.25, textScale: 1 });
    const saved = memoryStore({
      [ACCESSIBILITY_KEY]: JSON.stringify({ uiScale: 1, textScale: 1 }),
    });
    expect(loadAccessibility(saved, phone)).toEqual({ uiScale: 1, textScale: 1 });
  });
});
