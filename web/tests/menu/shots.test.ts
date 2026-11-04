import { describe, expect, it } from 'vitest';
import {
  FADE_SECONDS,
  SHOTS,
  poseAt,
  showcaseState,
  totalSeconds,
  type Shot,
} from '../../src/menu/shots';
import { isProceduralWorld } from '../../src/worlds/procedural';

describe('the menu showcase', () => {
  it('only shows worlds that are built by code', () => {
    for (const shot of SHOTS) expect(isProceduralWorld(shot.world), shot.world).toBe(true);
  });

  it('never repeats a world in two consecutive shots, not even when it loops', () => {
    SHOTS.forEach((shot, i) => {
      expect(SHOTS[(i + 1) % SHOTS.length]?.world).not.toBe(shot.world);
    });
  });

  it('starts black, clears in the middle of a shot and goes black again at the cut', () => {
    const first = SHOTS[0] as Shot;
    expect(showcaseState(0).fade).toBe(1);
    expect(showcaseState(first.seconds / 2).fade).toBe(0);
    expect(showcaseState(first.seconds - 0.01).fade).toBeGreaterThan(0.9);
    expect(showcaseState(FADE_SECONDS / 2).fade).toBeCloseTo(0.5);
  });

  it('moves on to the next shot and loops after the last one', () => {
    const first = SHOTS[0] as Shot;
    expect(showcaseState(first.seconds + 0.5).index).toBe(1);
    expect(showcaseState(totalSeconds(SHOTS) + 1).index).toBe(0);
    expect(showcaseState(-1).index).toBe(SHOTS.length - 1);
  });

  it('reports the progress through the current shot', () => {
    const first = SHOTS[0] as Shot;
    expect(showcaseState(first.seconds / 4).progress).toBeCloseTo(0.25);
  });

  it('keeps the camera at the shot distance and looks at the centre in wide shots', () => {
    const wide = SHOTS.find((s) => s.aim === 0) as Shot;
    const pose = poseAt(wide, 0.5, 50);
    expect(Math.hypot(...pose.position)).toBeCloseTo(wide.distance * 50);
    expect(pose.target).toEqual([0, 0, 0]);
  });

  it('looks at the surface in close shots', () => {
    const close = SHOTS.find((s) => s.aim === 1) as Shot;
    const pose = poseAt(close, 0, 40);
    expect(Math.hypot(...pose.target)).toBeCloseTo(40);
  });
});
