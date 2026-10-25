import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import chronologyData from '../../src/data/cronologia.json';
import systemData from '../../src/data/sistema.json';
import { parseChronology } from '../../src/core/timeline';
import { toSystemPosition } from '../../src/system/frames';
import { createLocator, createStandaloneLocator, type WorldBody } from '../../src/system/locator';
import { bodyPose } from '../../src/system/orbits';
import { parseSystem, type BodySpec } from '../../src/system/systemData';
import { WORLD_IDS } from '../../src/worlds/worldSelection';

const system = parseSystem(systemData, WORLD_IDS);
const chronology = parseChronology(chronologyData, WORLD_IDS);
const worlds: WorldBody[] = [
  { world: 'umbral', radius: 90, clockRate: 1 },
  { world: 'archivo', radius: 70, clockRate: 0.8 },
  { world: 'taller', radius: 45, clockRate: 0.85 },
  { world: 'cicatriz', radius: 80, clockRate: 0.6 },
  { world: 'observatorio', radius: 30, clockRate: 1.15 },
];
const locator = createLocator(system, worlds, chronology);

function specOf(world: string): BodySpec {
  const spec = system.bodyOf(world);
  if (!spec) throw new Error(`falta ${world}`);
  return spec;
}

function feetOn(world: string, t: number): Vector3 {
  const spec = specOf(world);
  const radius = worlds.find((w) => w.world === world)?.radius ?? 0;
  return toSystemPosition(bodyPose(spec, t), new Vector3(0, radius, 0), new Vector3());
}

const farAway = new Vector3(0, 20000, 0);

describe('rate of the clock', () => {
  it('is the rate of the world on its surface, at any time', () => {
    for (const t of [0, 100, 450, 800]) {
      expect(locator.locate(t, 'archivo', feetOn('archivo', t)).rate).toBeCloseTo(0.8);
      expect(locator.locate(t, 'observatorio', feetOn('observatorio', t)).rate).toBeCloseTo(1.15);
    }
  });

  it('follows the clock curve of Cicatriz as the cycle advances', () => {
    expect(locator.locate(0, 'cicatriz', feetOn('cicatriz', 0)).rate).toBeCloseTo(0.6);
    expect(locator.locate(405, 'cicatriz', feetOn('cicatriz', 405)).rate).toBeCloseTo(0.475);
    expect(locator.locate(810, 'cicatriz', feetOn('cicatriz', 810)).rate).toBeCloseTo(0.35);
  });

  it('is 1 far from every mass', () => {
    expect(locator.locate(300, undefined, farAway).rate).toBe(1);
  });

  it('moves between the two while approaching a slow world', () => {
    const t = 200;
    const surface = feetOn('archivo', t);
    const center = bodyPose(specOf('archivo'), t).position;
    const outward = surface.clone().sub(center).normalize();
    const halfway = center.clone().addScaledVector(outward, 70 + 105); // 1,5 radios sobre la superficie

    const rate = locator.locate(t, undefined, halfway).rate;

    expect(rate).toBeGreaterThan(0.8);
    expect(rate).toBeLessThan(1);
  });
});

describe('where you are', () => {
  it('reports the reference world, or open space', () => {
    expect(locator.locate(10, 'umbral', feetOn('umbral', 10)).worldId).toBe('umbral');
    expect(locator.locate(10, undefined, farAway).worldId).toBeUndefined();
  });
});

describe('the absorption front in open space', () => {
  it('has not appeared before the first absorption', () => {
    expect(locator.locate(500, undefined, farAway.clone().setY(100)).engulfed).toBe(false);
    expect(locator.locate(809, undefined, new Vector3(0, 0, 0)).engulfed).toBe(false);
  });

  it('is born where Cicatriz is when the black hole appears', () => {
    const origin = bodyPose(specOf('cicatriz'), 810).position;
    const nearby = origin.clone().add(new Vector3(30, 0, 0));

    expect(locator.locate(812, undefined, nearby).engulfed).toBe(true);
    expect(
      locator.locate(812, undefined, nearby.clone().add(new Vector3(2000, 0, 0))).engulfed,
    ).toBe(false);
  });

  it('has covered the whole system by the end of the cycle', () => {
    for (const world of ['umbral', 'observatorio', 'taller']) {
      expect(locator.locate(900, undefined, feetOn(world, 900)).engulfed).toBe(true);
    }
  });

  it('grows outwards: what is farther is reached later', () => {
    const near = new Vector3(0, 0, 0);
    const far = new Vector3(0, 0, 3000);
    const firstCaught = (position: Vector3): number => {
      for (let t = 810; t <= 900; t += 1) {
        if (locator.locate(t, undefined, position).engulfed) return t;
      }
      return Infinity;
    };

    expect(firstCaught(near)).toBeLessThan(firstCaught(far));
  });

  it('never reaches you while you are inside the influence of a world', () => {
    expect(locator.locate(900, 'umbral', feetOn('umbral', 900)).engulfed).toBe(false);
  });
});

describe('a world outside any system', () => {
  const standalone = createStandaloneLocator(
    { world: 'cicatriz', radius: 80, clockRate: 0.6 },
    chronology,
  );

  it('is always on that world, with its own rate and its curve', () => {
    expect(standalone(0)).toMatchObject({ worldId: 'cicatriz', engulfed: false });
    expect(standalone(0).rate).toBeCloseTo(0.6);
    expect(standalone(810).rate).toBeCloseTo(0.35);
  });
});
