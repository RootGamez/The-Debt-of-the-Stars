import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BLACK_HOLE } from '../../src/data/blackHole';
import { approachPoint, createHorizon } from '../../src/game/horizon';

const GROWTH = { born: 810, end: 900, maxRadius: 600 };
const CENTER = new Vector3(0, 50, 0);
const R = BLACK_HOLE.stableRadius;

function horizonAt(t: number, stable = true) {
  const horizon = createHorizon({ world: 'cicatriz', center: CENTER, growth: GROWTH });
  horizon.update(t, stable);
  return horizon;
}

function above(distance: number): Vector3 {
  return CENTER.clone().add(new Vector3(0, distance, 0));
}

describe('the stable horizon in play', () => {
  it('is only there once the Counterweight holds the hole and the hole is born', () => {
    expect(horizonAt(800).radius).toBe(0);
    expect(horizonAt(880, false).radius).toBe(0);
    expect(horizonAt(880).radius).toBe(R);
    expect(createHorizon({ world: 'cicatriz', center: undefined, growth: GROWTH }).radius).toBe(0);
  });

  it('slows time near it, only in its own world', () => {
    const horizon = horizonAt(880);

    expect(horizon.rate('cicatriz', above(2 * R))).toBeCloseTo(Math.SQRT1_2);
    expect(horizon.rate('umbral', above(2 * R))).toBe(1);
    expect(horizon.rate(undefined, above(2 * R))).toBe(1);
    expect(horizonAt(880, false).rate('cicatriz', above(2 * R))).toBe(1);
  });

  it('pulls the ship toward its centre when close', () => {
    const horizon = horizonAt(880);
    const pull = new Vector3();

    horizon.pull('cicatriz', above(2 * R), pull);
    expect(pull.y).toBeLessThan(0); // hacia el centro, que está debajo
    expect(pull.x).toBe(0);

    const far = new Vector3();
    horizon.pull('cicatriz', above(10 * R), far);
    expect(far.length()).toBe(0);
  });

  it('is crossed once you are inside it', () => {
    const horizon = horizonAt(880);

    expect(horizon.crossed('cicatriz', above(R + 0.5))).toBe(false);
    expect(horizon.crossed('cicatriz', above(R - 0.5))).toBe(true);
    expect(horizon.crossed('taller', above(0))).toBe(false);
    expect(horizon.closeness('cicatriz', above(R))).toBe(1);
  });
});

describe('the debug approach to the horizon', () => {
  it('stays level with the centre, out along the front of the machine', () => {
    const front = CENTER.clone().add(new Vector3(0, -8, 6)); // delante y abajo
    const point = approachPoint(CENTER, front, 12);

    expect(point.distanceTo(CENTER)).toBeCloseTo(12);
    expect(point.y).toBeCloseTo(CENTER.y); // en horizontal: arriba es +y aquí
    expect(point.z).toBeCloseTo(12);
  });
});
