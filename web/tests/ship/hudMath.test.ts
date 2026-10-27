import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { closingSpeed, formatDistance, formatSpeed, placeMarker } from '../../src/ship/hudMath';

describe('closingSpeed', () => {
  it('is positive when the ship approaches the target', () => {
    const towardTarget = new Vector3(100, 0, 0);

    expect(closingSpeed(towardTarget, new Vector3(8, 0, 0))).toBeCloseTo(8);
    expect(closingSpeed(towardTarget, new Vector3(-3, 0, 0))).toBeCloseTo(-3);
  });

  it('ignores the sideways part of the motion', () => {
    expect(closingSpeed(new Vector3(0, 0, 50), new Vector3(20, 0, 0))).toBeCloseTo(0);
  });

  it('is 0 on top of the target', () => {
    expect(closingSpeed(new Vector3(), new Vector3(5, 0, 0))).toBe(0);
  });
});

describe('placeMarker', () => {
  it('keeps a target in view where it is on the screen', () => {
    const marker = placeMarker(new Vector3(0.3, -0.2, 0.5), 0.1);

    expect(marker).toMatchObject({ onScreen: true, x: 0.3, y: -0.2 });
  });

  it('pins a target off to the side against the edge, pointing towards it', () => {
    const marker = placeMarker(new Vector3(3, 0.3, 0.5), 0.1);

    expect(marker.onScreen).toBe(false);
    expect(marker.x).toBeCloseTo(0.9);
    expect(Math.abs(marker.y)).toBeLessThan(0.9);
    expect(marker.angle).toBeCloseTo(Math.atan2(0.3, 3));
  });

  it('points the other way for a target behind the camera', () => {
    // Detrás de la cámara la proyección sale invertida (z > 1).
    const marker = placeMarker(new Vector3(0.2, 0.1, 1.5), 0.1);

    expect(marker.onScreen).toBe(false);
    expect(marker.x).toBeLessThan(0);
    expect(marker.y).toBeLessThan(0);
  });

  it('chooses a direction even for a target exactly behind', () => {
    const marker = placeMarker(new Vector3(0, 0, 1.5), 0.1);

    expect(marker.onScreen).toBe(false);
    expect(Number.isFinite(marker.angle)).toBe(true);
    expect(marker.y).toBeCloseTo(-0.9);
  });
});

describe('formatting in Spanish', () => {
  it('writes distances in metres or kilometres with a decimal comma', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1450)).toBe('1,5 km');
  });

  it('writes speeds without noise when stopped', () => {
    expect(formatSpeed(0.04)).toBe('0 m/s');
    expect(formatSpeed(12.34)).toBe('12 m/s');
    expect(formatSpeed(3.26)).toBe('3,3 m/s');
  });
});
