// Jugar es solo en horizontal: cuándo sale el aviso de girar el teléfono y cómo se intenta bloquear la pantalla.
import { describe, expect, it, vi } from 'vitest';
import { shouldShowRotateGuard, watchOrientation } from '../../../src/ui/touch/orientation';
import { installLandscapeLock } from '../../../src/ui/touch/orientationLock';

function fakeQuery(initial: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initial,
    addEventListener(_type: 'change', listener: () => void, options?: { signal?: AbortSignal }) {
      listeners.add(listener);
      options?.signal?.addEventListener('abort', () => listeners.delete(listener));
    },
  };
  return {
    query,
    turn(portrait: boolean) {
      query.matches = portrait;
      for (const listener of [...listeners]) listener();
    },
    count: () => listeners.size,
  };
}

describe('shouldShowRotateGuard', () => {
  it('only asks to turn the phone on a touch screen held upright', () => {
    expect(shouldShowRotateGuard({ touch: true, portrait: true })).toBe(true);
    expect(shouldShowRotateGuard({ touch: true, portrait: false })).toBe(false);
    expect(shouldShowRotateGuard({ touch: false, portrait: true })).toBe(false);
    expect(shouldShowRotateGuard({ touch: false, portrait: false })).toBe(false);
  });
});

describe('watchOrientation', () => {
  it('reads the current orientation', () => {
    expect(watchOrientation(fakeQuery(true).query).portrait).toBe(true);
    expect(watchOrientation(fakeQuery(false).query).portrait).toBe(false);
  });

  it('tells every subscriber when the phone is turned', () => {
    const fake = fakeQuery(false);
    const watcher = watchOrientation(fake.query);
    const first = vi.fn();
    const second = vi.fn();
    watcher.subscribe(first);
    watcher.subscribe(second);
    fake.turn(true);
    expect(watcher.portrait).toBe(true);
    expect(first).toHaveBeenCalledWith(true);
    expect(second).toHaveBeenCalledWith(true);
    fake.turn(false);
    expect(first).toHaveBeenLastCalledWith(false);
  });

  it('does not repeat a change that did not change anything', () => {
    const fake = fakeQuery(true);
    const watcher = watchOrientation(fake.query);
    const listener = vi.fn();
    watcher.subscribe(listener);
    fake.turn(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a subscriber that unsubscribed, and everyone once disposed', () => {
    const fake = fakeQuery(false);
    const watcher = watchOrientation(fake.query);
    const gone = vi.fn();
    const kept = vi.fn();
    const unsubscribe = watcher.subscribe(gone);
    watcher.subscribe(kept);
    unsubscribe();
    fake.turn(true);
    expect(gone).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
    watcher.dispose();
    expect(fake.count()).toBe(0);
    fake.turn(false);
    expect(kept).toHaveBeenCalledTimes(1);
  });
});

function fakeLockEnvironment(options: { lock?: () => Promise<void> } = {}) {
  const listeners = new Map<string, Set<() => void>>();
  const lock = vi.fn(options.lock ?? (() => Promise.resolve()));
  const unlock = vi.fn();
  const doc = {
    fullscreenElement: null as unknown,
    addEventListener(type: string, listener: () => void, opts?: { signal?: AbortSignal }) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
      opts?.signal?.addEventListener('abort', () => set.delete(listener));
    },
  };
  return {
    doc,
    screen: { orientation: { lock, unlock } },
    lock,
    unlock,
    fire(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
    count: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
  };
}

describe('installLandscapeLock', () => {
  it('asks for landscape on the first touch of the player', () => {
    const env = fakeLockEnvironment();
    installLandscapeLock(env.doc, env.screen);
    expect(env.lock).not.toHaveBeenCalled();
    env.fire('pointerup');
    env.fire('pointerup');
    expect(env.lock).toHaveBeenCalledTimes(1);
    expect(env.lock).toHaveBeenCalledWith('landscape');
  });

  it('locks again when entering full screen and unlocks when leaving it', () => {
    const env = fakeLockEnvironment();
    installLandscapeLock(env.doc, env.screen);
    env.doc.fullscreenElement = {};
    env.fire('fullscreenchange');
    expect(env.lock).toHaveBeenCalledWith('landscape');
    env.doc.fullscreenElement = null;
    env.fire('fullscreenchange');
    expect(env.unlock).toHaveBeenCalledTimes(1);
  });

  it('survives a browser that refuses the lock', async () => {
    const env = fakeLockEnvironment({ lock: () => Promise.reject(new Error('NotSupportedError')) });
    installLandscapeLock(env.doc, env.screen);
    expect(() => {
      env.fire('pointerup');
    }).not.toThrow();
    await Promise.resolve();
  });

  it('survives a browser that throws synchronously', () => {
    const env = fakeLockEnvironment({
      lock: () => {
        throw new Error('boom');
      },
    });
    installLandscapeLock(env.doc, env.screen);
    expect(() => {
      env.fire('pointerup');
    }).not.toThrow();
  });

  it('does nothing where the orientation API does not exist (iPhone)', () => {
    const env = fakeLockEnvironment();
    const dispose = installLandscapeLock(env.doc, {});
    expect(() => {
      env.fire('pointerup');
      env.fire('fullscreenchange');
    }).not.toThrow();
    dispose();
  });

  it('removes every listener when disposed', () => {
    const env = fakeLockEnvironment();
    const dispose = installLandscapeLock(env.doc, env.screen);
    dispose();
    expect(env.count()).toBe(0);
  });
});
