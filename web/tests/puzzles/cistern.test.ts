import { describe, expect, it } from 'vitest';
import { CISTERN, addCargo, isFull, supplyOf, type Cargo } from '../../src/puzzles/cistern';

describe('the cistern of the canyon floor (Archimedes and the displaced water)', () => {
  it('has three marks on the wall and fills to the third with seven parts of stone', () => {
    expect(CISTERN.marks).toEqual([3, 5, 7]);
    expect(CISTERN.full).toBe(7);
  });

  it('raises the water by the parts of each stone, big stones more', () => {
    expect(addCargo(0, 'b1')).toBe(1);
    expect(addCargo(0, 'b2')).toBe(2);
    expect(addCargo(2, 'b3')).toBe(5);
  });

  it('floats the wood: it does not raise the water', () => {
    expect(addCargo(4, 'wood')).toBe(4);
    expect(addCargo(0, 'wood')).toBe(0);
  });

  it('spills over the drain back to the second mark when the water passes the third', () => {
    expect(addCargo(6, 'b3')).toBe(5);
    expect(addCargo(7, 'b1')).toBe(5);
    expect(addCargo(5, 'b3')).toBe(5);
  });

  it('is full at exactly seven parts, however they are made up', () => {
    const fill = (cargo: readonly Cargo[]): number =>
      cargo.reduce((level, c) => addCargo(level, c), 0);

    expect(isFull(fill(['b3', 'b3', 'b1']))).toBe(true);
    expect(isFull(fill(['b2', 'b2', 'b3', 'wood']))).toBe(true);
    expect(isFull(fill(['b3', 'b3', 'b3']))).toBe(false);
    expect(isFull(fill(['b3', 'b3', 'b3', 'b2']))).toBe(true);
    expect(isFull(fill(['wood', 'wood']))).toBe(false);
  });

  it('has enough stones to fill it, and two planks', () => {
    expect(supplyOf('b1')).toBeGreaterThan(0);
    expect(supplyOf('b2') * 2 + supplyOf('b3') * 3 + supplyOf('b1')).toBeGreaterThan(CISTERN.full);
    expect(supplyOf('wood')).toBe(2);
  });
});
