import { describe, expect, it } from 'vitest';
import { sampleKeys, type CameraKey } from '../../src/cinematic/cameraTrack';

const keys: CameraKey[] = [
  { t: 0, pos: [0, 0, 0], look: [0, 10, 0], fov: 40 },
  { t: 2, pos: [2, 0, 0], look: [0, 10, 0] },
  { t: 6, pos: [6, 0, 1], look: [0, 10, 2], fov: 30, roll: 0.1 },
];

describe('sampleKeys', () => {
  it('pasa exactamente por cada clave', () => {
    for (const key of keys) {
      const pose = sampleKeys(keys, key.t, 50);
      expect(pose.pos[0]).toBeCloseTo(key.pos[0]);
      expect(pose.pos[2]).toBeCloseTo(key.pos[2]);
      expect(pose.look[2]).toBeCloseTo(key.look[2]);
    }
  });

  it('antes de la primera y después de la última se queda quieta', () => {
    expect(sampleKeys(keys, -5, 50).pos).toEqual([0, 0, 0]);
    expect(sampleKeys(keys, 99, 50).pos).toEqual([6, 0, 1]);
  });

  it('con las claves al ritmo del tiempo, avanza sin saltos', () => {
    let previous = sampleKeys(keys, 0, 50).pos[0];
    for (let time = 0.1; time <= 6; time += 0.1) {
      const x = sampleKeys(keys, time, 50).pos[0];
      expect(x).toBeGreaterThan(previous);
      expect(x - previous).toBeLessThan(0.25);
      previous = x;
    }
    // Recta a velocidad constante (1 m/s): la curva con nudos en el tiempo no acelera en la clave del medio.
    expect(sampleKeys(keys, 1, 50).pos[0]).toBeCloseTo(1, 1);
    expect(sampleKeys(keys, 4, 50).pos[0]).toBeCloseTo(4, 0);
  });

  it('el fov sin dato es el de la clave anterior o el de reserva, y nunca se pasa', () => {
    expect(sampleKeys(keys, 0, 50).fov).toBe(40);
    expect(sampleKeys(keys, 1, 50).fov).toBe(40);
    const middle = sampleKeys(keys, 4, 50).fov;
    expect(middle).toBeLessThan(40);
    expect(middle).toBeGreaterThan(30);
    expect(sampleKeys([{ t: 0, pos: [0, 0, 0], look: [1, 0, 0] }], 3, 55).fov).toBe(55);
  });

  it('el alabeo va de 0 al de la clave', () => {
    expect(sampleKeys(keys, 0, 50).roll).toBe(0);
    expect(sampleKeys(keys, 6, 50).roll).toBeCloseTo(0.1);
  });

  it('una sola clave es un plano fijo', () => {
    const still = sampleKeys([{ t: 0, pos: [1, 2, 3], look: [0, 0, 0] }], 10, 45);
    expect(still.pos).toEqual([1, 2, 3]);
    expect(still.fov).toBe(45);
  });
});
