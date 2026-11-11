import { describe, expect, it, vi } from 'vitest';
import type { SampleBank, SoundEntry } from '../../src/audio/sampleBank';
import { createSamplePlayer } from '../../src/audio/samplePlayer';
/** El elemento `index` de una lista de prueba (falla con claridad si no está). */ function at<T>(
  list: readonly T[],
  index: number,
): T {
  const item = list[index];
  if (item === undefined) throw new Error(`No hay elemento ${index}`);
  return item;
}

interface FakeParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  setTargetAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
}

function param(value = 1): FakeParam {
  return {
    value,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
}

interface FakeSource {
  buffer: AudioBuffer | null;
  loop: boolean;
  playbackRate: FakeParam;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

function fakeContext() {
  const sources: FakeSource[] = [];
  const gains: { gain: FakeParam; connect: ReturnType<typeof vi.fn> }[] = [];
  const pans: { pan: FakeParam; connect: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    currentTime: 10,
    createBufferSource: () => {
      const source: FakeSource = {
        buffer: null,
        loop: false,
        playbackRate: param(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      sources.push(source);
      return source;
    },
    createGain: () => {
      const node = { gain: param(), connect: vi.fn() };
      gains.push(node);
      return node;
    },
    createStereoPanner: () => {
      const node = { pan: param(0), connect: vi.fn() };
      pans.push(node);
      return node;
    },
  };
  return { context: context as unknown as AudioContext, sources, gains, pans };
}

function fakeBank(
  entries: Record<string, SoundEntry>,
  loaded: readonly string[] = Object.keys(entries),
) {
  const buffers = (id: string) =>
    (entries[id]?.files ?? []).map((file) => ({ file }) as unknown as AudioBuffer);
  const load = vi.fn(() => Promise.resolve());
  const bank: SampleBank = {
    init: () => Promise.resolve(),
    entry: (id) => entries[id],
    ids: () => Object.keys(entries),
    buffers: (id) => (loaded.includes(id) ? buffers(id) : undefined),
    loaded: (id) => loaded.includes(id),
    load,
    failures: [],
  };
  return { bank, load };
}

const destination = {} as AudioNode;

const STEP: SoundEntry = { files: ['a.mp3', 'b.mp3'], category: 'foley', gain: 0.5, loop: false };
const LOOP: SoundEntry = { files: ['loop.mp3'], category: 'ship', gain: 1, loop: true };

function playerWith(
  entries: Record<string, SoundEntry>,
  loaded?: readonly string[],
  random = () => 0,
) {
  const fake = fakeContext();
  const { bank, load } = fakeBank(entries, loaded);
  const player = createSamplePlayer({ context: fake.context, bank, destination, random });
  return { ...fake, load, player };
}

describe('playing a sample', () => {
  it('does nothing and says so when the sound is not loaded', () => {
    const { player, sources } = playerWith({ step: STEP }, []);

    expect(player.play('step')).toBe(false);
    expect(player.play('desconocido')).toBe(false);
    expect(sources).toHaveLength(0);
  });

  it('plays one of the variants through its own gain', () => {
    const { player, sources, gains } = playerWith({ step: STEP });

    expect(player.play('step')).toBe(true);

    expect(sources).toHaveLength(1);
    expect(at(sources, 0).start).toHaveBeenCalled();
    expect(at(sources, 0).loop).toBe(false);
    expect(at(gains, 0).gain.value).toBeCloseTo(0.5); // la ganancia propia del sonido
  });

  it('multiplies the entry gain by the volume asked for', () => {
    const { player, gains } = playerWith({ step: STEP });

    player.play('step', { volume: 0.5 });

    expect(at(gains, 0).gain.value).toBeCloseTo(0.25);
  });

  it('sets the playback rate and applies the pan', () => {
    const { player, sources, pans } = playerWith({ step: STEP });

    player.play('step', { rate: 1.5, pan: -0.5 });

    expect(at(sources, 0).playbackRate.value).toBeCloseTo(1.5);
    expect(at(pans, 0).pan.value).toBeCloseTo(-0.5);
  });

  it('clamps a wild pan and a negative volume', () => {
    const { player, pans, gains } = playerWith({ step: STEP });

    player.play('step', { pan: 7, volume: -2 });

    expect(at(pans, 0).pan.value).toBe(1);
    expect(at(gains, 0).gain.value).toBe(0);
  });

  it('does not repeat the same variant twice in a row', () => {
    const picked: unknown[] = [];
    const { player, sources } = playerWith({ step: STEP }, undefined, () => 0.99);

    for (let i = 0; i < 4; i++) {
      player.play('step');
      picked.push(at(sources, i).buffer);
    }

    for (let i = 1; i < picked.length; i++) expect(picked[i]).not.toBe(picked[i - 1]);
  });

  it('varies pitch and volume a little when asked', () => {
    const { player, sources, gains } = playerWith({ step: STEP }, undefined, () => 1);

    player.play('step', { pitchJitter: 0.1, volumeJitter: 0.2 });

    expect(at(sources, 0).playbackRate.value).toBeCloseTo(1.1);
    expect(at(gains, 0).gain.value).toBeCloseTo(0.5 * 1.2);
  });

  it('stops the oldest sound of a category that is full', () => {
    const { player, sources } = playerWith({ step: { ...STEP, category: 'ui' } });

    // `ui` admite pocas voces a la vez; la siguiente corta a la más antigua.
    for (let i = 0; i < 6; i++) player.play('step');

    expect(at(sources, 0).stop).toHaveBeenCalled();
    expect(at(sources, 5).stop).not.toHaveBeenCalled();
  });

  it('frees its slot when a sound ends by itself', () => {
    const { player, sources } = playerWith({ step: { ...STEP, category: 'ui' } });
    for (let i = 0; i < 4; i++) player.play('step');

    at(sources, 0).onended?.();
    player.play('step');

    expect(at(sources, 0).stop).not.toHaveBeenCalled();
  });

  it('asks the bank to load a sound that is not there yet', () => {
    const { player, load } = playerWith({ step: STEP }, []);

    void player.preload(['step']);

    expect(load).toHaveBeenCalledWith(['step']);
  });
});

describe('values that are not numbers', () => {
  it('never reach the audio nodes when playing', () => {
    const { player, sources, gains, pans } = playerWith({ step: STEP });

    player.play('step', { volume: NaN, rate: Infinity, pan: NaN });

    expect(Number.isFinite(at(gains, 0).gain.value)).toBe(true);
    expect(Number.isFinite(at(sources, 0).playbackRate.value)).toBe(true);
    expect(at(pans, 0).pan.value).toBe(0);
  });

  it('never reach the audio nodes when a loop is adjusted', () => {
    const { player, sources, gains } = playerWith({ loop: LOOP });

    const handle = player.loop('loop', { level: NaN, rate: NaN });
    handle?.setLevel(NaN);
    handle?.setRate(NaN);

    expect(Number.isFinite(at(gains, 0).gain.value)).toBe(true);
    expect(Number.isFinite(at(sources, 0).playbackRate.value)).toBe(true);
    for (const call of at(gains, 0).gain.setTargetAtTime.mock.calls) {
      expect(Number.isFinite(call[0])).toBe(true);
    }
    for (const call of at(sources, 0).playbackRate.setTargetAtTime.mock.calls) {
      expect(Number.isFinite(call[0])).toBe(true);
    }
  });
});

describe('stopping everything', () => {
  it('fades out every loop that is still going', () => {
    const { player, sources } = playerWith({ loop: LOOP });
    player.loop('loop');
    player.loop('loop');

    player.stopAll();

    expect(at(sources, 0).stop).toHaveBeenCalledTimes(1);
    expect(at(sources, 1).stop).toHaveBeenCalledTimes(1);
  });

  it('does not stop a loop twice when it had already been stopped', () => {
    const { player, sources } = playerWith({ loop: LOOP });
    const handle = player.loop('loop');
    handle?.stop();

    player.stopAll();

    expect(at(sources, 0).stop).toHaveBeenCalledTimes(1);
  });
});

describe('looping a sample', () => {
  it('returns nothing when the sound is not loaded', () => {
    const { player } = playerWith({ loop: LOOP }, []);

    expect(player.loop('loop')).toBeUndefined();
  });

  it('starts a looping source silent by default and follows the level asked for', () => {
    const { player, sources, gains } = playerWith({ loop: LOOP });

    const handle = player.loop('loop', { level: 0 });
    handle?.setLevel(0.6);

    expect(at(sources, 0).loop).toBe(true);
    expect(at(sources, 0).start).toHaveBeenCalled();
    expect(at(gains, 0).gain.value).toBe(0);
    expect(at(gains, 0).gain.setTargetAtTime).toHaveBeenCalledWith(
      0.6,
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('follows the playback rate', () => {
    const { player, sources } = playerWith({ loop: LOOP });

    const handle = player.loop('loop');
    handle?.setRate(0.5);

    expect(at(sources, 0).playbackRate.setTargetAtTime).toHaveBeenCalledWith(
      0.5,
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('fades out and stops on request, and only once', () => {
    const { player, sources, gains } = playerWith({ loop: LOOP });

    const handle = player.loop('loop');
    handle?.stop(0.5);
    handle?.stop(0.5);

    expect(at(gains, 0).gain.setTargetAtTime).toHaveBeenCalledWith(
      0,
      expect.any(Number),
      expect.any(Number),
    );
    expect(at(sources, 0).stop).toHaveBeenCalledTimes(1);
  });
});
