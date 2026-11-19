// Hogar diez años después (F5, el final malo): la Puerta Mayor terminada, por la que se llega; los cables del Motor;
// los anillos de la costa; el memorial; nadie que ofrezca charla; las crías ya mayores.
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { loadSystemStepwise } from '../../../src/game/loadSystem';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { buildHogar } from '../../../src/worlds/procedural/hogar';
import {
  HOGAR_HOLE_ANCHOR,
  GREAT_RING,
  motorHeading,
} from '../../../src/worlds/procedural/hogarMotor';
import {
  coastSpots,
  COAST_RINGS,
  GATE_EXIT,
  GATE_LANDING,
  GATE_SPHERE_RADIUS,
  GENERATOR_TOP,
  GONE_LATER,
  hogarEra,
  LATER_VARIANT,
  laterOol,
  POLE_HEIGHT,
  POLE_SPACING,
  SHALLOW,
  POWER_LINES,
  polesOf,
  TEN_YEARS,
} from '../../../src/worlds/procedural/hogarLaterShape';
import {
  hogarGround,
  hogarSurface,
  SEA_LEVEL,
  SITES,
  surfaceDistance,
} from '../../../src/worlds/procedural/hogarShape';
import { direction, frameAt } from '../../../src/worlds/procedural/kit';
import { createWorldRuntime } from '../../../src/worlds/worldRuntime';

const later = buildWorld('hogar', LATER_VARIANT);
if (!later) throw new Error('Hogar de diez años después debería construirse');
const before = buildWorld('hogar');
if (!before) throw new Error('Hogar debería construirse');

describe('the variant of Hogar ten years later', () => {
  it('is asked for by name, and a world without variants refuses it', () => {
    expect(hogarEra(undefined)).toBe('antes');
    expect(hogarEra(LATER_VARIANT)).toBe('despues');
    expect(() => hogarEra('mañana')).toThrow(/variante/);
    expect(() => buildWorld('umbral', LATER_VARIANT)).toThrow(/variante/);
  });

  it('grows the young into adults and leaves out who is gone', () => {
    const child = laterOol({ id: 'cria', age: 0.05, outfit: 'cria', seed: 52 });
    const old = laterOol({ id: 'anciano', age: 0.9, outfit: 'vecino', seed: 1 });

    expect(child?.age).toBeCloseTo(0.05 + TEN_YEARS, 6);
    expect(child?.outfit).not.toBe('cria');
    expect(old?.age).toBe(1);
    for (const id of GONE_LATER) {
      expect(laterOol({ id, age: 0.7, outfit: 'directora', seed: 2 })).toBeUndefined();
    }
  });

  it('stays within the triangle budget of Hogar', () => {
    const stats = buildHogar({ era: 'despues' }).getObjectByName('hogar')?.userData.stats as {
      terrain: number;
      places: number;
      ool: number;
      scatter: number;
    };

    expect(stats.terrain + stats.places + stats.ool + stats.scatter).toBeLessThan(260_000);
  });

  it('marks the throat of the Puerta Mayor in both eras (where the black hole is born)', () => {
    for (const world of [before, later]) {
      expect(world.scene.getObjectByName(HOGAR_HOLE_ANCHOR)).toBeDefined();
    }
  });

  it('lands you at the foot of the steps of the Puerta Mayor, out of its sphere, facing the Instituto', () => {
    expect([...later.markers.spawns.keys()]).toEqual(['SPAWN_Puerta']);
    expect([...before.markers.spawns.keys()]).toEqual(['SPAWN_Plaza']);
    const runtime = createWorldRuntime(later);
    const motor = frameAt(hogarSurface, SITES.motor.lat, SITES.motor.lon, {
      heading: motorHeading(),
    });
    const center = motor.point(GREAT_RING.center);
    const exit = motor.point(GATE_EXIT);
    // Del marco de Blender (Z arriba) al de glTF (Y arriba).
    const feet = runtime.spawn.feet;
    const blender = new Vector3(feet.x, -feet.z, feet.y);

    expect(blender.distanceTo(exit)).toBeLessThan(0.6);
    expect(blender.distanceTo(center)).toBeGreaterThan(GATE_SPHERE_RADIUS);
  });

  it('has nobody offering the talk of back then, and neither the Directora nor the Maestra', () => {
    const talks = later.markers.interactions.filter((i) => i.kind === 'charla');
    const ools = later.markers.characters.map((c) => c.id);

    expect(talks).toEqual([]);
    expect(before.markers.interactions.some((i) => i.kind === 'charla')).toBe(true);
    expect(ools.some((id) => /directora|maestra/.test(id))).toBe(false);
    expect(before.markers.characters.some((c) => c.id === 'directora')).toBe(true);
  });

  it('runs the lines of the Motor on dry land, a pole every few metres', () => {
    for (const line of POWER_LINES) {
      const poles = polesOf(line);
      expect(poles.length).toBeGreaterThanOrEqual(2);
      for (const pole of poles) expect(hogarGround(pole)).toBeGreaterThan(SEA_LEVEL - SHALLOW);
      for (let k = 1; k < poles.length; k++) {
        const gap = (poles[k] as Vector3).angleTo(poles[k - 1] as Vector3) * SEA_LEVEL;
        expect(gap).toBeLessThan(POLE_SPACING * 2.2);
      }
    }
  });

  it('keeps the cables of the Motor clear of the landing and the steps of the Gate', () => {
    const motor = frameAt(hogarSurface, SITES.motor.lat, SITES.motor.lon, {
      heading: motorHeading(),
    });
    const toMotor = motor.base.clone().invert();
    const start = motor.point(GENERATOR_TOP);
    for (const line of POWER_LINES) {
      const first = polesOf(line)[0];
      if (!first) continue;
      const top = first.clone().multiplyScalar(hogarGround(first) + POLE_HEIGHT);
      for (let k = 0; k <= 40; k++) {
        const p = start
          .clone()
          .lerp(top, k / 40)
          .applyMatrix4(toMotor);
        const overSteps =
          Math.abs(p.x) < GATE_LANDING.halfWidth + 1.5 &&
          p.y > GATE_LANDING.from - 1 &&
          p.y < GATE_EXIT[1] + 2;
        expect(overSteps).toBe(false);
      }
    }
  });

  it('stands its test rings on the dry shore, apart and away from the places', () => {
    const spots = coastSpots();

    expect(spots.length).toBeGreaterThanOrEqual(COAST_RINGS.count - 2);
    for (const spot of spots) {
      const d = direction(spot.lat, spot.lon);
      expect(hogarGround(d)).toBeGreaterThan(SEA_LEVEL);
      for (const site of Object.values(SITES)) {
        expect(surfaceDistance(d, site.lat, site.lon)).toBeGreaterThan(site.pad);
      }
    }
  });

  it('is what the loader builds when the variant is asked for', async () => {
    const system = await loadSystemStepwise('hogar', [], {}, { hogar: LATER_VARIANT });

    expect(system.runtimes.get('hogar')?.world.scene.getObjectByName('hogar')?.userData.era).toBe(
      'despues',
    );
    expect(system.runtimes.get('luna')).toBeDefined();
  });
});
