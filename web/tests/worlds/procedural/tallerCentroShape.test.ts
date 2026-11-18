import { describe, expect, it } from 'vitest';
import {
  CAMARA,
  CAMARA_FOOT,
  COT,
  COT_SIZE,
  GATE,
  OPEN_WALL,
  TABLE,
  WALL_COLATITUDE,
  WALLS,
  floorDrop,
  groundDistance,
  lapsOnWalls,
  tallyGroupsPerRow,
  wallWidth,
} from '../../../src/worlds/procedural/tallerCentroShape';
import { EXIT_DISTANCE } from '../../../src/worlds/gates';
import { CORE_RADIUS } from '../../../src/worlds/procedural/tallerShape';

const ringDistance = (WALL_COLATITUDE * Math.PI * CORE_RADIUS) / 180;

describe('the house of the skeptic around the Chamber', () => {
  it('puts everything inside the ring of walls and clear of the Chamber', () => {
    for (const spot of [GATE, COT, TABLE]) {
      const fromCamara = groundDistance(CAMARA, spot);
      expect(fromCamara).toBeGreaterThan(CAMARA_FOOT + 2);
      expect(fromCamara).toBeLessThan(ringDistance - 1);
    }
  });

  it('lands whoever comes through the ring in front of the Chamber, not on the furniture', () => {
    const arrival = groundDistance(CAMARA, GATE) - EXIT_DISTANCE;

    expect(arrival).toBeGreaterThan(CAMARA_FOOT + 0.8);
    expect(groundDistance(GATE, COT)).toBeGreaterThan(COT_SIZE.length);
    expect(groundDistance(GATE, TABLE)).toBeGreaterThan(COT_SIZE.length);
    expect(groundDistance(COT, TABLE)).toBeGreaterThan(COT_SIZE.length);
  });

  it('leaves gaps between the walls, never overlapping, and the open wall exists', () => {
    WALLS.forEach((wall, i) => {
      expect(wall.to).toBeGreaterThan(wall.from);
      const next = WALLS[i + 1];
      if (next) expect(next.from).toBeGreaterThan(wall.to);
      expect(wallWidth(wall)).toBeGreaterThan(2);
    });
    expect(WALLS[OPEN_WALL]).toBeDefined();
    // Detrás del anillo (longitud 0) hay hueco: el paso no queda tapiado.
    expect(WALLS.some((w) => w.from <= GATE.lon && w.to >= GATE.lon)).toBe(false);
  });

  it('fits more laps on the walls than anyone could count by days', () => {
    expect(tallyGroupsPerRow(0.4)).toBe(0);
    expect(tallyGroupsPerRow(5)).toBe(9);
    expect(lapsOnWalls()).toBeGreaterThan(5000);
  });

  it('drops the floor towards the ends of a long piece of furniture', () => {
    expect(floorDrop(0, 0)).toBe(0);
    expect(floorDrop(1.65, 0)).toBeCloseTo(0.17, 2);
    expect(floorDrop(1.65, 0.5)).toBeGreaterThan(floorDrop(1.65, 0));
  });
});
