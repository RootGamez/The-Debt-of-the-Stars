import { describe, expect, it, vi } from 'vitest';
import { createLoopFollower } from '../../src/audio/loopFollower';
import type { LoopHandle } from '../../src/audio/samplePlayer';

function setup(canLoop = true) {
  const handle = { setLevel: vi.fn(), setRate: vi.fn(), stop: vi.fn() } satisfies LoopHandle;
  const loop = vi.fn(() => (canLoop ? handle : undefined));
  return { handle, loop, follower: createLoopFollower({ loop }, 'wormhole.idle') };
}

describe('the loop follower', () => {
  it('does not start the loop while it should be silent', () => {
    const { loop, follower } = setup();

    follower.follow(0);
    follower.follow(0.005);

    expect(loop).not.toHaveBeenCalled();
  });

  it('starts it once the level is audible and follows the level and the pitch', () => {
    const { handle, loop, follower } = setup();

    follower.follow(0.6, 1.1);
    follower.follow(0.3, 0.9);

    expect(loop).toHaveBeenCalledTimes(1);
    expect(loop).toHaveBeenCalledWith('wormhole.idle', { level: 0 });
    expect(handle.setLevel).toHaveBeenLastCalledWith(0.3, expect.any(Number));
    expect(handle.setRate).toHaveBeenLastCalledWith(0.9, expect.any(Number));
  });

  it('keeps the loop alive and silent when the level drops to zero', () => {
    const { handle, follower } = setup();
    follower.follow(0.6);

    follower.follow(0);

    expect(handle.setLevel).toHaveBeenLastCalledWith(0, expect.any(Number));
    expect(handle.stop).not.toHaveBeenCalled();
  });

  it('tries again while the audio is not unlocked yet', () => {
    const { loop, follower } = setup(false);

    follower.follow(0.6);
    follower.follow(0.6);

    expect(loop).toHaveBeenCalledTimes(2);
  });

  it('clamps nonsense levels', () => {
    const { handle, follower } = setup();

    follower.follow(5);
    expect(handle.setLevel).toHaveBeenLastCalledWith(1, expect.any(Number));
    follower.follow(Number.NaN);
    expect(handle.setLevel).toHaveBeenLastCalledWith(0, expect.any(Number));
  });

  it('stops the loop when disposed', () => {
    const { handle, follower } = setup();
    follower.follow(0.6);

    follower.dispose();

    expect(handle.stop).toHaveBeenCalled();
  });
});
