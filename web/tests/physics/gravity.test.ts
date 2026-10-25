import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { gravityAt, wellForWorld, type GravityWell } from '../../src/physics/gravity';
import { G_BASE } from '../../src/data/movement';

const umbral: GravityWell = { center: new Vector3(), radius: 90, strength: 9.8, range: 180 };

describe('gravityAt', () => {
  it('points to the planet center with full strength on the surface', () => {
    const g = gravityAt(new Vector3(0, 90, 0), [umbral]);

    expect(g.x).toBeCloseTo(0);
    expect(g.y).toBeCloseTo(-9.8);
    expect(g.z).toBeCloseTo(0);
  });

  it('keeps full strength below the surface', () => {
    expect(gravityAt(new Vector3(45, 0, 0), [umbral]).length()).toBeCloseTo(9.8);
  });

  it('fades linearly above the surface and vanishes at the end of the range', () => {
    const halfway = gravityAt(new Vector3(0, 0, 90 + 90), [umbral]);
    const edge = gravityAt(new Vector3(0, 0, 90 + 180), [umbral]);
    const beyond = gravityAt(new Vector3(0, 0, 1000), [umbral]);

    expect(halfway.length()).toBeCloseTo(4.9);
    expect(edge.length()).toBeCloseTo(0);
    expect(beyond.length()).toBe(0);
  });

  it('returns zero at the exact center instead of NaN', () => {
    const g = gravityAt(new Vector3(), [umbral]);

    expect(g.toArray()).toEqual([0, 0, 0]);
  });

  it('adds the pull of several wells', () => {
    const moon: GravityWell = {
      center: new Vector3(300, 0, 0),
      radius: 30,
      strength: 2,
      range: 60,
    };

    const g = gravityAt(new Vector3(270, 0, 0), [umbral, moon]);

    expect(g.x).toBeCloseTo(2); // fuera del alcance de Umbral (90 + 180 = 270), en la superficie de la luna
  });

  it('writes into the target vector when given and does not touch the position', () => {
    const position = new Vector3(0, 90, 0);
    const target = new Vector3(1, 1, 1);

    const result = gravityAt(position, [umbral], target);

    expect(result).toBe(target);
    expect(position.toArray()).toEqual([0, 90, 0]);
  });
});

describe('wellForWorld', () => {
  it('scales the base gravity by the world gravity and reaches two radii above the surface', () => {
    const well = wellForWorld({ id: 'archivo', radius: 70, gravity: 1.5, clockRate: 0.8 });

    expect(well.strength).toBeCloseTo(G_BASE * 1.5);
    expect(well.radius).toBe(70);
    expect(well.range).toBe(140);
    expect(well.center.toArray()).toEqual([0, 0, 0]);
  });
});
