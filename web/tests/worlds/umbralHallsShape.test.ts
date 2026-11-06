import { describe, expect, it } from 'vitest';
import { HALL, HALLS, hallPad, wallSpans } from '../../src/worlds/procedural/umbralHallsShape';

describe('the closed halls of Umbral', () => {
  it('have doors a grown Ool fits through easily, made for someone much taller', () => {
    expect(HALL.doorHeight).toBeGreaterThan(2.5);
    expect(HALL.doorWidth - HALL.leafCover).toBeGreaterThan(1);
    expect(HALL.height).toBeGreaterThan(HALL.doorHeight);
  });

  it('keep every partition and its doorway inside the walls', () => {
    for (const shape of Object.values(HALLS)) {
      for (const p of shape.partitions) {
        const across = p.axis === 'x' ? shape.depth : shape.width;
        const along = p.axis === 'x' ? shape.width : shape.depth;
        expect(Math.abs(p.at)).toBeLessThan(across / 2 - HALL.wall);
        expect(p.from).toBeGreaterThanOrEqual(-along / 2);
        expect(p.to).toBeLessThanOrEqual(along / 2);
        expect(p.door - HALL.doorWidth / 2).toBeGreaterThan(p.from);
        expect(p.door + HALL.doorWidth / 2).toBeLessThan(p.to);
      }
    }
  });

  it('get a flat pad that covers the whole building', () => {
    expect(hallPad({ width: 12, depth: 9 })).toBeGreaterThan(Math.hypot(6, 4.5));
  });

  it('split a wall around its doorway', () => {
    expect(wallSpans(-5, 5, 0, 2)).toEqual([
      [-5, -1],
      [1, 5],
    ]);
    expect(wallSpans(-5, 5, undefined, 2)).toEqual([[-5, 5]]);
    expect(wallSpans(-5, 5, -4.5, 2)).toEqual([[-3.5, 5]]);
  });
});
