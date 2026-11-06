import { describe, expect, it } from 'vitest';
import { ATMOSPHERES } from '../../src/data/atmospheres';
import { airDensity } from '../../src/system/atmosphere';

describe('the air of a world', () => {
  it('is all sky on the ground and in the first part of the climb', () => {
    expect(airDensity(0, 100)).toBe(1);
    expect(airDensity(15, 100)).toBe(1);
  });

  it('fades as the ship climbs, and space is back above it', () => {
    expect(airDensity(50, 100)).toBeLessThan(1);
    expect(airDensity(50, 100)).toBeGreaterThan(0);
    expect(airDensity(100, 100)).toBe(0);
    expect(airDensity(500, 100)).toBe(0);
  });

  it('survives nonsense: no air at all', () => {
    expect(airDensity(Number.NaN, 100)).toBe(0);
    expect(airDensity(10, 0)).toBe(0);
  });

  it('home, Umbral, the Archivo, the Taller and the Observatorio have air; the other worlds of the alien system are dead', () => {
    expect(Object.keys(ATMOSPHERES).sort()).toEqual([
      'archivo',
      'hogar',
      'observatorio',
      'taller',
      'umbral',
    ]);
    expect(ATMOSPHERES.hogar?.height).toBeGreaterThan(0);
  });

  it('gives Umbral a thin dusk air that lets the stars through and dims on its night side', () => {
    const umbral = ATMOSPHERES.umbral;

    expect(umbral?.height).toBeGreaterThan(0);
    expect(umbral?.opacity).toBeLessThan(1);
    expect(umbral?.night).toBeDefined();
  });

  it('gives the Archivo a blue sea sky, thicker than the air of Umbral, with a night side', () => {
    const archivo = ATMOSPHERES.archivo;
    const umbral = ATMOSPHERES.umbral;

    expect(archivo?.height).toBeGreaterThan(0);
    expect(archivo?.opacity ?? 0).toBeGreaterThan(umbral?.opacity ?? 1);
    expect(archivo?.night).toBeDefined();
    // Azul: el cénit tiene más azul que rojo.
    expect((archivo?.zenith ?? 0) & 0xff).toBeGreaterThan(((archivo?.zenith ?? 0) >> 16) & 0xff);
  });

  it('gives the Observatorio a dark, thin air: nearly black and clear enough to see the stars', () => {
    const observatorio = ATMOSPHERES.observatorio;
    const umbral = ATMOSPHERES.umbral;
    const brightness = (color: number): number =>
      ((color >> 16) & 0xff) + ((color >> 8) & 0xff) + (color & 0xff);

    expect(observatorio?.height).toBeGreaterThan(0);
    expect(observatorio?.opacity ?? 1).toBeLessThan(umbral?.opacity ?? 0);
    expect(brightness(observatorio?.zenith ?? 0xffffff)).toBeLessThan(60);
    expect(brightness(observatorio?.horizon ?? 0xffffff)).toBeLessThan(
      brightness(umbral?.horizon ?? 0),
    );
    expect(observatorio?.night).toBeDefined();
  });
});
