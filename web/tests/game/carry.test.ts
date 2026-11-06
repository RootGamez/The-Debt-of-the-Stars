import { describe, expect, it } from 'vitest';
import {
  carryWhere,
  createCarry,
  heldBy,
  placeHeld,
  resetCarry,
  takeFromRack,
  takeFromSlot,
  placedAt,
} from '../../src/game/carry';

const things = ['a', 'b', 'c'];

describe('carrying and fitting objects', () => {
  it('starts with every object on its rack and empty hands', () => {
    const state = createCarry(things);

    expect(heldBy(state)).toBeUndefined();
    expect(things.map((id) => carryWhere(state, id))).toEqual(['rack', 'rack', 'rack']);
  });

  it('takes the next object from the rack, one at a time', () => {
    const first = takeFromRack(createCarry(things));
    const again = takeFromRack(first);

    expect(heldBy(first)).toBe('a');
    expect(again).toBe(first);
  });

  it('puts the held object in an empty slot and frees the hands', () => {
    const state = placeHeld(takeFromRack(createCarry(things)), 'mark-4');

    expect(heldBy(state)).toBeUndefined();
    expect(carryWhere(state, 'a')).toBe('mark-4');
    expect(placedAt(state, 'mark-4')).toBe('a');
  });

  it('does not put anything in an occupied slot, nor without holding something', () => {
    const empty = createCarry(things);
    const one = placeHeld(takeFromRack(empty), 'mark-4');
    const two = takeFromRack(one);

    expect(placeHeld(empty, 'mark-4')).toBe(empty);
    expect(placeHeld(two, 'mark-4')).toBe(two);
  });

  it('refuses a slot that does not accept what is held', () => {
    const held = takeFromRack(createCarry(things));

    expect(placeHeld(held, 'mark-4', () => false)).toBe(held);
    expect(heldBy(placeHeld(held, 'mark-4', (_slot, id) => id === 'a'))).toBeUndefined();
  });

  it('takes a placed object back, only with free hands', () => {
    const placed = placeHeld(takeFromRack(createCarry(things)), 'mark-4');
    const back = takeFromSlot(placed, 'mark-4');
    const busy = takeFromRack(placed);

    expect(heldBy(back)).toBe('a');
    expect(placedAt(back, 'mark-4')).toBeUndefined();
    expect(takeFromSlot(busy, 'mark-4')).toBe(busy);
    expect(takeFromSlot(createCarry(things), 'mark-9')).toEqual(createCarry(things));
  });

  it('puts everything back on its rack at the start of a cycle', () => {
    const state = placeHeld(
      takeFromRack(takeFromSlot(placeHeld(takeFromRack(createCarry(things)), 's1'), 's1')),
      's2',
    );

    expect(resetCarry(state)).toEqual(createCarry(things));
  });
});
