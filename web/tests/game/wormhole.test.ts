import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  lensRadius,
  ringRadius,
  viewStretch,
  WORMHOLE_SEQUENCE,
  wormholeCenter,
  wormholeProgress,
} from '../../src/game/wormhole';

describe('the wormhole opening by the fragment of the Moon', () => {
  it('takes a few seconds, from nothing to all', () => {
    expect(wormholeProgress(0)).toBe(0);
    expect(wormholeProgress(WORMHOLE_SEQUENCE.seconds / 2)).toBeCloseTo(0.5);
    expect(wormholeProgress(WORMHOLE_SEQUENCE.seconds * 2)).toBe(1);
    expect(wormholeProgress(Number.NaN)).toBe(0);
  });

  it('opens a ring of light that grows fast and then settles', () => {
    expect(ringRadius(0)).toBe(0);
    expect(ringRadius(0.3)).toBeGreaterThan(WORMHOLE_SEQUENCE.ringRadius * 0.5);
    expect(ringRadius(1)).toBe(WORMHOLE_SEQUENCE.ringRadius);
  });

  it('bends the stars only once the ring shows, and most at the end', () => {
    expect(lensRadius(0.1)).toBe(0);
    expect(lensRadius(0.6)).toBeGreaterThan(0);
    expect(lensRadius(1)).toBe(WORMHOLE_SEQUENCE.lensRadius);
  });

  it('stretches the view last of all', () => {
    expect(viewStretch(0.3)).toBe(0);
    expect(viewStretch(0.7)).toBeGreaterThan(0);
    expect(viewStretch(1)).toBeCloseTo(WORMHOLE_SEQUENCE.stretch);
  });

  it('opens above the fragment and just beyond it, as seen by whoever opened it', () => {
    const fragment = new Vector3(0, 10, 0);
    const center = new Vector3(0, 0, 0);
    // Quien mira está a 5 m, un poco más alto: solo cuenta la dirección en horizontal.
    const at = wormholeCenter(fragment, center, new Vector3(0, 11.5, 5));
    expect(at.x).toBeCloseTo(0);
    expect(at.y).toBeCloseTo(10 + WORMHOLE_SEQUENCE.rise);
    expect(at.z).toBeCloseTo(-WORMHOLE_SEQUENCE.behind);

    const overhead = wormholeCenter(fragment, center, new Vector3(0, 13, 0));
    expect(overhead.toArray()).toEqual([0, 10 + WORMHOLE_SEQUENCE.rise, 0]);
  });
});
