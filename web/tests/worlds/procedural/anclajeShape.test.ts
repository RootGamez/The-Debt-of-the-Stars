import { describe, expect, it } from 'vitest';
import {
  ANCLAJE_RADIUS,
  DRUM_LAT,
  HUBS,
  anclajeGround,
  hubSites,
  siteDirection,
  type HubId,
} from '../../../src/worlds/procedural/anclajeShape';
import { angleBetween, direction } from '../../../src/worlds/procedural/kit';

const IDS: HubId[] = ['norte', 'sur'];

describe('anclajeGround', () => {
  it('is a sphere of the hub radius on the caps', () => {
    expect(anclajeGround(direction(75, 10))).toBeCloseTo(ANCLAJE_RADIUS, 6);
    expect(anclajeGround(direction(-75, 200))).toBeCloseTo(ANCLAJE_RADIUS, 6);
  });

  it('rises on the bearing drum around the equator, where the rings turn', () => {
    expect(anclajeGround(direction(0, 33))).toBeGreaterThan(ANCLAJE_RADIUS + 1);
    expect(anclajeGround(direction(DRUM_LAT - 2, 0))).toBeGreaterThan(ANCLAJE_RADIUS);
  });
});

describe('the two hubs', () => {
  it('sit on the poles of the structure, one above the star and one below', () => {
    expect(HUBS.norte.position).toEqual([0, 270, 0]);
    expect(HUBS.sur.position).toEqual([0, -270, 0]);
    expect(HUBS.norte.outer).toBe(1);
    expect(HUBS.sur.outer).toBe(-1);
  });

  it.each(IDS)('keeps the %s sites on the caps, clear of the drum and of each other', (id) => {
    const sites = Object.entries(hubSites(id));
    for (const [, site] of sites) {
      expect(Math.abs(site.lat)).toBeGreaterThan(DRUM_LAT + 8);
    }
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        const a = siteDirection(sites[i]![1]);
        const b = siteDirection(sites[j]![1]);
        expect(
          angleBetween(a, b) * ANCLAJE_RADIUS,
          `${sites[i]![0]} y ${sites[j]![0]}`,
        ).toBeGreaterThan(9);
      }
    }
  });

  it.each(IDS)(
    'puts the landing pad on the outer cap and the receiver on the sunward one',
    (id) => {
      const sites = hubSites(id);
      const outer = HUBS[id].outer;

      expect(Math.sign(sites.pad.lat)).toBe(outer);
      expect(Math.sign(sites.gateOuter.lat)).toBe(outer);
      expect(Math.sign(sites.inner.lat)).toBe(-outer);
      expect(Math.sign(sites.gateInner.lat)).toBe(-outer);
    },
  );
});
