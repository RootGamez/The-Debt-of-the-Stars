import { describe, expect, it } from 'vitest';
import { ARCHIVO_SOURCES, LOCK_HOLE } from '../../../src/worlds/procedural/archivoGallery';
import {
  BULKHEAD_LONS,
  CORRIDOR_HALF,
  DOOR,
  ROOMS,
  bulkheadStrips,
  inCorridor,
  nearBulkhead,
  roomAt,
} from '../../../src/worlds/procedural/archivoRoomsShape';
import { FONDO, TUBE_MINOR, lonDelta } from '../../../src/worlds/procedural/archivoShape';

describe('the rooms of the Archivo gallery', () => {
  it('cover the whole tube once, going east, without gaps or overlaps', () => {
    let total = 0;
    for (const [index, room] of ROOMS.entries()) {
      const next = ROOMS[(index + 1) % ROOMS.length];
      expect(room.to, room.id).toBe(next?.from);
      total += (((room.to - room.from) % 360) + 360) % 360;
    }
    expect(total).toBe(360);
  });

  it('puts every source in the room the plan gives it', () => {
    const expected: Record<string, string> = {
      informe_oficial: 'nave',
      indice: 'indice',
      sala_relojes: 'relojes',
      cartas: 'archivista',
      escritorio: 'archivista',
      ranura_luz: 'ranura',
      fondo_canon: 'fondo',
    };
    for (const source of ARCHIVO_SOURCES) {
      expect(roomAt(source.lon).id, source.id).toBe(expected[source.id]);
    }
  });

  it('puts the lock in the vestibule and nothing else in the same place', () => {
    expect(roomAt((LOCK_HOLE.from + LOCK_HOLE.to) / 2).id).toBe('vestibulo');
    expect(ROOMS.map((r) => r.id)).toEqual([
      'vestibulo',
      'ranura',
      'cajones',
      'fondo',
      'relojes',
      'nave',
      'indice',
      'archivista',
    ]);
  });

  it('has one bulkhead at the start of every room', () => {
    expect(BULKHEAD_LONS).toEqual(ROOMS.map((r) => r.from));
  });

  it('keeps every bulkhead away from the sources, the lock hole and the ramps of the Fondo', () => {
    for (const lon of BULKHEAD_LONS) {
      for (const source of ARCHIVO_SOURCES) {
        expect(
          Math.abs(lonDelta(lon, source.lon)),
          `${String(lon)} / ${source.id}`,
        ).toBeGreaterThan(4);
      }
      expect(lon < LOCK_HOLE.from - 3 || lon > LOCK_HOLE.to + 3 || lon === 92, String(lon)).toBe(
        true,
      );
      expect(Math.abs(lonDelta(lon, FONDO.lon)), String(lon)).toBeGreaterThan(
        FONDO.flat + FONDO.ramp + 3,
      );
    }
  });

  it('knows the narrow corridor of the drawers and what is close to a bulkhead', () => {
    expect(inCorridor(180)).toBe(true);
    expect(inCorridor(-170)).toBe(true);
    expect(inCorridor(40)).toBe(false);
    expect(nearBulkhead(30.5, 1.5)).toBe(true);
    expect(nearBulkhead(40, 1.5)).toBe(false);
    expect(CORRIDOR_HALF).toBeLessThan(3.5);
  });
});

describe('a bulkhead wall', () => {
  const floor = -5.4;
  const strips = bulkheadStrips(floor);

  it('fills the tube section from the floor to the top, strip by strip, inside the glass', () => {
    expect(strips.length).toBeGreaterThan(10);
    for (const s of strips) {
      expect(s.x + s.height / 2).toBeLessThanOrEqual(TUBE_MINOR);
      expect(s.x - s.height / 2).toBeGreaterThanOrEqual(floor - 0.3 - 1e-9);
      expect(Math.abs(s.z) + s.width / 2).toBeLessThanOrEqual(TUBE_MINOR);
    }
  });

  it('leaves a door through the middle at floor level and closes the rest', () => {
    const lowStrips = strips.filter((s) => s.x + s.height / 2 <= floor + DOOR.height + 1e-6);
    const through = (z: number) =>
      lowStrips.some((s) => z >= s.z - s.width / 2 && z <= s.z + s.width / 2);

    expect(lowStrips.length).toBeGreaterThan(2);
    expect(through(0)).toBe(false);
    expect(through(DOOR.half - 0.05)).toBe(false);
    expect(through(DOOR.half + 0.3)).toBe(true);
    expect(through(-(DOOR.half + 0.3))).toBe(true);
    const higher = strips.filter((s) => s.x - s.height / 2 >= floor + DOOR.height - 1e-6);
    expect(higher.every((s) => s.z === 0)).toBe(true);
  });
});
