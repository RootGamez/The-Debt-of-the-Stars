// El tablero en espiral del suelo del Laboratorio: casillas alternas que se tuercen con la latitud.
import { describe, expect, it } from 'vitest';
import { BOARD_SECTORS, boardCell } from '../../../src/worlds/procedural/laboratorioFloor';

describe('Laboratorio spiral board', () => {
  it('alternates dark and light between neighbouring squares along the equator', () => {
    const step = (Math.PI * 2) / BOARD_SECTORS;
    const at = (lon: number) => boardCell(Math.cos(lon), Math.sin(lon), 0);
    const a = at(step * 0.5);
    const b = at(step * 1.5);
    expect(b.column).toBe(a.column + 1);
    expect(b.dark).toBe(!a.dark);
  });

  it('twists the columns as the latitude grows, so the board spirals', () => {
    const lat = 0.6;
    const north = boardCell(Math.cos(lat), 0, Math.sin(lat));
    const equator = boardCell(1, 0, 0);
    expect(north.column).toBeGreaterThan(equator.column);
    expect(north.row).toBeGreaterThan(equator.row);
  });

  it('does not depend on the distance to the centre', () => {
    expect(boardCell(3, 4, 5)).toEqual(boardCell(30, 40, 50));
  });
});
