// La marquetería en espiral del suelo del Laboratorio (E7): un tablero de ajedrez trazado en la proyección de
// Mercator, girado, así que sus casillas son cuadradas en todas partes y se enroscan de un polo a otro.
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  BOARD_TURN,
  boardCell,
  boardCellSize,
  pathArc,
} from '../../../src/worlds/procedural/laboratorioFloor';

/** El punto de la esfera unidad (Z arriba) con coordenadas de Mercator (u, v) = (lon, y) / 2π. */
function fromMercator(u: number, v: number): [number, number, number] {
  const lon = 2 * Math.PI * u;
  const lat = Math.atan(Math.sinh(2 * Math.PI * v));
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

/** Un paso de una casilla en el tablero: (du, dv) que suma 1 a la columna (o a la fila) sin mover la otra. */
function boardStep(along: 'column' | 'row'): [number, number] {
  const [m, n] = BOARD_TURN;
  const d = m * m + n * n;
  return along === 'column' ? [m / d, n / d] : [-n / d, m / d];
}

describe('Laboratorio spiral board', () => {
  it('turns an even number of times, so a full turn of longitude closes without a seam', () => {
    expect(BOARD_TURN[0] % 2).toBe(0);
    expect(BOARD_TURN[1] % 2).toBe(0);
    for (const lat of [-0.9, -0.3, 0.1, 0.7]) {
      const z = Math.sin(lat);
      const c = Math.cos(lat);
      const east = boardCell(c * Math.cos(Math.PI - 1e-6), c * Math.sin(Math.PI - 1e-6), z);
      const west = boardCell(c * Math.cos(-Math.PI + 1e-6), c * Math.sin(-Math.PI + 1e-6), z);
      expect(east.dark).toBe(west.dark);
    }
  });

  it('alternates dark and light across every column and every row', () => {
    const points: [number, number][] = [
      [0.013, 0.004],
      [0.21, -0.07],
      [-0.33, 0.12],
      [0.47, 0.031],
    ];
    for (const [u, v] of points) {
      const here = boardCell(...fromMercator(u, v));
      for (const along of ['column', 'row'] as const) {
        const [du, dv] = boardStep(along);
        const next = boardCell(...fromMercator(u + du, v + dv));
        expect(next[along]).toBe(here[along] + 1);
        expect(next.dark).toBe(!here.dark);
      }
    }
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

  it('keeps the squares about two strides wide at the equator and shrinks them toward the poles', () => {
    const radius = 21;
    expect(boardCellSize(0, radius)).toBeGreaterThan(2);
    expect(boardCellSize(0, radius)).toBeLessThan(2.6);
    expect(boardCellSize(Math.PI / 3, radius)).toBeCloseTo(boardCellSize(0, radius) / 2, 6);
  });

  it('describes each path as an arc that starts at its first site and ends at the second', () => {
    const from = new Vector3(1, 0.2, -0.3).normalize();
    const to = new Vector3(-0.2, 1, 0.4).normalize();
    const { normal, tangent, angle } = pathArc(from, to);
    expect(tangent.dot(from)).toBeCloseTo(0, 6);
    expect(normal.dot(from)).toBeCloseTo(0, 6);
    expect(angle).toBeCloseTo(from.angleTo(to), 6);
    const end = from
      .clone()
      .multiplyScalar(Math.cos(angle))
      .add(tangent.clone().multiplyScalar(Math.sin(angle)));
    expect(end.distanceTo(to)).toBeLessThan(1e-6);
  });
});
