import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  WORMHOLE_CINEMATIC,
  cinematicCenter,
  cinematicShipPosition,
  pullFraction,
} from '../../src/game/wormholeCinematic';

const WORLD = new Vector3();
const START = new Vector3(0, 30, 0); // la nave posada en el polo de un mundo de 30 m
const CENTER = new Vector3(70, 48, 0);

describe('the wormhole cinematic', () => {
  it('opens ahead of where you look, above the ground and level with it', () => {
    const center = cinematicCenter(START, new Vector3(1, -0.5, 0), WORLD);

    expect(center.x).toBeCloseTo(WORMHOLE_CINEMATIC.ahead);
    expect(center.y).toBeCloseTo(30 + WORMHOLE_CINEMATIC.above);
    expect(center.z).toBeCloseTo(0);
  });

  it('opens straight above when looking straight down', () => {
    const center = cinematicCenter(START, new Vector3(0, -1, 0), WORLD);

    expect(center.x).toBeCloseTo(0);
    expect(center.y).toBeCloseTo(30 + WORMHOLE_CINEMATIC.above);
  });

  it('lifts the ship off on its own before anything pulls it', () => {
    const resting = cinematicShipPosition(START, CENTER, WORLD, 0, 0);
    const lifted = cinematicShipPosition(START, CENTER, WORLD, WORMHOLE_CINEMATIC.lift, 0.2);

    expect(resting.distanceTo(START)).toBeCloseTo(0);
    expect(lifted.y).toBeCloseTo(30 + WORMHOLE_CINEMATIC.liftHeight);
    expect(lifted.x).toBeCloseTo(0);
  });

  it('drags the whole ship into the ring, faster and faster, by the time the white comes', () => {
    expect(pullFraction(WORMHOLE_CINEMATIC.pullFrom)).toBe(0);
    const early = pullFraction(0.6);
    const late = pullFraction(0.9);
    expect(early).toBeGreaterThan(0);
    expect(late - early).toBeGreaterThan(early);
    const end = cinematicShipPosition(START, CENTER, WORLD, 10, 1);
    expect(end.distanceTo(CENTER)).toBeCloseTo(0);
  });
});
