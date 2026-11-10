import { describe, expect, it } from 'vitest';
import { GATE_WORMHOLE, gateSplit, gateStretch, proximity } from '../../src/game/gateWormhole';

describe('the stable wormholes of the Gates', () => {
  it('do not touch you from afar', () => {
    expect(proximity(GATE_WORMHOLE.range)).toBe(0);
    expect(proximity(GATE_WORMHOLE.range * 3)).toBe(0);
    expect(gateStretch(0)).toBe(0);
    expect(gateSplit(0)).toBe(0);
  });

  it('bend more the closer you get, up to the full effect at the mouth', () => {
    const far = proximity(GATE_WORMHOLE.range * 0.8);
    const near = proximity(GATE_WORMHOLE.range * 0.3);

    expect(far).toBeGreaterThan(0);
    expect(near).toBeGreaterThan(far);
    expect(proximity(GATE_WORMHOLE.near)).toBe(1);
    expect(proximity(0.2)).toBe(1);
  });

  it('stretch the view and split the colors in proportion, never beyond their maximum', () => {
    expect(gateStretch(1)).toBeCloseTo(GATE_WORMHOLE.stretch, 9);
    expect(gateSplit(1)).toBeCloseTo(GATE_WORMHOLE.split, 9);
    expect(gateStretch(0.5)).toBeLessThan(gateStretch(1));
    expect(gateStretch(2)).toBeCloseTo(GATE_WORMHOLE.stretch, 9);
  });

  it('treat a bad distance as far away', () => {
    expect(proximity(Number.NaN)).toBe(0);
    expect(proximity(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
