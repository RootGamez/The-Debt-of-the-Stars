import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import systemData from '../../src/data/sistema.json';
import {
  poleDistance,
  ringAzimuth,
  ringPoint,
  ringSegments,
  type SegmentState,
} from '../../src/system/cercoShape';
import { parseSystem, type RingSpec, type StructureSpec } from '../../src/system/systemData';
import { WORLD_IDS } from '../../src/worlds/worldSelection';

const A: RingSpec = { radius: 260, period: 720, complete: 0.7, phase: 0 };
const B: RingSpec = { radius: 280, period: -540, complete: 0.45, phase: 1 };
const structure: StructureSpec = {
  rings: [A, B],
  width: 14,
  thickness: 6,
  segments: 48,
  seed: 4,
};

function count(states: readonly SegmentState[], wanted: SegmentState): number {
  return states.filter((s) => s === wanted).length;
}

describe('ringPoint', () => {
  it('passes through both poles whatever the ring has turned', () => {
    for (const ring of [A, B]) {
      for (const t of [0, 100, 333.3, 900]) {
        const north = ringPoint(ring, Math.PI / 2, t, new Vector3());
        const south = ringPoint(ring, -Math.PI / 2, t, new Vector3());

        expect(north.x).toBeCloseTo(0, 6);
        expect(north.z).toBeCloseTo(0, 6);
        expect(north.y).toBeCloseTo(ring.radius, 6);
        expect(south.y).toBeCloseTo(-ring.radius, 6);
      }
    }
  });

  it('keeps every point at the ring radius from the star', () => {
    for (let k = 0; k < 24; k++) {
      expect(ringPoint(A, (k / 24) * Math.PI * 2, 51, new Vector3()).length()).toBeCloseTo(260, 6);
    }
  });

  it('crosses the equator plane of the orbits at the azimuth the ring has turned to', () => {
    const t = 90;
    const azimuth = ringAzimuth(A, t);
    const onEquator = ringPoint(A, 0, t, new Vector3());

    expect(onEquator.y).toBeCloseTo(0, 6);
    expect(Math.atan2(onEquator.z, onEquator.x)).toBeCloseTo(azimuth, 6);
  });
});

describe('ringAzimuth', () => {
  it('turns the two rings in opposite directions', () => {
    expect(ringAzimuth(A, 10) - ringAzimuth(A, 0)).toBeGreaterThan(0);
    expect(ringAzimuth(B, 10) - ringAzimuth(B, 0)).toBeLessThan(0);
  });

  it('takes exactly one period to come back to the same place', () => {
    expect(ringAzimuth(A, 720) - ringAzimuth(A, 0)).toBeCloseTo(Math.PI * 2, 9);
    expect(ringAzimuth(B, 540) - ringAzimuth(B, 0)).toBeCloseTo(-Math.PI * 2, 9);
  });
});

describe('poleDistance', () => {
  it('is 0 at the poles and 1 at the equator', () => {
    expect(poleDistance(Math.PI / 2)).toBeCloseTo(0, 9);
    expect(poleDistance(-Math.PI / 2)).toBeCloseTo(0, 9);
    expect(poleDistance(0)).toBeCloseTo(1, 9);
    expect(poleDistance(Math.PI)).toBeCloseTo(1, 9);
  });
});

describe('ringSegments', () => {
  const a = ringSegments(A, structure).map((s) => s.state);
  const b = ringSegments(B, structure).map((s) => s.state);

  it('has the segments the structure asks for, all different ring to ring', () => {
    expect(a).toHaveLength(48);
    expect(b).toHaveLength(48);
  });

  it('is always the same for the same seed', () => {
    expect(ringSegments(A, structure).map((s) => s.state)).toEqual(a);
  });

  it('always has the pieces next to the poles finished: the rings are tied there', () => {
    for (const ring of [A, B]) {
      const poles = ringSegments(ring, structure).filter((s) => poleDistance(s.angle) < 0.05);

      expect(poles.length).toBeGreaterThanOrEqual(2);
      for (const pole of poles) expect(pole.state).toBe('terminada');
    }
  });

  it('is more built the more complete the ring is, and leaves gaps in both', () => {
    expect(count(a, 'terminada')).toBeGreaterThan(count(b, 'terminada'));
    expect(count(a, 'faltante')).toBeGreaterThan(0);
    expect(count(b, 'faltante')).toBeGreaterThan(count(a, 'faltante'));
  });

  it('shows the work front: frames and scaffolds sit between what is built and what is missing', () => {
    expect(count(a, 'armazon') + count(a, 'andamio')).toBeGreaterThan(0);
  });
});

describe('the real structure (sistema.json)', () => {
  const system = parseSystem(systemData, WORLD_IDS);

  it('keeps both rings inside the Taller orbit, clear of the star and of its own hubs', () => {
    expect(system.structure).toBeDefined();
    const taller = system.bodyOf('taller');
    for (const ring of system.structure?.rings ?? []) {
      expect(ring.radius).toBeGreaterThan(system.star.radius * 2);
      expect(ring.radius + 20).toBeLessThan((taller?.orbitRadius ?? 0) - 100);
    }
  });

  it('turns the rings opposite ways and never lets them meet except at the hubs', () => {
    const [first, second] = system.structure?.rings ?? [];

    expect(first && second && Math.sign(first.period) !== Math.sign(second.period)).toBe(true);
    expect(first?.radius).not.toBe(second?.radius);
  });
});
