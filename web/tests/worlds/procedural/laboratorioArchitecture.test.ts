// Las casas del Laboratorio (E7, pedido de Anthony): cada cuarto con su techo y una estructura que se tiene en pie
// (muros portantes con machones, dinteles, cubierta apoyada), puertas por las que pasan ellos y el jugador, y nada
// tan alto que lo atraviesen los restos que orbitan la semilla.
import { describe, expect, it } from 'vitest';
import { ABSENT_HEIGHT } from '../../../src/character/absent';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../../../src/data/movement';
import {
  BUILDINGS,
  DOOR,
  MIN_PIER,
  ROOF_LIMIT,
  ROTUNDA,
  clearHeight,
  colonnadeGap,
  columnAngles,
  doorOf,
  faceLength,
  openingsOf,
  pitchedHeight,
  roofTop,
  rotundaTop,
  segmentalArch,
  wallPieces,
  type Building,
  type Face,
} from '../../../src/worlds/procedural/laboratorioArchitecture';

const houses: Building[] = Object.values(BUILDINGS);
const FACES: readonly Face[] = ['front', 'back', 'left', 'right'];

describe('Laboratorio houses', () => {
  it('roofs every room, under the debris that orbits the seed', () => {
    for (const b of houses) {
      expect(b.roof).toBeDefined();
      expect(b.rise).toBeGreaterThan(0);
      expect(roofTop(b)).toBeGreaterThan(b.eaves);
      expect(roofTop(b)).toBeLessThanOrEqual(ROOF_LIMIT);
    }
    expect(rotundaTop()).toBeLessThanOrEqual(ROOF_LIMIT);
  });

  it('leaves room to stand under what holds the roof, for them and for the player', () => {
    for (const b of houses) expect(clearHeight(b)).toBeGreaterThanOrEqual(DOOR.height);
    expect(ROTUNDA.column).toBeGreaterThan(DOOR.height);
  });

  it('opens one door per room in its front, wide and tall enough to walk through', () => {
    expect(DOOR.height).toBeGreaterThan(ABSENT_HEIGHT + 0.15);
    expect(DOOR.height).toBeGreaterThan(PLAYER_HEIGHT);
    expect(DOOR.width).toBeGreaterThan(4 * PLAYER_RADIUS);
    for (const b of houses) {
      const doors = b.openings.filter((o) => o.kind === 'door');
      expect(doors).toHaveLength(1);
      const door = doorOf(b);
      expect(door.face).toBe('front');
      expect(door.sill).toBe(0);
      expect(door.width).toBeGreaterThanOrEqual(DOOR.width);
    }
  });

  it('keeps a solid pier at every corner and between openings, and a lintel course above them', () => {
    for (const b of houses) {
      for (const face of FACES) {
        const length = faceLength(b, face);
        const holes = openingsOf(b, face).sort((p, q) => p.at - q.at);
        let edge = -length / 2;
        for (const o of holes) {
          expect(o.at - o.width / 2 - edge).toBeGreaterThanOrEqual(MIN_PIER);
          expect(o.head + 0.26).toBeLessThanOrEqual(b.eaves);
          expect(o.head).toBeGreaterThan(o.sill);
          edge = o.at + o.width / 2;
        }
        expect(length / 2 - edge).toBeGreaterThanOrEqual(MIN_PIER);
      }
    }
  });

  it('builds each wall around its openings: solid everywhere else, never across a hole', () => {
    const holes = [
      { at: -1.5, width: 1.0, sill: 1.0, head: 2.6 },
      { at: 0.5, width: 1.5, sill: 0, head: 3.0 },
    ];
    const pieces = wallPieces(6, holes, 3.4);
    const area = pieces.reduce((sum, p) => sum + (p.to - p.from) * (p.top - p.bottom), 0);
    const open = holes.reduce((sum, o) => sum + o.width * (o.head - o.sill), 0);
    expect(area).toBeCloseTo(6 * 3.4 - open, 6);
    for (const p of pieces) {
      for (const o of holes) {
        const overlapsAlong =
          p.from < o.at + o.width / 2 - 1e-9 && p.to > o.at - o.width / 2 + 1e-9;
        const overlapsUp = p.bottom < o.head - 1e-9 && p.top > o.sill + 1e-9;
        expect(overlapsAlong && overlapsUp).toBe(false);
      }
    }
    // Bajo una puerta no queda nada: ni antepecho ni escalón.
    expect(pieces.some((p) => p.from >= -0.25 && p.to <= 1.25 && p.bottom === 0)).toBe(false);
  });

  it('springs the measuring room vault from its walls, as a segment of a circle', () => {
    const b = BUILDINGS.mediciones;
    const { radius, half } = segmentalArch(b.width, b.rise);
    expect(radius * Math.sin(half)).toBeCloseTo(b.width / 2, 6);
    expect(radius * (1 - Math.cos(half))).toBeCloseTo(b.rise, 6);
  });

  it('pitches the gable from the top of the walls to the ridge', () => {
    const b = BUILDINGS.comedor;
    expect(pitchedHeight(b, 0)).toBeCloseTo(b.eaves + b.rise, 6);
    expect(pitchedHeight(b, b.width / 2 + 0.11)).toBeCloseTo(b.eaves, 6);
  });

  it('rings the cold chamber with columns, leaving the way in from the crossing open', () => {
    const angles = columnAngles();
    expect(angles).toHaveLength(ROTUNDA.columns);
    for (const a of angles) expect(Math.abs(Math.cos(a - Math.PI / 2))).toBeLessThan(0.95);
    expect(colonnadeGap()).toBeGreaterThan(4 * PLAYER_RADIUS);
    // La cúpula descansa en el anillo de dinteles, no en el aire.
    expect(ROTUNDA.dome).toBeLessThanOrEqual(ROTUNDA.radius + 0.25 / 2);
  });
});
