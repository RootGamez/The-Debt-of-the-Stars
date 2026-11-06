import { describe, expect, it } from 'vitest';
import { BEACON, beaconOn } from '../../src/game/shipCabin';

describe('the position lights of the Albatross II', () => {
  it('flash twice and then stay dark until the next period', () => {
    expect(beaconOn(0.01)).toBe(true);
    expect(beaconOn(BEACON.flash + 0.02)).toBe(false);
    expect(beaconOn(BEACON.gap + 0.01)).toBe(true);
    expect(beaconOn(BEACON.gap + BEACON.flash + 0.05)).toBe(false);
    expect(beaconOn(BEACON.period - 0.1)).toBe(false);
  });

  it('repeat every period', () => {
    expect(beaconOn(BEACON.period * 3 + 0.01)).toBe(true);
  });

  it('stay dark with a broken clock', () => {
    expect(beaconOn(Number.NaN)).toBe(false);
  });
});
