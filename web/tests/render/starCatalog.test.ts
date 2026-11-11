import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  SKY_PRESETS,
  galacticFrame,
  galacticLatitude,
  generateStars,
  temperatureColor,
} from '../../src/render/starCatalog';

const home = SKY_PRESETS.solar;

describe('temperatureColor', () => {
  it('pinta rojizas las estrellas frías y azuladas las calientes', () => {
    const [rCold, , bCold] = temperatureColor(3200);
    const [rHot, , bHot] = temperatureColor(20000);
    expect(rCold).toBeGreaterThan(bCold);
    expect(bHot).toBeGreaterThan(rHot);
  });

  it('da un blanco casi neutro hacia los 6500 K', () => {
    const [r, g, b] = temperatureColor(6500);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(0.12);
  });

  it('devuelve componentes entre 0 y 1', () => {
    for (const k of [1500, 3000, 5800, 9000, 40000]) {
      for (const c of temperatureColor(k)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('galacticFrame', () => {
  it('da un polo y un núcleo unitarios y perpendiculares', () => {
    for (const preset of Object.values(SKY_PRESETS)) {
      const { pole, core } = galacticFrame(preset);
      expect(pole.length()).toBeCloseTo(1, 6);
      expect(core.length()).toBeCloseTo(1, 6);
      expect(pole.dot(core)).toBeCloseTo(0, 6);
    }
  });

  it('cada sistema ve la galaxia de otra manera', () => {
    const a = galacticFrame(SKY_PRESETS.solar);
    const b = galacticFrame(SKY_PRESETS.enana_roja);
    expect(a.pole.angleTo(b.pole)).toBeGreaterThan(0.3);
  });
});

describe('generateStars', () => {
  it('es siempre el mismo cielo con la misma semilla', () => {
    const a = generateStars(home);
    const b = generateStars(home);
    expect(a.directions).toEqual(b.directions);
    expect(a.colors).toEqual(b.colors);
  });

  it('cambia con la semilla', () => {
    const a = generateStars(home);
    const b = generateStars({ ...home, seed: home.seed + 1 });
    expect(a.directions).not.toEqual(b.directions);
  });

  it('pone todas las estrellas en direcciones unitarias', () => {
    const { directions, count } = generateStars(home);
    const v = new Vector3();
    for (let i = 0; i < count; i++) {
      v.fromArray(directions, i * 3);
      expect(v.length()).toBeCloseTo(1, 4);
    }
  });

  it('agolpa las estrellas en la banda de la galaxia', () => {
    const { directions, count } = generateStars(home);
    const { pole } = galacticFrame(home);
    const v = new Vector3();
    let inBand = 0;
    for (let i = 0; i < count; i++) {
      v.fromArray(directions, i * 3);
      if (Math.abs(galacticLatitude(v, pole)) < (15 * Math.PI) / 180) inBand++;
    }
    // Repartidas al azar por la esfera, |b| < 15° sería un 26 %.
    expect(inBand / count).toBeGreaterThan(0.45);
  });

  it('tiene muchas más estrellas débiles que brillantes', () => {
    const { flux, count } = generateStars(home);
    let bright = 0;
    let faint = 0;
    for (let i = 0; i < count; i++) {
      const f = flux[i] ?? 0;
      if (f > 0.5) bright++;
      else if (f < 0.05) faint++;
    }
    expect(bright).toBeGreaterThan(5);
    expect(faint).toBeGreaterThan(bright * 20);
  });

  it('mezcla colores: hay estrellas rojizas y azuladas, no solo blancas', () => {
    const { colors, count } = generateStars(home);
    let reddish = 0;
    let bluish = 0;
    for (let i = 0; i < count; i++) {
      const r = colors[i * 3] ?? 0;
      const b = colors[i * 3 + 2] ?? 0;
      if (r - b > 0.25) reddish++;
      if (b - r > 0.1) bluish++;
    }
    expect(reddish / count).toBeGreaterThan(0.1);
    expect(bluish / count).toBeGreaterThan(0.05);
  });
});
