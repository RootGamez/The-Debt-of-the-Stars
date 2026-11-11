import { describe, expect, it } from 'vitest';
import { loadingFraction, remainingDisplay } from '../../src/ui/loadingSteps';

describe('loadingFraction', () => {
  it('starts with a sliver of the bar so the screen never looks stuck at zero', () => {
    expect(loadingFraction({ kind: 'start' })).toBeGreaterThan(0);
    expect(loadingFraction({ kind: 'start' })).toBeLessThan(0.1);
  });

  it('fills most of the bar while the worlds are built, one by one', () => {
    const none = loadingFraction({ kind: 'worlds', built: 0, total: 4 });
    const half = loadingFraction({ kind: 'worlds', built: 2, total: 4 });
    const all = loadingFraction({ kind: 'worlds', built: 4, total: 4 });
    expect(none).toBe(loadingFraction({ kind: 'start' }));
    expect(half).toBeGreaterThan(none);
    expect(all).toBeGreaterThan(half);
    expect(all).toBeCloseTo(0.55);
  });

  it('never goes backwards from worlds to light to ready', () => {
    const worlds = loadingFraction({ kind: 'worlds', built: 7, total: 7 });
    const lightStart = loadingFraction({ kind: 'light', done: 0, total: 20 });
    const lightHalf = loadingFraction({ kind: 'light', done: 10, total: 20 });
    const lightEnd = loadingFraction({ kind: 'light', done: 20, total: 20 });
    expect(lightStart).toBe(worlds);
    expect(lightHalf).toBeGreaterThan(lightStart);
    expect(lightEnd).toBeGreaterThan(lightHalf);
    expect(lightEnd).toBeLessThan(1);
    expect(loadingFraction({ kind: 'ready' })).toBe(1);
  });

  it('stays inside the bar with odd counts', () => {
    expect(loadingFraction({ kind: 'worlds', built: 9, total: 4 })).toBeCloseTo(0.55);
    expect(loadingFraction({ kind: 'worlds', built: -1, total: 4 })).toBe(
      loadingFraction({ kind: 'start' }),
    );
    expect(loadingFraction({ kind: 'worlds', built: 0, total: 0 })).toBeCloseTo(0.55);
    expect(loadingFraction({ kind: 'light', done: 3, total: 0 })).toBeCloseTo(0.98);
  });
});

describe('remainingDisplay', () => {
  it('waits out the minimum time since the screen appeared', () => {
    expect(remainingDisplay(1000, 1500, 2000)).toBe(1500);
  });

  it('does not wait once the minimum has passed', () => {
    expect(remainingDisplay(1000, 5000, 2000)).toBe(0);
    expect(remainingDisplay(1000, 5000, 0)).toBe(0);
  });
});
