import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { absorptionWindow, parseChronology } from '../../src/core/timeline';
import { BLACK_HOLE } from '../../src/data/blackHole';
import rawChronology from '../../src/data/cronologia.json';
import { DAMAGE_FROM } from '../../src/physics/tides';
import {
  absorptionProgress,
  anchorWeight,
  apparentDistance,
  bodyFall,
  debrisTravel,
  finalApproach,
  finalLight,
  frozenRate,
  holdsHole,
  holeTide,
  horizonTide,
  implodedPoint,
  starAbsorptionWindow,
  skyFill,
  stretchedPoint,
} from '../../src/system/absorption';

const CENTER = new Vector3(0, 0, 0);
const HOLE = new Vector3(1000, 0, 0);
const RADIUS = 50;

function stretched(point: Vector3, progress: number): Vector3 {
  return stretchedPoint(point, CENTER, HOLE, RADIUS, progress, new Vector3());
}

describe('how far along a world is in being swallowed', () => {
  it('is 0 before its window, grows during it and is 1 after', () => {
    expect(absorptionProgress([810, 825], 800)).toBe(0);
    expect(absorptionProgress([810, 825], 817.5)).toBeCloseTo(0.5);
    expect(absorptionProgress([810, 825], 900)).toBe(1);
  });

  it('is 0 for a world that is never swallowed and survives a window with no length', () => {
    expect(absorptionProgress(undefined, 850)).toBe(0);
    expect(absorptionProgress([820, 820], 819)).toBe(0);
    expect(absorptionProgress([820, 820], 820)).toBe(1);
  });
});

describe('how a world stretches toward the black hole', () => {
  it('does not move before its window', () => {
    const point = new Vector3(0, RADIUS, 0);

    expect(stretched(point, 0).distanceTo(point)).toBe(0);
  });

  it('pulls the side facing the hole much more than the far side', () => {
    const near = new Vector3(RADIUS, 0, 0);
    const far = new Vector3(-RADIUS, 0, 0);

    const nearShift = stretched(near, 0.4).x - near.x;
    const farShift = far.x - stretched(far, 0.4).x;

    expect(nearShift).toBeGreaterThan(0);
    expect(nearShift).toBeGreaterThan(farShift * 2);
  });

  it('squeezes the sides toward the line to the hole', () => {
    const side = new Vector3(0, RADIUS, 0);

    expect(Math.abs(stretched(side, 0.4).y)).toBeLessThan(RADIUS);
  });

  it('has fallen into the hole by the end of its window, the near side first', () => {
    const near = new Vector3(RADIUS, 0, 0);
    const far = new Vector3(-RADIUS, 0, 0);

    expect(stretched(near, 1).distanceTo(HOLE)).toBeCloseTo(0);
    expect(stretched(far, 1).distanceTo(HOLE)).toBeCloseTo(0);
    const nearLeft = stretched(near, 0.8).distanceTo(HOLE) / near.distanceTo(HOLE);
    const farLeft = stretched(far, 0.8).distanceTo(HOLE) / far.distanceTo(HOLE);
    expect(nearLeft).toBeLessThan(farLeft);
  });

  it('survives a hole at the very centre and nonsense', () => {
    const point = new Vector3(0, RADIUS, 0);

    expect(stretchedPoint(point, CENTER, CENTER, RADIUS, 0.5, new Vector3())).toEqual(point);
    expect(stretchedPoint(point, CENTER, HOLE, 0, 0.5, new Vector3())).toEqual(point);
    expect(stretched(point, Number.NaN)).toEqual(point);
  });
});

describe('the ground under your feet', () => {
  it('stays put close to you and stretches far from you', () => {
    expect(anchorWeight(2)).toBe(0);
    expect(anchorWeight(25)).toBeGreaterThan(0);
    expect(anchorWeight(25)).toBeLessThan(1);
    expect(anchorWeight(200)).toBe(1);
  });
});

describe('the tide of the black hole on a world being swallowed', () => {
  it('is not there before the window', () => {
    expect(holeTide(0)).toBe(0);
  });

  it('starts hurting early and is strongest at the end', () => {
    expect(holeTide(0.3)).toBeGreaterThan(DAMAGE_FROM);
    expect(holeTide(1)).toBeGreaterThan(holeTide(0.5));
    expect(holeTide(Number.NaN)).toBe(0);
  });

  it('is felt in the palco but never hurts there, so the end can be watched', () => {
    expect(holeTide(0.3, true)).toBeGreaterThan(0);
    expect(holeTide(1, true)).toBeLessThanOrEqual(DAMAGE_FROM);
    expect(holeTide(0, true)).toBe(0);
  });

  it('near the stable horizon it grows as you get close, but never hurts (Phase 10)', () => {
    expect(horizonTide(0)).toBe(0);
    expect(horizonTide(0.5)).toBeGreaterThan(0);
    expect(horizonTide(0.9)).toBeGreaterThan(horizonTide(0.5));
    expect(horizonTide(1)).toBeLessThanOrEqual(DAMAGE_FROM);
    expect(horizonTide(Number.NaN)).toBe(0);
  });

  it('the palco is the last world to fall: its window ends with the cycle', () => {
    const chronology = parseChronology(rawChronology);
    const palco = absorptionWindow(chronology, BLACK_HOLE.palco);
    const ends = Object.keys(chronology.absorption).map(
      (world) => absorptionWindow(chronology, world)?.[1] ?? 0,
    );

    expect(palco?.[1]).toBe(chronology.duration);
    expect(Math.max(...ends)).toBe(palco?.[1]);
  });
});

