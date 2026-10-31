import { describe, expect, it } from 'vitest';
import { ringDashOffset, ringFraction, ringPoint } from '../../src/core/clockRings';

const LOOP = 900;

describe('the light rings of the double clock', () => {
  it('fill from empty at 0:00 to half at 7:30 and full at 15:00', () => {
    expect(ringFraction(0, LOOP)).toBe(0);
    expect(ringFraction(450, LOOP)).toBe(0.5);
    expect(ringFraction(900, LOOP)).toBe(1);
  });

  it('never go below empty or past full', () => {
    expect(ringFraction(-5, LOOP)).toBe(0);
    expect(ringFraction(1200, LOOP)).toBe(1);
    expect(ringFraction(Number.NaN, LOOP)).toBe(0);
    expect(ringFraction(10, 0)).toBe(0);
  });

  it('hide the part of the stroke that has not been lived yet', () => {
    const circumference = 2 * Math.PI * 40;

    expect(ringDashOffset(0, LOOP, 40)).toBeCloseTo(circumference);
    expect(ringDashOffset(450, LOOP, 40)).toBeCloseTo(circumference / 2);
    expect(ringDashOffset(900, LOOP, 40)).toBeCloseTo(0);
  });

  it('place the marks clockwise from the top', () => {
    const top = ringPoint(0, LOOP, 40);
    const quarter = ringPoint(225, LOOP, 40);
    const half = ringPoint(450, LOOP, 40);

    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-40);
    expect(quarter.x).toBeCloseTo(40);
    expect(quarter.y).toBeCloseTo(0);
    expect(half.y).toBeCloseTo(40);
  });
});
