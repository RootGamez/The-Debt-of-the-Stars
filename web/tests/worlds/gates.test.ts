import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  EXIT_DISTANCE,
  findCrossing,
  gateArrival,
  GATE_HALF_WIDTH,
  GATE_HEIGHT,
  type Gate,
} from '../../src/worlds/gates';

// La boca en la cáscara (arriba +Y, mira hacia +Z) y su gemela por dentro (arriba -Y, mira hacia +X).
const outside: Gate = {
  name: 'PASO_Boca',
  position: new Vector3(0, 25, 0),
  up: new Vector3(0, 1, 0),
  forward: new Vector3(0, 0, 1),
  target: 'PASO_Dentro',
};
const inside: Gate = {
  name: 'PASO_Dentro',
  position: new Vector3(0, -21, 0),
  up: new Vector3(0, 1, 0),
  forward: new Vector3(1, 0, 0),
  target: 'PASO_Boca',
};
const gates = [outside, inside];

const at = (x: number, y: number, z: number) => new Vector3(x, y, z);

describe('crossing a folded gate', () => {
  it('happens when the feet go through the ring from one side to the other', () => {
    expect(findCrossing(at(0, 25, -0.4), at(0, 25, 0.4), gates)).toBe(outside);
  });

  it('lets you walk through a ring that is closed (the teleporter of the Taller out of its moment)', () => {
    expect(
      findCrossing(at(0, 25, -0.4), at(0, 25, 0.4), gates, (g) => g !== outside),
    ).toBeUndefined();
  });

  it('works in both directions', () => {
    expect(findCrossing(at(0, 25, 0.4), at(0, 25, -0.4), gates)).toBe(outside);
  });

  it('does not happen walking past the side of the ring', () => {
    const wide = GATE_HALF_WIDTH + 0.5;

    expect(findCrossing(at(wide, 25, -0.4), at(wide, 25, 0.4), gates)).toBeUndefined();
  });

  it('does not happen jumping over the ring', () => {
    const over = 25 + GATE_HEIGHT + 0.5;

    expect(findCrossing(at(0, over, -0.4), at(0, over, 0.4), gates)).toBeUndefined();
  });

  it('does not happen standing still or walking along the ring plane', () => {
    expect(findCrossing(at(0, 25, 0.3), at(0, 25, 0.3), gates)).toBeUndefined();
    expect(findCrossing(at(-0.5, 25, 0.3), at(0.5, 25, 0.3), gates)).toBeUndefined();
  });

  it('is not skipped by a fast step', () => {
    expect(findCrossing(at(0, 25, -3), at(0, 25, 3), gates)).toBe(outside);
  });

  it('ignores a step that started far behind the ring and ended far beyond (a teleport)', () => {
    expect(findCrossing(at(0, 25, -40), at(0, 25, 40), gates)).toBeUndefined();
  });
});

describe('arriving through the twin gate', () => {
  it('leaves you in front of the twin, standing on its floor and facing away from it', () => {
    const arrival = gateArrival(inside);

    expect(arrival.feet.x).toBeCloseTo(EXIT_DISTANCE);
    expect(EXIT_DISTANCE).toBeGreaterThan(GATE_HALF_WIDTH * 2);
    expect(arrival.feet.y).toBeCloseTo(-21);
    expect(arrival.forward.toArray()).toEqual([1, 0, 0]);
    expect(arrival.up.toArray()).toEqual([0, 1, 0]);
  });

  it('does not count the arrival itself as a new crossing', () => {
    const arrival = gateArrival(inside);

    expect(
      findCrossing(arrival.feet, arrival.feet.clone().addScaledVector(arrival.forward, 0.3), gates),
    ).toBeUndefined();
  });

  it('does not share vectors with the gate (moving the player cannot move the gate)', () => {
    const arrival = gateArrival(inside);
    arrival.feet.set(9, 9, 9);

    expect(inside.position.toArray()).toEqual([0, -21, 0]);
  });
});
