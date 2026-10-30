import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/core/save';
import {
  ARRIVAL_KEY,
  ARRIVING_CLASS,
  ARRIVING_DARK_CLASS,
  markCrossing,
  takeCrossing,
} from '../../src/ui/arrival';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
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

describe('waking up after the wormhole', () => {
  it('knows the page comes from the wormhole, only on the next load', () => {
    const store = memoryStore();
    expect(takeCrossing(store)).toBeUndefined();

    markCrossing(store);

    expect(takeCrossing(store)).toBe('blanco');
    expect(takeCrossing(store)).toBeUndefined(); // recargar otra vez ya no viene del gusano
  });

  it('remembers that the stable horizon fades to black (Phase 10)', () => {
    const store = memoryStore();

    markCrossing(store, 'negro');

    expect(takeCrossing(store)).toBe('negro');
  });

  it('reads an old mark from before the colours as white', () => {
    const store = memoryStore();
    store.setItem(ARRIVAL_KEY, '1');

    expect(takeCrossing(store)).toBe('blanco');
  });

  it('goes on without the white when there is no session to write to', () => {
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

    expect(() => {
      markCrossing(broken);
    }).not.toThrow();
    expect(takeCrossing(broken)).toBeUndefined();
    expect(takeCrossing(null)).toBeUndefined();
  });

  it('the page itself is born white with the same key, before the game arrives', () => {
    const page = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

    expect(page).toContain(`sessionStorage.getItem('${ARRIVAL_KEY}')`);
    expect(page).toContain(`classList.add('${ARRIVING_CLASS}')`);
    expect(page).toContain(`html.${ARRIVING_CLASS} body`);
    expect(page).toContain(`html.${ARRIVING_DARK_CLASS} body`);
    expect(page).toContain(`classList.add('${ARRIVING_DARK_CLASS}')`);
  });
});
