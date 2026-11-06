import { describe, expect, it, vi } from 'vitest';
import { composeActions } from '../../src/reading/composeActions';
import type { SourceActions } from '../../src/reading/readingUi';

function actions(
  id: string,
  verb: string,
): { actions: SourceActions; run: ReturnType<typeof vi.fn> } {
  const run = vi.fn();
  return {
    run,
    actions: {
      gone: (other) => other === `${id}.gone`,
      verb: (other) => (other === id ? verb : undefined),
      run: (other) => {
        run(other);
      },
    },
  };
}

describe('composing the actions of several sources', () => {
  it('has nothing when no part has anything', () => {
    expect(composeActions([undefined, undefined])).toBeUndefined();
  });

  it('asks every part and uses the verb of the one that owns the source', () => {
    const a = actions('a', 'coger');
    const b = actions('b', 'poner');
    const all = composeActions([a.actions, undefined, b.actions]);

    expect(all?.verb('a', false)).toBe('coger');
    expect(all?.verb('b', false)).toBe('poner');
    expect(all?.verb('c', false)).toBeUndefined();
  });

  it('runs only the part that owns the source', () => {
    const a = actions('a', 'coger');
    const b = actions('b', 'poner');
    const all = composeActions([a.actions, b.actions]);

    all?.run('b');

    expect(a.run).not.toHaveBeenCalled();
    expect(b.run).toHaveBeenCalledWith('b');
  });

  it('says a source is gone when any part says so', () => {
    const all = composeActions([actions('a', 'x').actions, actions('b', 'y').actions]);

    expect(all?.gone('b.gone')).toBe(true);
    expect(all?.gone('a')).toBe(false);
  });
});
