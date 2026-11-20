import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOV,
  frameCount,
  sampleAt,
  smoothstep,
  validatePath,
  type CameraKey,
} from '../../src/trailer/cameraPath';

const line: CameraKey[] = [
  { t: 0, pos: [0, 0, 0], look: [0, 0, -1], fov: 50 },
  { t: 2, pos: [10, 0, 0], look: [10, 0, -1], fov: 70 },
];

describe('smoothstep', () => {
  it('entra y sale en los extremos y pasa por la mitad', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect(smoothstep(-3)).toBe(0);
    expect(smoothstep(4)).toBe(1);
  });
});

describe('sampleAt', () => {
  it('pasa exactamente por cada clave', () => {
    const keys: CameraKey[] = [...line, { t: 5, pos: [10, 5, 0], look: [0, 0, 0] }];
    for (const key of keys) {
      const sample = sampleAt(keys, key.t, false);
      expect(sample.pos[0]).toBeCloseTo(key.pos[0]);
      expect(sample.pos[1]).toBeCloseTo(key.pos[1]);
      expect(sample.look[0]).toBeCloseTo(key.look[0]);
    }
  });

  it('interpola en línea recta entre dos claves sin suavizado', () => {
    const sample = sampleAt(line, 1, false);
    expect(sample.pos[0]).toBeCloseTo(5);
    expect(sample.fov).toBeCloseTo(60);
  });

  it('con suavizado arranca más despacio que sin él', () => {
    expect(sampleAt(line, 0.2, true).pos[0]).toBeLessThan(sampleAt(line, 0.2, false).pos[0]);
  });

  it('se queda en la primera y la última clave fuera de la toma', () => {
    expect(sampleAt(line, -4).pos).toEqual([0, 0, 0]);
    expect(sampleAt(line, 99).pos[0]).toBeCloseTo(10);
  });

  it('una sola clave es una toma fija', () => {
    const still: CameraKey[] = [{ t: 0, pos: [1, 2, 3], look: [0, 0, 0] }];
    expect(sampleAt(still, 3)).toEqual({ pos: [1, 2, 3], look: [0, 0, 0], fov: DEFAULT_FOV });
  });

  it('el fov que falta hereda el de la clave anterior', () => {
    const keys: CameraKey[] = [
      { t: 0, pos: [0, 0, 0], look: [0, 0, 1], fov: 40 },
      { t: 1, pos: [1, 0, 0], look: [0, 0, 1] },
    ];
    expect(sampleAt(keys, 0.5, false).fov).toBeCloseTo(40);
  });
});

describe('validatePath', () => {
  it('rechaza una ruta vacía', () => {
    expect(() => {
      validatePath([]);
    }).toThrow('no tiene fotogramas clave');
  });

  it('rechaza tiempos que no crecen', () => {
    expect(() => {
      validatePath([line[0] as CameraKey, { ...(line[1] as CameraKey), t: 0 }]);
    }).toThrow('no va después');
  });

  it('rechaza números no finitos', () => {
    expect(() => {
      validatePath([{ t: 0, pos: [Number.NaN, 0, 0], look: [0, 0, 0] }]);
    }).toThrow('no válidos');
  });
});

describe('frameCount', () => {
  it('redondea y nunca da cero', () => {
    expect(frameCount(2, 60)).toBe(120);
    expect(frameCount(0, 60)).toBe(1);
  });
});
