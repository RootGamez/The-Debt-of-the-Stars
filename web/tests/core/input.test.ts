import { describe, expect, it } from 'vitest';
import {
  applyKey,
  EMPTY_KEYS,
  intentFromKeys,
  intentFromStick,
  mergeIntents,
} from '../../src/core/input';

describe('applyKey', () => {
  it('maps WASD and arrows to movement actions', () => {
    const keys = applyKey(applyKey(EMPTY_KEYS, 'KeyW', true), 'ArrowLeft', true);

    expect(keys.forward).toBe(true);
    expect(keys.left).toBe(true);
  });

  it('maps Space to jump and Shift to run', () => {
    const keys = applyKey(applyKey(EMPTY_KEYS, 'Space', true), 'ShiftLeft', true);

    expect(keys.jump).toBe(true);
    expect(keys.run).toBe(true);
  });

  it('returns a new state and leaves the previous one untouched', () => {
    const next = applyKey(EMPTY_KEYS, 'KeyD', true);

    expect(next).not.toBe(EMPTY_KEYS);
    expect(EMPTY_KEYS.right).toBe(false);
  });

  it('ignores keys without a binding', () => {
    expect(applyKey(EMPTY_KEYS, 'KeyP', true)).toBe(EMPTY_KEYS);
  });
});

describe('intentFromKeys', () => {
  it('moves forward with W', () => {
    const intent = intentFromKeys({ ...EMPTY_KEYS, forward: true });

    expect(intent).toMatchObject({ x: 0, z: 1, run: false, jump: false });
  });

  it('normalizes diagonals so they are not faster', () => {
    const intent = intentFromKeys({ ...EMPTY_KEYS, forward: true, right: true });

    expect(Math.hypot(intent.x, intent.z)).toBeCloseTo(1);
  });

  it('cancels opposite keys', () => {
    const intent = intentFromKeys({ ...EMPTY_KEYS, forward: true, back: true });

    expect(intent.z).toBe(0);
  });
});

describe('intentFromStick', () => {
  it('ignores small movements inside the dead zone', () => {
    expect(intentFromStick(0.05, 0.05, 0.15)).toEqual({ x: 0, z: 0 });
  });

  it('rescales so the edge of the dead zone starts at zero and the rim reaches one', () => {
    const halfway = intentFromStick(0.575, 0, 0.15); // (0,575 - 0,15) / 0,85 = 0,5
    const rim = intentFromStick(0, 1, 0.15); // y positiva en pantalla = hacia atrás

    expect(halfway.x).toBeCloseTo(0.5);
    expect(rim.z).toBeCloseTo(-1);
  });

  it('turns screen up (negative y) into forward', () => {
    expect(intentFromStick(0, -1, 0.15).z).toBeCloseTo(1);
  });

  it('clamps beyond the rim', () => {
    const intent = intentFromStick(3, 4, 0.15);

    expect(Math.hypot(intent.x, intent.z)).toBeCloseTo(1);
  });
});

describe('mergeIntents', () => {
  it('combines keyboard and touch and clamps the length to one', () => {
    const merged = mergeIntents(
      { x: 0, z: 1, run: false, jump: false },
      { x: 1, z: 0, run: false, jump: true },
    );

    expect(Math.hypot(merged.x, merged.z)).toBeCloseTo(1);
    expect(merged.jump).toBe(true);
  });
});
