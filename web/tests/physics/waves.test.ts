// El oleaje (Fase 11E): la misma ola para la física y el shader, cómo sube y baja la superficie, cómo mece a quien
// nada y cómo se posa la nave sobre ella.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import type { MoveIntent } from '../../src/core/input';
import { PHYSICS_STEP } from '../../src/data/movement';
import { createCharacter, stepCharacter } from '../../src/physics/characterMotor';
import type { GravityWell } from '../../src/physics/gravity';
import {
  isWet,
  submersion,
  surfacePoint,
  surfaceRadius,
  withSeaSurface,
  type WaterBody,
} from '../../src/physics/water';
import {
  createWaves,
  maxWaveHeight,
  waveClock,
  waveDrift,
  waveHeight,
} from '../../src/physics/waves';
import { sphereWorld } from '../helpers/testWorlds';

const SEA = 70;
const HEIGHT = 0.5;
const waves = createWaves(HEIGHT, 3);
const water: WaterBody = { center: new Vector3(), level: SEA, waves };
const NORTH = new Vector3(0, 1, 0);
const IDLE: MoveIntent = { x: 0, z: 0, run: false, jump: false };

/** Direcciones repartidas por la esfera, siempre las mismas. */
const directions = Array.from({ length: 200 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 200;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.399963;
  return new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the waves', () => {
  it('add up to the height asked for, the long swell carrying most of it', () => {
    expect(maxWaveHeight(waves)).toBeCloseTo(HEIGHT, 6);
    const [first, last] = [waves[0], waves.at(-1)];
    expect(first?.amplitude ?? 0).toBeGreaterThan(last?.amplitude ?? 1);
    // Las largas van más deprisa (aguas profundas): ω/k crece con la longitud.
    expect((first?.omega ?? 0) / (first?.k.length() ?? 1)).toBeGreaterThan(
      (last?.omega ?? 0) / (last?.k.length() ?? 1),
    );
  });

  it('are the same for the same seed, and different for another', () => {
    expect(createWaves(HEIGHT, 3)).toEqual(waves);
    expect(createWaves(HEIGHT, 4)).not.toEqual(waves);
  });

  it('never rise or fall more than their height, and do reach most of it', () => {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let t = 0; t < 20; t += 0.7) {
      for (const d of directions) {
        const h = waveHeight(waves, d, SEA, t);
        highest = Math.max(highest, h);
        lowest = Math.min(lowest, h);
      }
    }
    expect(highest).toBeLessThanOrEqual(HEIGHT + 1e-9);
    expect(lowest).toBeGreaterThanOrEqual(-HEIGHT - 1e-9);
    expect(highest).toBeGreaterThan(HEIGHT * 0.6);
    expect(lowest).toBeLessThan(-HEIGHT * 0.6);
  });

  it('move with time', () => {
    const d = directions[17] ?? NORTH;
    expect(waveHeight(waves, d, SEA, 0)).not.toBeCloseTo(waveHeight(waves, d, SEA, 1.3), 3);
  });

  it('carry what floats along the surface, never up or down', () => {
    const out = new Vector3();
    let strongest = 0;
    for (const d of directions) {
      waveDrift(waves, d, SEA, 2, out);
      expect(Math.abs(out.dot(d))).toBeLessThan(1e-9);
      strongest = Math.max(strongest, out.length());
    }
    expect(strongest).toBeGreaterThan(0.05);
    expect(strongest).toBeLessThan(2);
  });

  it('keep their own clock in seconds', () => {
    vi.spyOn(performance, 'now').mockReturnValue(12_500);
    expect(waveClock()).toBe(12.5);
  });
});

describe('a sea with waves', () => {
  it('has its surface where the waves are at that moment', () => {
    const p = new Vector3(0, 69, 0);
    const radius = surfaceRadius(p, water, 4);
    expect(radius).toBeCloseTo(SEA + waveHeight(waves, NORTH, SEA, 4), 9);
    expect(surfacePoint(p, water, new Vector3(), 4).length()).toBeCloseTo(radius, 9);
  });

  it('wets a point just under a crest and leaves it dry in the trough', () => {
    const d = directions[40] ?? NORTH;
    let crest = 0;
    let trough = 0;
    for (let t = 0; t < 30; t += 0.05) {
      const h = waveHeight(waves, d, SEA, t);
      if (h > waveHeight(waves, d, SEA, crest)) crest = t;
      if (h < waveHeight(waves, d, SEA, trough)) trough = t;
    }
    const p = d.clone().multiplyScalar(SEA);
    expect(isWet(p, water, crest)).toBe(true);
    expect(isWet(p, water, trough)).toBe(false);
  });

  it('covers more of the body under a crest than in a trough', () => {
    const feet = new Vector3(0, SEA - 1.2, 0);
    const amounts = [0, 1, 2, 3, 4, 5, 6, 7].map((t) => submersion(feet, NORTH, water, t));
    expect(Math.max(...amounts) - Math.min(...amounts)).toBeGreaterThan(0.1);
  });

  it('rocks a floating swimmer up and down with the swell', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now * 1000);
    const well: GravityWell = { center: new Vector3(), radius: SEA, strength: 14.7, range: 140 };
    const env = { wells: [well], world: sphereWorld(new Vector3(), 56), water };
    const state = createCharacter(new Vector3(0, SEA - 1, 0), new Quaternion());
    const heights: number[] = [];
    for (let i = 0; i < 12 / PHYSICS_STEP; i++) {
      now += PHYSICS_STEP;
      stepCharacter(state, IDLE, env, PHYSICS_STEP);
      if (now > 4) heights.push(state.position.length());
    }
    expect(state.swimming).toBe(true);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.15);
    // Flota: no se va al fondo ni sale del agua.
    expect(Math.min(...heights)).toBeGreaterThan(SEA - 2);
    expect(Math.max(...heights)).toBeLessThan(SEA);
  });

  it('lets the ship rest on the waves: rays stop at the moving surface', () => {
    vi.spyOn(performance, 'now').mockReturnValue(3_000);
    const hull = withSeaSurface({ ...sphereWorld(new Vector3(), 56), raycast: () => null }, water);
    const from = new Vector3(0, SEA + 10, 0);
    const hit = hull.raycast(from, new Vector3(0, -1, 0), 40);
    expect(hit).toBeCloseTo(10 - waveHeight(waves, NORTH, SEA, 3), 2);
  });
});
