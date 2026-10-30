import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  insideRadius,
  nearestInteractable,
  promptLabel,
  type Interactable,
} from '../../src/registry/interaction';

const eye = new Vector3(0, 0, 0);
const forward = new Vector3(0, 0, -1);

function at(id: string, x: number, y: number, z: number): Interactable {
  return { id, position: new Vector3(x, y, z) };
}

describe('nearestInteractable', () => {
  it('returns a source that is close and in front of you', () => {
    expect(nearestInteractable(eye, forward, [at('a', 0, 0, -2)])?.id).toBe('a');
  });

  it('ignores sources that are too far away', () => {
    expect(nearestInteractable(eye, forward, [at('a', 0, 0, -2.6)])).toBeUndefined();
  });

  it('ignores sources behind you', () => {
    expect(nearestInteractable(eye, forward, [at('a', 0, 0, 2)])).toBeUndefined();
  });

  it('accepts sources inside the view angle and rejects those outside it', () => {
    const inside = at(
      'in',
      Math.sin((30 * Math.PI) / 180) * 2,
      0,
      -Math.cos((30 * Math.PI) / 180) * 2,
    );
    const outside = at(
      'out',
      Math.sin((40 * Math.PI) / 180) * 2,
      0,
      -Math.cos((40 * Math.PI) / 180) * 2,
    );

    expect(nearestInteractable(eye, forward, [inside])?.id).toBe('in');
    expect(nearestInteractable(eye, forward, [outside])).toBeUndefined();
  });

  it('chooses the closest one when several are in view', () => {
    const picked = nearestInteractable(eye, forward, [at('far', 0, 0, -2.4), at('near', 0, 0, -1)]);

    expect(picked?.id).toBe('near');
  });

  it('counts a source exactly at the eyes as reachable', () => {
    expect(nearestInteractable(eye, forward, [at('here', 0, 0, 0)])?.id).toBe('here');
  });

  it('works whatever the orientation of the player is (a small planet has no fixed "up")', () => {
    const lookingUp = new Vector3(0, 1, 0);

    expect(nearestInteractable(eye, lookingUp, [at('a', 0, 2, 0)])?.id).toBe('a');
    expect(nearestInteractable(eye, lookingUp, [at('b', 0, 0, -2)])).toBeUndefined();
  });

  it('accepts a forward vector that is not exactly unit length', () => {
    expect(nearestInteractable(eye, new Vector3(0, 0, -5), [at('a', 0, 0, -2)])?.id).toBe('a');
  });

  it('returns nothing for an empty list and does not modify its inputs', () => {
    const position = eye.clone();
    const direction = forward.clone();

    expect(nearestInteractable(position, direction, [])).toBeUndefined();
    expect(position.equals(eye)).toBe(true);
    expect(direction.equals(forward)).toBe(true);
  });

  it('honours custom range and angle', () => {
    const far = at('a', 0, 0, -5);

    expect(nearestInteractable(eye, forward, [far], { range: 6 })?.id).toBe('a');
    expect(
      nearestInteractable(eye, forward, [at('b', 2, 0, -2)], { range: 3, halfAngleDegrees: 60 })
        ?.id,
    ).toBe('b');
  });
});

describe('insideRadius', () => {
  it('is true within the radius and false beyond it', () => {
    expect(insideRadius(new Vector3(0, 0, 0), new Vector3(3, 0, 4), 5)).toBe(true);
    expect(insideRadius(new Vector3(0, 0, 0), new Vector3(3, 0, 4.1), 5)).toBe(false);
  });
});

describe('promptLabel', () => {
  it.each([
    ['texto', 'leer'],
    ['grabacion', 'escuchar'],
    ['objeto', 'examinar'],
    ['observacion', 'examinar'],
    ['charla', 'hablar'],
  ] as const)('uses the right verb for %s', (kind, verb) => {
    expect(promptLabel(kind, false)).toBe(`E · ${verb}`);
    expect(promptLabel(kind, true)).toBe(verb.charAt(0).toUpperCase() + verb.slice(1));
  });
});
