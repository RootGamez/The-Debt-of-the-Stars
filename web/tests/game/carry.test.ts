import { describe, expect, it } from 'vitest';
import {
  looseAccess,
  type CarryState,
  dropHeld,
  looseObjects,
  loosePoseOf,
  takeLoose,
  carryWhere,
  createCarry,
  heldBy,
  placeHeld,
  resetCarry,
  takeFromRack,
  takeObject,
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

  it('takes one chosen object from its rack, and only with free hands', () => {
    const state = createCarry(things);
    const chosen = takeObject(state, 'b');

    expect(heldBy(chosen)).toBe('b');
    expect(takeObject(chosen, 'c')).toBe(chosen);
    expect(takeObject(state, 'z')).toBe(state);
    expect(takeObject(placeHeld(chosen, 's1'), 'b')).toEqual(placeHeld(chosen, 's1'));
  });
});

describe('leaving an object anywhere', () => {
  const pose = { position: [1.5, -2.25, 0.125], normal: [0, 0, 1] } as const;

  it('drops what the hands carry at a place, leaving the hands free', () => {
    const held = takeFromRack(createCarry(things));
    const id = heldBy(held) ?? '';

    const dropped = dropHeld(held, pose);

    expect(heldBy(dropped)).toBeUndefined();
    expect(looseObjects(dropped)).toEqual([{ id, pose }]);
  });

  it('does nothing when the hands are empty', () => {
    const state = createCarry(things);

    expect(dropHeld(state, pose)).toBe(state);
  });

  it('remembers where each one was left, to the millimetre', () => {
    const held = takeFromRack(createCarry(things));
    const dropped = dropHeld(held, { position: [0.12345678, 2, -3], normal: [0, 0.6, 0.8] });

    expect(looseObjects(dropped)[0]?.pose.position[0]).toBeCloseTo(0.123, 3);
    expect(looseObjects(dropped)[0]?.pose.normal).toEqual([0, 0.6, 0.8]);
  });

  it('picks it up again with free hands, from wherever it is', () => {
    const dropped = dropHeld(takeFromRack(createCarry(things)), pose);
    const id = looseObjects(dropped)[0]?.id ?? '';

    const again = takeLoose(dropped, id);

    expect(heldBy(again)).toBe(id);
    expect(looseObjects(again)).toEqual([]);
  });

  it('cannot pick one up with busy hands, nor something that is not loose', () => {
    const dropped = dropHeld(takeFromRack(createCarry(things)), pose);
    const id = looseObjects(dropped)[0]?.id ?? '';
    const busy = takeFromRack(dropped);

    expect(takeLoose(busy, id)).toBe(busy);
    expect(takeLoose(dropped, 'not-here')).toBe(dropped);
    expect(takeLoose(createCarry(things), 'a')).toEqual(createCarry(things));
  });

  it('keeps a loose object out of the rack, the hands and the slots', () => {
    const dropped = dropHeld(takeFromRack(createCarry(things)), pose);

    expect(takeFromRack(takeFromRack(dropped))).not.toBe(dropped);
    expect(placedAt(dropped, 'slot')).toBeUndefined();
    expect(heldBy(dropped)).toBeUndefined();
  });

  it('brings everything back to the rack with a new cycle', () => {
    const dropped = dropHeld(takeFromRack(createCarry(things)), pose);

    expect(looseObjects(resetCarry(dropped))).toEqual([]);
    expect(things.map((id) => carryWhere(resetCarry(dropped), id))).toEqual([
      'rack',
      'rack',
      'rack',
    ]);
  });

  it('reads a place back, and refuses what is not one', () => {
    expect(loosePoseOf('rack')).toBeUndefined();
    expect(loosePoseOf('loose:1,2')).toBeUndefined();
    expect(loosePoseOf('loose:a,b,c,d,e,f')).toBeUndefined();
    expect(loosePoseOf(undefined)).toBeUndefined();
    expect(loosePoseOf('loose:1,2,3,0,0,1')).toEqual({ position: [1, 2, 3], normal: [0, 0, 1] });
  });
});

describe('the loose access of a puzzle', () => {
  function puzzle() {
    let state: CarryState = createCarry(things);
    return {
      access: looseAccess(
        () => state,
        (next) => {
          state = next;
        },
      ),
      peek: () => state,
      take: () => {
        state = takeFromRack(state);
      },
    };
  }
  const pose = { position: [0, 0, 0], normal: [0, 0, 1] } as const;

  it('drops and picks up through the puzzle state', () => {
    const p = puzzle();
    p.take();
    expect(p.access.held()).toBe(true);

    expect(p.access.drop(pose)).toBe(true);
    expect(p.access.held()).toBe(false);
    const [first] = p.access.loose();
    expect(first?.id).toBe('a');

    expect(p.access.take('a')).toBe(true);
    expect(p.access.held()).toBe(true);
  });

  it('says no when there is nothing to do', () => {
    const p = puzzle();

    expect(p.access.drop(pose)).toBe(false);
    expect(p.access.take('a')).toBe(false);
    expect(p.access.loose()).toEqual([]);
  });
});
