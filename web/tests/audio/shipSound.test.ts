import { describe, expect, it, vi } from 'vitest';
import type { ShipAudioFrame } from '../../src/audio/shipAudio';
import { createShipSound, type SoundOutput } from '../../src/audio/shipSound';
import type { LoopHandle } from '../../src/audio/samplePlayer';
import { THRUSTERS } from '../../src/ship/thrusters';

function fakeHandle() {
  return { setLevel: vi.fn(), setRate: vi.fn(), stop: vi.fn() } satisfies LoopHandle;
}

function fakeOutput(canLoop = true) {
  const handles = new Map<string, ReturnType<typeof fakeHandle>>();
  const play = vi.fn(() => true);
  const loop = vi.fn((id: string) => {
    if (!canLoop) return undefined;
    const handle = fakeHandle();
    handles.set(id, handle);
    return handle;
  });
  const output: SoundOutput = { play, loop };
  return { output, play, loop, handles };
}

const FRAME: ShipAudioFrame = {
  dt: 1 / 60,
  piloting: true,
  landed: false,
  speed: 0,
  levels: THRUSTERS.map(() => 0),
  hatch: 0,
  impact: 0,
  crashed: false,
};

const mainEngine = THRUSTERS.findIndex((t) => t.group === 'main');

function firing(level: number): ShipAudioFrame {
  return { ...FRAME, levels: THRUSTERS.map((_, i) => (i === mainEngine ? level : 0)) };
}

describe('the ship sound', () => {
  it('plays the one-shot sounds the logic asks for', () => {
    const { output, play } = fakeOutput();
    const sound = createShipSound(output);
    sound.update(FRAME);

    sound.update(firing(0.8));

    expect(play).toHaveBeenCalledWith(
      'thr.ignite',
      expect.objectContaining({ pan: expect.any(Number) as number }),
    );
  });

  it('starts the loop of a group only when it fires, and follows its level and pitch', () => {
    const { output, loop, handles } = fakeOutput();
    const sound = createShipSound(output);

    sound.update(FRAME);
    expect(loop).not.toHaveBeenCalled();

    sound.update(firing(0.8));
    sound.update(firing(0.5));

    expect(loop).toHaveBeenCalledTimes(1);
    expect(loop).toHaveBeenCalledWith('thr.loop.main', { level: 0 });
    const handle = handles.get('thr.loop.main');
    expect(handle?.setLevel).toHaveBeenLastCalledWith(0.5, expect.any(Number));
    expect(handle?.setRate).toHaveBeenCalled();
  });

  it('lets the loop fall silent, without stopping it, when the thrust ends', () => {
    const { output, handles } = fakeOutput();
    const sound = createShipSound(output);
    sound.update(FRAME);
    sound.update(firing(0.8));

    sound.update(FRAME);

    const handle = handles.get('thr.loop.main');
    expect(handle?.setLevel).toHaveBeenLastCalledWith(0, expect.any(Number));
    expect(handle?.stop).not.toHaveBeenCalled();
  });

  it('keeps trying to start a loop that could not start yet (no audio unlocked)', () => {
    const closed = fakeOutput(false);
    const sound = createShipSound(closed.output);
    sound.update(FRAME);

    sound.update(firing(0.8));
    sound.update(firing(0.8));

    expect(closed.loop).toHaveBeenCalledTimes(2);
  });

  it('stops every loop when disposed', () => {
    const { output, handles } = fakeOutput();
    const sound = createShipSound(output);
    sound.update(FRAME);
    sound.update(firing(0.8));

    sound.dispose();

    expect(handles.get('thr.loop.main')?.stop).toHaveBeenCalled();
  });
});
