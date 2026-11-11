import { describe, expect, it, vi } from 'vitest';
import { createVoiceLimiter, pickVariant, spread } from '../../src/audio/sfxLogic';
/** El elemento `index` de una lista de prueba (falla con claridad si no está). */ function at<T>(
  list: readonly T[],
  index: number,
): T {
  const item = list[index];
  if (item === undefined) throw new Error(`No hay elemento ${index}`);
  return item;
}

describe('pickVariant', () => {
  it('returns the only variant when there is one', () => {
    expect(pickVariant(1, 0, () => 0.9)).toBe(0);
  });

  it('never repeats the previous variant', () => {
    for (let count = 2; count <= 6; count++) {
      for (let last = 0; last < count; last++) {
        for (const random of [0, 0.2, 0.5, 0.8, 0.999999]) {
          const picked = pickVariant(count, last, () => random);
          expect(picked).not.toBe(last);
          expect(picked).toBeGreaterThanOrEqual(0);
          expect(picked).toBeLessThan(count);
        }
      }
    }
  });

  it('can pick any variant the first time', () => {
    expect(pickVariant(4, undefined, () => 0)).toBe(0);
    expect(pickVariant(4, undefined, () => 0.999999)).toBe(3);
  });

  it('is safe with no variants', () => {
    expect(pickVariant(0, undefined, () => 0.5)).toBe(-1);
  });
});

describe('spread', () => {
  it('keeps the base value when there is no variation', () => {
    expect(spread(2, 0, () => 0.9)).toBe(2);
  });

  it('varies the value up and down by the given fraction', () => {
    expect(spread(1, 0.1, () => 0)).toBeCloseTo(0.9);
    expect(spread(1, 0.1, () => 1)).toBeCloseTo(1.1);
    expect(spread(1, 0.1, () => 0.5)).toBeCloseTo(1);
  });
});

describe('createVoiceLimiter', () => {
  it('lets voices through until the category is full', () => {
    const limiter = createVoiceLimiter({ foley: 2 }, 4);
    const stops = [vi.fn(), vi.fn()];

    limiter.add('foley', at(stops, 0));
    limiter.add('foley', at(stops, 1));

    expect(stops[0]).not.toHaveBeenCalled();
    expect(limiter.count('foley')).toBe(2);
  });

  it('stops the oldest voice of a full category', () => {
    const limiter = createVoiceLimiter({ foley: 2 }, 4);
    const stops = [vi.fn(), vi.fn(), vi.fn()];

    for (const stop of stops) limiter.add('foley', stop);

    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(stops[1]).not.toHaveBeenCalled();
    expect(limiter.count('foley')).toBe(2);
  });

  it('counts each category apart and uses the fallback limit for unknown ones', () => {
    const limiter = createVoiceLimiter({ ship: 1 }, 2);
    const stop = vi.fn();

    limiter.add('ship', vi.fn());
    limiter.add('other', stop);
    limiter.add('other', vi.fn());
    limiter.add('other', vi.fn());

    expect(limiter.count('ship')).toBe(1);
    expect(limiter.count('other')).toBe(2);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('frees the slot when a voice ends by itself', () => {
    const limiter = createVoiceLimiter({ foley: 1 }, 4);
    const first = vi.fn();
    const release = limiter.add('foley', first);

    release();
    limiter.add('foley', vi.fn());

    expect(first).not.toHaveBeenCalled();
    expect(limiter.count('foley')).toBe(1);
  });

  it('ignores releasing the same voice twice', () => {
    const limiter = createVoiceLimiter({ foley: 2 }, 4);
    const release = limiter.add('foley', vi.fn());

    release();
    release();

    expect(limiter.count('foley')).toBe(0);
  });
});
