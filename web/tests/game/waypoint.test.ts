import { describe, expect, it } from 'vitest';
import { distanceLabel, placeWaypoint } from '../../src/game/waypoint';

const TAN = Math.tan((70 * Math.PI) / 360);
const ASPECT = 16 / 9;

describe('the waypoint on the screen', () => {
  it('sits on the middle of the screen when it is straight ahead', () => {
    const p = placeWaypoint({ x: 0, y: 0, z: -10 }, TAN, ASPECT);
    expect(p.onScreen).toBe(true);
    expect(p.x).toBeCloseTo(0.5);
    expect(p.y).toBeCloseTo(0.5);
  });

  it('goes to the right and up when the point is to the right and above', () => {
    const p = placeWaypoint({ x: 3, y: 2, z: -10 }, TAN, ASPECT);
    expect(p.onScreen).toBe(true);
    expect(p.x).toBeGreaterThan(0.5);
    expect(p.y).toBeLessThan(0.5);
  });

  it('turns into an arrow on the right edge when the point is off to the right', () => {
    const p = placeWaypoint({ x: 50, y: 0, z: -10 }, TAN, ASPECT);
    expect(p.onScreen).toBe(false);
    expect(p.x).toBeGreaterThan(0.9);
    expect(p.x).toBeLessThan(1);
    expect(p.angle).toBeCloseTo(Math.PI / 2, 1);
  });

  it('points up when the point is over the top of the screen', () => {
    const p = placeWaypoint({ x: 0, y: 50, z: -10 }, TAN, ASPECT);
    expect(p.onScreen).toBe(false);
    expect(p.y).toBeLessThan(0.1);
    expect(p.angle).toBeCloseTo(0, 1);
  });

  it('points to the side the point is on when it is behind', () => {
    const left = placeWaypoint({ x: -4, y: 1, z: 10 }, TAN, ASPECT);
    expect(left.onScreen).toBe(false);
    expect(left.x).toBeLessThan(0.1);
    expect(left.angle).toBeLessThan(0);
    const right = placeWaypoint({ x: 4, y: 0, z: 10 }, TAN, ASPECT);
    expect(right.x).toBeGreaterThan(0.9);
  });

  it('still picks a side when the point is exactly behind', () => {
    const p = placeWaypoint({ x: 0, y: 0, z: 10 }, TAN, ASPECT);
    expect(p.onScreen).toBe(false);
    expect(Math.abs(p.x - 0.5)).toBeGreaterThan(0.3);
  });

  it('never leaves the screen', () => {
    for (const point of [
      { x: 1e6, y: -3, z: -1 },
      { x: -2, y: 1e5, z: 5 },
      { x: 0, y: 0, z: 0 },
    ]) {
      const p = placeWaypoint(point, TAN, ASPECT);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });
});

describe('the distance label', () => {
  it('says meters up close and kilometers far away', () => {
    expect(distanceLabel(34.4)).toBe('34 m');
    expect(distanceLabel(0)).toBe('0 m');
    expect(distanceLabel(1200)).toBe('1,2 km');
    expect(distanceLabel(Number.NaN)).toBe('');
  });
});
