import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import type { LoosePose } from '../../src/game/carry';
import { createLooseCarry, type LooseAim, type LooseCarrier } from '../../src/game/looseCarry';

const UP = new Vector3(0, 1, 0);

/** Un puzle de mentira con un objeto en las manos o sueltos en esos sitios. */
function carrier(
  world: string,
  state: { held?: boolean; loose?: { id: string; pose: LoosePose }[] } = {},
) {
  const drop = vi.fn(() => true);
  const take = vi.fn(() => true);
  const value: LooseCarrier = {
    world,
    held: () => state.held ?? false,
    drop,
    loose: () => state.loose ?? [],
    take,
  };
  return { value, drop, take };
}

/** Mira al suelo, desde la altura de los ojos. */
function aim(overrides: Partial<LooseAim> = {}): LooseAim {
  return {
    world: 'umbral',
    origin: new Vector3(0, 1.1, 0),
    direction: new Vector3(0, -0.5, -1).normalize(),
    hit: { point: new Vector3(0, 0, -2), normal: new Vector3(0, 1, 0), distance: 2.3 },
    up: UP,
    ...overrides,
  };
}

const pose = (x: number, y: number, z: number): LoosePose => ({
  position: [x, y, z],
  normal: [0, 1, 0],
});

describe('leaving what you carry', () => {
  it('offers to drop it when looking at a floor in reach', () => {
    const bells = carrier('umbral', { held: true });

    expect(createLooseCarry([bells.value]).verb(aim())).toBe('dejar');
  });

  it('drops it where you look, with the normal of the surface', () => {
    const bells = carrier('umbral', { held: true });

    createLooseCarry([bells.value]).run(aim());

    expect(bells.drop).toHaveBeenCalledWith({ position: [0, 0, -2], normal: [0, 1, 0] });
  });

  it('does not offer it when looking at nothing, too far, too close or at a wall', () => {
    const loose = createLooseCarry([carrier('umbral', { held: true }).value]);
    const hit = (distance: number, normal: Vector3) => ({
      point: new Vector3(0, 0, -2),
      normal,
      distance,
    });

    expect(loose.verb(aim({ hit: undefined }))).toBeUndefined();
    expect(loose.verb(aim({ hit: hit(5, UP) }))).toBeUndefined();
    expect(loose.verb(aim({ hit: hit(0.2, UP) }))).toBeUndefined();
    expect(loose.verb(aim({ hit: hit(2, new Vector3(1, 0, 0)) }))).toBeUndefined();
    expect(loose.verb(aim({ hit: hit(2, new Vector3(0, -1, 0)) }))).toBeUndefined();
  });

  it('accepts a gentle slope', () => {
    const loose = createLooseCarry([carrier('umbral', { held: true }).value]);
    const slope = new Vector3(0, 0.8, 0.6).normalize();
    const hit = { point: new Vector3(0, 0, -2), normal: slope, distance: 2 };

    expect(loose.verb(aim({ hit }))).toBe('dejar');
  });

  it('only drops in the world of the puzzle it belongs to', () => {
    const loose = createLooseCarry([carrier('archivo', { held: true }).value]);

    expect(loose.verb(aim({ world: 'umbral' }))).toBeUndefined();
  });

  it('has nothing to offer with empty hands and nothing near', () => {
    const loose = createLooseCarry([carrier('umbral').value]);

    expect(loose.verb(aim())).toBeUndefined();
    expect(() => {
      loose.run(aim());
    }).not.toThrow();
  });
});

describe('knowing whether there is anything to do', () => {
  it('is active only when something is carried or lying around', () => {
    expect(createLooseCarry([carrier('umbral').value]).active()).toBe(false);
    expect(createLooseCarry([carrier('umbral', { held: true }).value]).active()).toBe(true);
    const lying = carrier('umbral', { loose: [{ id: 'a', pose: pose(0, 0, 0) }] });
    expect(createLooseCarry([lying.value]).active()).toBe(true);
  });
});

describe('picking up what was left', () => {
  const ahead = pose(0, 0.1, -2);

  it('offers to pick up an object you are looking at', () => {
    const bells = carrier('umbral', { loose: [{ id: 'campana_1', pose: ahead }] });

    expect(createLooseCarry([bells.value]).verb(aim())).toBe('coger');
  });

  it('picks up exactly that object', () => {
    const bells = carrier('umbral', { loose: [{ id: 'campana_1', pose: ahead }] });

    createLooseCarry([bells.value]).run(aim());

    expect(bells.take).toHaveBeenCalledWith('campana_1');
  });

  it('chooses the nearest of several along the line of sight', () => {
    const bells = carrier('umbral', {
      loose: [
        { id: 'lejos', pose: pose(0, 0, -3) },
        { id: 'cerca', pose: pose(0, 0.1, -1.5) },
      ],
    });

    createLooseCarry([bells.value]).run(aim());

    expect(bells.take).toHaveBeenCalledWith('cerca');
  });

  it('ignores objects off to the side, behind you or in another world', () => {
    const side = carrier('umbral', { loose: [{ id: 'a', pose: pose(3, 0.1, -2) }] });
    const behind = carrier('umbral', { loose: [{ id: 'b', pose: pose(0, 0.1, 2) }] });
    const other = carrier('archivo', { loose: [{ id: 'c', pose: ahead }] });

    const loose = createLooseCarry([side.value, behind.value, other.value]);

    expect(loose.verb(aim())).toBeUndefined();
  });

  it('cannot pick up with busy hands', () => {
    const holding = carrier('umbral', { held: true });
    const lying = carrier('umbral', { loose: [{ id: 'campana_1', pose: ahead }] });

    createLooseCarry([holding.value, lying.value]).run(aim());

    expect(lying.take).not.toHaveBeenCalled();
    expect(holding.drop).toHaveBeenCalled();
  });
});
