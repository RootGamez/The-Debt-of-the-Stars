import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SYSTEM_FRAME, toSystemPosition, toSystemVelocity } from '../../src/system/frames';
import { bodyPose } from '../../src/system/orbits';
import { reframe, type MovingState } from '../../src/system/reframe';
import type { BodySpec } from '../../src/system/systemData';

/** Como Taller: órbita rápida y giro propio (el caso más exigente). */
const taller: BodySpec = {
  world: 'taller',
  orbitRadius: 500,
  period: 180,
  phase: 0.4,
  spin: 90,
  spinPhase: 0.2,
};
const archivo: BodySpec = {
  world: 'archivo',
  orbitRadius: 1350,
  period: 799,
  phase: 4.1,
  spin: 'locked',
  spinPhase: 1.9,
};
const T = 37;

function moving(): MovingState {
  return {
    position: new Vector3(20, 60, -10),
    velocity: new Vector3(3, -1, 4),
    orientation: new Quaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), 0.7),
    angularVelocity: new Vector3(0.1, -0.3, 0.05),
  };
}

function copy(state: MovingState): MovingState {
  return {
    position: state.position.clone(),
    velocity: state.velocity.clone(),
    orientation: state.orientation.clone(),
    angularVelocity: state.angularVelocity.clone(),
  };
}

describe('reframe', () => {
  it('comes back exactly after going to another world and back', () => {
    const state = moving();
    const before = copy(state);
    const a = bodyPose(taller, T);
    const b = bodyPose(archivo, T);

    reframe(state, a, b);
    reframe(state, b, a);

    expect(state.position.distanceTo(before.position)).toBeLessThan(1e-6);
    expect(state.velocity.distanceTo(before.velocity)).toBeLessThan(1e-9);
    expect(state.orientation.angleTo(before.orientation)).toBeLessThan(1e-6);
    expect(state.angularVelocity.distanceTo(before.angularVelocity)).toBeLessThan(1e-9);
  });

  it('keeps the real position and velocity: only the point of view changes', () => {
    const state = moving();
    const a = bodyPose(taller, T);
    const position = toSystemPosition(a, state.position, new Vector3());
    const velocity = toSystemVelocity(a, state.position, state.velocity, new Vector3());

    reframe(state, a, SYSTEM_FRAME);

    expect(state.position.distanceTo(position)).toBeLessThan(1e-9);
    expect(state.velocity.distanceTo(velocity)).toBeLessThan(1e-9);
  });

  it('gives something resting on a spinning world the spin of that world, seen from space', () => {
    const state: MovingState = {
      position: new Vector3(0, 46, 0),
      velocity: new Vector3(),
      orientation: new Quaternion(),
      angularVelocity: new Vector3(),
    };
    const a = bodyPose(taller, T);

    reframe(state, a, SYSTEM_FRAME);

    const spinInSystem = state.angularVelocity.clone().applyQuaternion(state.orientation);
    expect(spinInSystem.y).toBeCloseTo((2 * Math.PI) / 90, 9);
    expect(state.velocity.length()).toBeGreaterThan(a.velocity.length() * 0.5);
  });

  it('does nothing between a frame and itself', () => {
    const state = moving();
    const before = copy(state);
    const a = bodyPose(archivo, T);

    reframe(state, a, a);

    expect(state.position.distanceTo(before.position)).toBeLessThan(1e-9);
    expect(state.angularVelocity.distanceTo(before.angularVelocity)).toBeLessThan(1e-12);
  });
});
