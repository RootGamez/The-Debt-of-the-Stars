import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  gravityAt,
  insideCavity,
  surfaceUp,
  wellForWorld,
  type GravityWell,
} from '../../src/physics/gravity';
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

describe('a hollow world (the Nudo)', () => {
  // Cáscara de 25 m por fuera y cavidad de 21 m por dentro.
  const nudo: GravityWell = {
    center: new Vector3(),
    radius: 25,
    strength: 3,
    range: 50,
    innerRadius: 21,
  };

  it('pushes outward, onto its inner face, inside the cavity', () => {
    const g = gravityAt(new Vector3(0, -21, 0), [nudo]);

    expect(g.y).toBeCloseTo(-3);
    expect(gravityAt(new Vector3(21, 0, 0), [nudo]).x).toBeCloseTo(3);
  });

  it('keeps full strength a few metres above the inner face (a jump comes back down)', () => {
    expect(gravityAt(new Vector3(0, 0, 15), [nudo]).length()).toBeCloseTo(3);
  });

  it('fades toward the middle of the cavity and is zero at the very center', () => {
    const near = gravityAt(new Vector3(0, 2, 0), [nudo]).length();

    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(3);
    expect(gravityAt(new Vector3(), [nudo]).toArray()).toEqual([0, 0, 0]);
  });

  it('still pulls inward, like any world, on its outer shell', () => {
    const g = gravityAt(new Vector3(0, 25, 0), [nudo]);

    expect(g.y).toBeCloseTo(-3);
    expect(gravityAt(new Vector3(0, 25 + 25, 0), [nudo]).y).toBeCloseTo(-1.5);
  });

  it('tells which way is up: toward the center inside, away from it outside', () => {
    expect(surfaceUp(new Vector3(0, -21, 0), nudo).y).toBeCloseTo(1);
    expect(surfaceUp(new Vector3(0, 25, 0), nudo).y).toBeCloseTo(1);
    expect(surfaceUp(new Vector3(0, 25, 0), umbral).y).toBeCloseTo(1);
    expect(surfaceUp(new Vector3(21, 0, 0), nudo).x).toBeCloseTo(-1);
  });

  it('knows whether a point is inside the cavity', () => {
    expect(insideCavity(new Vector3(0, -20, 0), nudo)).toBe(true);
    expect(insideCavity(new Vector3(0, -25.5, 0), nudo)).toBe(false);
    expect(insideCavity(new Vector3(0, -20, 0), umbral)).toBe(false);
  });
});

describe('a hollow world with cratered crust (Cicatriz)', () => {
  // Cáscara de 80 m por fuera y cavidad de 60 m: la gravedad cambia de sentido justo bajo la cara interior.
  const cicatriz: GravityWell = {
    center: new Vector3(),
    radius: 80,
    strength: 12,
    range: 160,
    innerRadius: 60,
    cavityLimit: 61,
  };

  it('still pulls toward the center at the bottom of a crater bowl, deep in the crust', () => {
    expect(gravityAt(new Vector3(0, 64, 0), [cicatriz]).y).toBeCloseTo(-12);
    expect(insideCavity(new Vector3(0, 64, 0), cicatriz)).toBe(false);
  });

  it('pushes outward onto the inner face below its limit', () => {
    expect(gravityAt(new Vector3(0, 59.5, 0), [cicatriz]).y).toBeCloseTo(12);
    expect(insideCavity(new Vector3(0, 60.5, 0), cicatriz)).toBe(true);
    expect(surfaceUp(new Vector3(0, 60, 0), cicatriz).y).toBeCloseTo(-1);
  });
});

describe('wellForWorld', () => {
  it('passes the cavity of a hollow world', () => {
    const well = wellForWorld({
      id: 'laboratorio',
      radius: 25,
      gravity: 0.3,
      clockRate: 0.2,
      innerRadius: 21,
    });

    expect(well.innerRadius).toBe(21);
  });

  it('passes where the gravity of a hollow world turns around', () => {
    const well = wellForWorld({
      id: 'cicatriz',
      radius: 80,
      gravity: 1.2,
      clockRate: 0.6,
      innerRadius: 60,
      cavityLimit: 61,
    });

    expect(well.cavityLimit).toBe(61);
  });

  it('scales the base gravity by the world gravity and reaches two radii above the surface', () => {
    const well = wellForWorld({ id: 'archivo', radius: 70, gravity: 1.5, clockRate: 0.8 });

    expect(well.strength).toBeCloseTo(G_BASE * 1.5);
    expect(well.radius).toBe(70);
    expect(well.range).toBe(140);
    expect(well.center.toArray()).toEqual([0, 0, 0]);
  });
});
