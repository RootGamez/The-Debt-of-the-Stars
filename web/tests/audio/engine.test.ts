import { describe, expect, it, vi } from 'vitest';
import { createAudioEngine } from '../../src/audio/engine';
import { computeMix, type MixInput } from '../../src/audio/mix';

/** Un contexto de audio de mentira: cualquier nodo acepta cualquier llamada y devuelve otro nodo. */
function fakeNode(): unknown {
  const target = function () {};
  const store = new Map<PropertyKey, unknown>();
  const proxy: unknown = new Proxy(target, {
    get(_t, key) {
      if (key === 'then') return undefined;
      if (!store.has(key)) store.set(key, fakeNode());
      return store.get(key);
    },
    set(_t, key, value) {
      store.set(key, value);
      return true;
    },
    apply: () => fakeNode(),
  });
  return proxy;
}

function fakeContext(close: () => Promise<void> = () => Promise.resolve()): AudioContext {
  const state = { time: 0, running: false };
  const base = fakeNode() as Record<string, unknown>;
  return new Proxy(base, {
    get(target, key) {
      if (key === 'currentTime') return state.time;
      if (key === 'sampleRate') return 8000;
      if (key === 'state') return state.running ? 'running' : 'suspended';
      if (key === 'resume') {
        return () => {
          state.running = true;
          return Promise.resolve();
        };
      }
      if (key === 'suspend') {
        return () => {
          state.running = false;
          return Promise.resolve();
        };
      }
      if (key === 'close') return close;
      if (key === 'createBuffer') {
        return (_channels: number, length: number) => ({
          getChannelData: () => new Float32Array(length),
        });
      }
      if (key === '__advance') return (dt: number) => (state.time += dt);
      return target[key as string];
    },
  }) as unknown as AudioContext;
}

const input: MixInput = {
  worldId: 'umbral',
  rate: 1,
  events: [],
  absorption: 0,
  hole: 0,
  phase: 'playing',
  fade: 0,
  running: true,
  piloting: false,
  muted: false,
};

describe('the audio engine', () => {
  it('does nothing until a user gesture unlocks it', () => {
    const factory = vi.fn(() => fakeContext());
    const engine = createAudioEngine(factory);

    engine.update(computeMix(input));

    expect(factory).not.toHaveBeenCalled();
    expect(engine.voiceCount).toBe(0);
  });

  it('starts the voices of the mix once unlocked', () => {
    const engine = createAudioEngine(() => fakeContext());
    engine.unlock();

    engine.update(computeMix({ ...input, events: ['cielo_rojo'] }));

    expect(engine.voiceCount).toBe(2);
  });

  it('lets a voice fade out and then frees it', () => {
    const context = fakeContext();
    const engine = createAudioEngine(() => context);
    engine.unlock();
    engine.update(computeMix({ ...input, events: ['cielo_rojo'] }));

    (context as unknown as { __advance(dt: number): void }).__advance(0.1);
    engine.update(computeMix(input));
    expect(engine.voiceCount).toBe(2); // todavía se está apagando

    (context as unknown as { __advance(dt: number): void }).__advance(10);
    engine.update(computeMix(input));
    expect(engine.voiceCount).toBe(1);
  });

  it('keeps the voice of a recording alive in the silences between sentences', () => {
    const context = fakeContext();
    const engine = createAudioEngine(() => context);
    engine.unlock();
    const quiet = computeMix({
      ...input,
      running: false,
      recording: { factor: 0.2, speaking: false },
    });

    engine.update(quiet);
    (context as unknown as { __advance(dt: number): void }).__advance(10);
    engine.update(quiet);

    expect(engine.voiceIds).toContain('grabacion');
  });

  it('survives a long run of changing worlds, rates and events', () => {
    const context = fakeContext();
    const engine = createAudioEngine(() => context);
    engine.unlock();
    const worlds = [
      'umbral',
      'archivo',
      'taller',
      'cicatriz',
      'observatorio',
      'laboratorio',
      undefined,
    ];

    for (let i = 0; i < 400; i++) {
      (context as unknown as { __advance(dt: number): void }).__advance(0.5);
      engine.update(
        computeMix({
          ...input,
          worldId: worlds[i % worlds.length],
          rate: 0.2 + (i % 7) * 0.2,
          events: i % 3 === 0 ? ['alineacion', 'secuencia_fabrica'] : [],
          piloting: i % 5 === 0,
          running: i % 11 !== 0,
          recording: i % 4 === 0 ? { factor: (i % 9) * 0.5, speaking: i % 8 === 0 } : null,
        }),
      );
    }

    expect(engine.voiceCount).toBeLessThan(12);
  });

  it('keeps working when the browser has no Web Audio', () => {
    const engine = createAudioEngine(() => {
      throw new Error('sin audio');
    });

    expect(() => {
      engine.unlock();
      engine.update(computeMix(input));
    }).not.toThrow();
    expect(engine.voiceCount).toBe(0);
  });

  it('closes the context on dispose', () => {
    const close = vi.fn(() => Promise.resolve());
    const context = fakeContext(close);
    const engine = createAudioEngine(() => context);
    engine.unlock();

    engine.dispose();

    expect(close).toHaveBeenCalled();
    expect(engine.voiceCount).toBe(0);
  });
});

describe('the voice of the letters', () => {
  it('stays silent until the audio is unlocked and then plays a short tone', async () => {
    let oscillators = 0;
    const context = fakeContext();
    const counting = new Proxy(context, {
      get(target, key) {
        if (key === 'createOscillator') {
          oscillators++;
        }
        return Reflect.get(target, key) as unknown;
      },
    });
    const engine = createAudioEngine(() => counting);

    engine.blip(300);
    expect(oscillators).toBe(0);

    engine.unlock();
    await Promise.resolve();
    engine.blip(300);

    expect(oscillators).toBe(1);
  });
});
