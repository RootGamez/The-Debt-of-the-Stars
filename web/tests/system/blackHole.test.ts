import { describe, expect, it } from 'vitest';
import { BLACK_HOLE } from '../../src/data/blackHole';
import {
  blackHoleRadius,
  diskRadii,
  holeEinstein,
  photonRingRadius,
} from '../../src/system/blackHole';

describe('the size of the black hole', () => {
  it('does not exist before 13:30', () => {
    expect(blackHoleRadius(0)).toBe(0);
    expect(blackHoleRadius(BLACK_HOLE.born - 1)).toBe(0);
  });

  it('is born small at 13:30 and grows', () => {
    expect(blackHoleRadius(BLACK_HOLE.born + 1)).toBeGreaterThan(0);
    expect(blackHoleRadius(BLACK_HOLE.born + 1)).toBeLessThan(30);
    expect(blackHoleRadius(860)).toBeGreaterThan(blackHoleRadius(830));
  });

  it('grows fast at first and calms down at the end (the debt of the network runs out)', () => {
    const first = blackHoleRadius(BLACK_HOLE.born + 10) - blackHoleRadius(BLACK_HOLE.born);
    const last = blackHoleRadius(BLACK_HOLE.end) - blackHoleRadius(BLACK_HOLE.end - 10);

    expect(first).toBeGreaterThan(last * 3);
  });

  it('has swallowed Cicatriz by the end of its absorption window (13:45)', () => {
    expect(blackHoleRadius(825)).toBeGreaterThan(2 * 80);
  });

  it('stops at its full size and survives nonsense', () => {
    expect(blackHoleRadius(BLACK_HOLE.end)).toBeCloseTo(BLACK_HOLE.maxRadius);
    expect(blackHoleRadius(5000)).toBeCloseTo(BLACK_HOLE.maxRadius);
    expect(blackHoleRadius(Number.NaN)).toBe(0);
  });
});

describe('how the black hole bends the stars', () => {
  it('bends nothing before it is born', () => {
    expect(holeEinstein(0, 2000)).toBe(0);
  });

  it('bends more the bigger it is and the closer you are', () => {
    expect(holeEinstein(300, 2000)).toBeGreaterThan(holeEinstein(100, 2000));
    expect(holeEinstein(300, 1000)).toBeGreaterThan(holeEinstein(300, 2000));
  });

  it('bends the stars just outside its ring of light', () => {
    const ringAngle = Math.atan(photonRingRadius(300) / 2000);

    expect(holeEinstein(300, 2000)).toBeGreaterThan(ringAngle);
  });

  it('stays bounded up close and survives nonsense', () => {
    expect(holeEinstein(600, 1)).toBeLessThanOrEqual(Math.PI / 3);
    expect(holeEinstein(Number.NaN, 100)).toBe(0);
  });
});

describe('what surrounds the horizon', () => {
  it('has the ring of light at one and a half times the horizon', () => {
    expect(photonRingRadius(100)).toBeCloseTo(150);
  });

  it('has the glowing disk outside the ring of light', () => {
    const disk = diskRadii(100);

    expect(disk.inner).toBeGreaterThan(photonRingRadius(100));
    expect(disk.outer).toBeGreaterThan(disk.inner);
  });
});
