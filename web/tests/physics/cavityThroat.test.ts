// El paso por los ojos de un mundo hueco: el lado se recuerda (sin subir y bajar en el límite) y, dentro de un
// ojo, la gravedad tira hacia la cara interior junto al borde (se cae de pie al otro lado, sin saltos).
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  holePull,
  hollowWell,
  nextCavitySide,
  THROAT_DEPTH,
  THROAT_RISE,
} from '../../src/physics/cavityThroat';
import type { GravityWell } from '../../src/physics/gravity';
import { gravityAt } from '../../src/physics/gravity';

const well: GravityWell = {
  center: new Vector3(),
  radius: 80,
  strength: 10,
  range: 160,
  innerRadius: 60,
  cavityLimit: 61,
  holes: [{ axis: new Vector3(1, 0, 0), angle: (20 * Math.PI) / 180 }],
};
const solid: GravityWell = { center: new Vector3(), radius: 80, strength: 10, range: 160 };

const at = (r: number): Vector3 => new Vector3(r, 0, 0);

describe('which side of a hollow shell a body is on', () => {
  it('only exists in hollow worlds', () => {
    expect(hollowWell([solid, well])).toBe(well);
    expect(hollowWell([solid])).toBeUndefined();
    expect(nextCavitySide(at(70), solid, undefined)).toBeUndefined();
  });

  it('starts from the distance to the centre', () => {
    expect(nextCavitySide(at(60.5), well, undefined)).toBe('inside');
    expect(nextCavitySide(at(62), well, undefined)).toBe('outside');
  });

  it('follows the ground it stands on, even below the limit (the bottom of a bowl)', () => {
    const facingOut = new Vector3(1, 0.2, 0).normalize();
    expect(nextCavitySide(at(60.4), well, 'inside', facingOut)).toBe('outside');
    expect(nextCavitySide(at(62), well, 'outside', facingOut.clone().negate())).toBe('inside');
  });

  it('keeps its side in the air until the body has really crossed', () => {
    expect(nextCavitySide(at(60.4), well, 'outside')).toBe('outside');
    expect(nextCavitySide(at(60 - THROAT_DEPTH - 0.1), well, 'outside')).toBe('inside');
    expect(nextCavitySide(at(62), well, 'inside')).toBe('inside');
    expect(nextCavitySide(at(61 + THROAT_RISE + 0.1), well, 'inside')).toBe('outside');
  });

  it('decides where the gravity pulls when given', () => {
    const p = new Vector3(0, 60.5, 0); // lejos del ojo
    expect(gravityAt(p, [well], new Vector3(), 'outside').y).toBeLessThan(0);
    expect(gravityAt(p, [well], new Vector3(), 'inside').y).toBeGreaterThan(0);
    expect(gravityAt(p, [well], new Vector3()).y).toBeGreaterThan(0);
  });
});

describe('the gravity inside an eye', () => {
  it('bends towards the inner face beside the rim, on the side the body already is', () => {
    const p = new Vector3(57, 4, 0);
    const pull = gravityAt(p, [well], new Vector3(), 'inside').normalize();
    expect(pull.y).toBeGreaterThan(0.8);
    const target = p.clone().addScaledVector(pull, 25);
    const angle = (target.angleTo(new Vector3(1, 0, 0)) * 180) / Math.PI;
    expect(angle).toBeGreaterThan(20);
  });

  it('still has a direction right on the axis of the eye', () => {
    const pull = holePull(at(57), well, new Vector3());
    expect(pull?.length()).toBeCloseTo(1, 6);
    expect(Math.abs(pull?.x ?? 1)).toBeLessThan(0.5);
  });

  it('is the plain outward pull away from the eyes, deep in the cavity and outside the shell', () => {
    expect(holePull(new Vector3(0, 57, 0), well, new Vector3())).toBeUndefined();
    expect(holePull(at(20), well, new Vector3())).toBeUndefined();
    expect(holePull(at(57), solid, new Vector3())).toBeUndefined();
    const outside = gravityAt(at(62), [well], new Vector3(), 'outside');
    expect(outside.x).toBeLessThan(0);
    expect(Math.abs(outside.y)).toBeLessThan(1e-9);
  });

  it('leaves alone whoever stands on the inner face right by the rim', () => {
    const lip = new Vector3(Math.cos(0.36), Math.sin(0.36), 0).multiplyScalar(59.8); // 20,6°
    const pull = gravityAt(lip, [well], new Vector3(), 'inside').normalize();
    expect(pull.dot(lip.clone().normalize())).toBeGreaterThan(0.999);
  });

  it('straightens out smoothly past the rim instead of switching at once', () => {
    const tilt = (degrees: number): number => {
      const a = (degrees * Math.PI) / 180;
      const p = new Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(56);
      const pull = gravityAt(p, [well], new Vector3(), 'inside').normalize();
      return pull.dot(p.normalize());
    };
    expect(tilt(19)).toBeLessThan(tilt(21));
    expect(tilt(21)).toBeLessThan(tilt(21.9));
    expect(tilt(22.5)).toBeCloseTo(1, 6);
  });

  it('is not used without a side (the ship crosses the eyes with the plain gravity)', () => {
    const p = new Vector3(57, 4, 0);
    const plain = gravityAt(p, [well], new Vector3()).normalize();
    expect(plain.dot(p.clone().normalize())).toBeCloseTo(1, 6);
  });
});