describe('the end seen from the world that falls', () => {
  const R = 600;

  it('you fall with your world only in the last part of its window', () => {
    expect(finalApproach(0)).toBe(0);
    expect(finalApproach(0.5)).toBe(0);
    expect(finalApproach(0.8)).toBeGreaterThan(0);
    expect(finalApproach(1)).toBe(1);
    expect(finalApproach(Number.NaN)).toBe(0);
  });

  it('the hole is drawn closer and closer until its horizon fills the sky', () => {
    const far = 2500;

    expect(apparentDistance(far, R, 0)).toBe(far);
    expect(apparentDistance(far, R, 0.5)).toBeLessThan(far);
    expect(apparentDistance(far, R, 0.5)).toBeGreaterThan(apparentDistance(far, R, 0.9));
    const end = apparentDistance(far, R, 1);
    expect(end).toBeGreaterThan(R); // nunca dentro: desde dentro no se ve el horizonte
    expect(Math.asin(skyFill(R, end))).toBeGreaterThan((70 * Math.PI) / 180);
  });

  it('leaves the hole where it is when you are already inside it or nearly so', () => {
    expect(apparentDistance(300, R, 1)).toBe(300);
    expect(apparentDistance(R * 1.01, R, 1)).toBe(R * 1.01);
    expect(apparentDistance(Number.NaN, R, 1)).toBeNaN();
  });

  it('measures how much of the sky the hole fills, from nothing to all of it', () => {
    expect(skyFill(0, 1000)).toBe(0);
    expect(skyFill(R, 2400)).toBeCloseTo(0.25);
    expect(skyFill(R, 300)).toBe(1);
    expect(skyFill(R, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('the lights go out at the very end, but not quite', () => {
    expect(finalLight(0)).toBe(1);
    expect(finalLight(0.7)).toBe(1);
    expect(finalLight(0.9)).toBeLessThan(1);
    expect(finalLight(1)).toBeGreaterThan(0);
    expect(finalLight(1)).toBeLessThan(0.1);
  });
});

describe('a world being swallowed, seen from outside', () => {
  it('slows down until it almost stops, but never quite', () => {
    expect(frozenRate(0)).toBe(1);
    expect(frozenRate(0.5)).toBeLessThan(1);
    expect(frozenRate(1)).toBeGreaterThan(0);
    expect(frozenRate(1)).toBeLessThan(0.1);
  });

  it('loses pieces that speed up as they fall', () => {
    expect(debrisTravel(0)).toBe(0);
    expect(debrisTravel(1)).toBe(1);
    expect(debrisTravel(0.5)).toBeLessThan(0.5);
    expect(debrisTravel(2)).toBe(1);
  });
});

describe('a world that holds the hole inside (Cicatriz)', () => {
  const inside = new Vector3(2, 0, 0);

  it('is told apart from a world with the hole at its side', () => {
    expect(holdsHole(2, 80)).toBe(true);
    expect(holdsHole(900, 80)).toBe(false);
    expect(holdsHole(0, 80)).toBe(true);
  });

  it('stays still before its window and sinks completely into the hole at the end', () => {
    const rim = new Vector3(80, 10, -5);
    expect(implodedPoint(rim, inside, 80, 0, new Vector3()).distanceTo(rim)).toBeCloseTo(0);
    expect(implodedPoint(rim, inside, 80, 1, new Vector3()).distanceTo(inside)).toBeCloseTo(0);
    const far = new Vector3(300, 0, 0);
    expect(implodedPoint(far, inside, 80, 0.5, new Vector3()).distanceTo(inside)).toBeCloseTo(0);
  });

  it('pulls every point closer as the window advances, the center before the rim', () => {
    const rim = new Vector3(80, 0, 0);
    const middle = new Vector3(20, 0, 0);
    const before = implodedPoint(rim, inside, 80, 0.2, new Vector3()).distanceTo(inside);
    const after = implodedPoint(rim, inside, 80, 0.4, new Vector3()).distanceTo(inside);
    expect(after).toBeLessThan(before);
    const ratio = (point: Vector3): number =>
      implodedPoint(point, inside, 80, 0.25, new Vector3()).distanceTo(inside) /
      point.distanceTo(inside);
    expect(ratio(middle)).toBeLessThan(ratio(rim));
  });
});

describe('the star falling into the hole', () => {
  it('falls inside the cycle, after Cicatriz and before the last world, and scales with the cycle', () => {
    const [start, end] = starAbsorptionWindow(900);
    expect(start).toBeGreaterThan(
      absorptionWindow(parseChronology(rawChronology), 'cicatriz')?.[1] ?? 0,
    );
    expect(end).toBeLessThan(900);
    const short = starAbsorptionWindow(90);
    expect(short[0]).toBeCloseTo(start / 10);
    expect(short[1]).toBeCloseTo(end / 10);
  });

  it('starts whole and ends tiny, stretched and moved to the hole', () => {
    expect(bodyFall(0)).toEqual({ along: 1, across: 1, fall: 0, size: 1 });
    const end = bodyFall(1);
    expect(end.fall).toBeCloseTo(1);
    expect(end.size).toBeLessThan(0.2);
    expect(end.along).toBeGreaterThan(end.across);
  });
});
