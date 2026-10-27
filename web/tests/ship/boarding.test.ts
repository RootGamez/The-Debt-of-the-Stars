import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BOARD_DISTANCE } from '../../src/data/ship';
import { BoardingManager } from '../../src/ship/boarding';

describe('BoardingManager', () => {
  it('starts on foot', () => {
    const manager = new BoardingManager();
    expect(manager.isPiloting).toBe(false);
  });

  describe('boarding', () => {
    it('allows boarding when close to the hatch and ship is landed', () => {
      const manager = new BoardingManager();
      const playerPos = new Vector3(0, 0, 0);
      const hatchPos = new Vector3(BOARD_DISTANCE - 0.5, 0, 0);

      expect(manager.canBoard(playerPos, hatchPos, true)).toBe(true);

      const success = manager.board();
      expect(success).toBe(true);
      expect(manager.isPiloting).toBe(true);
    });

    it('rejects boarding when too far from the hatch', () => {
      const manager = new BoardingManager();
      const playerPos = new Vector3(0, 0, 0);
      const hatchPos = new Vector3(BOARD_DISTANCE + 1.0, 0, 0);

      expect(manager.canBoard(playerPos, hatchPos, true)).toBe(false);
    });

    it('rejects boarding when ship is not landed', () => {
      const manager = new BoardingManager();
      const playerPos = new Vector3(0, 0, 0);
      const hatchPos = new Vector3(1, 0, 0);

      expect(manager.canBoard(playerPos, hatchPos, false)).toBe(false);
    });

    it('does not board twice', () => {
      const manager = new BoardingManager();
      manager.board();
      expect(manager.board()).toBe(false);
    });
  });

  describe('disembarking', () => {
    it('allows disembarking when ship is landed', () => {
      const manager = new BoardingManager();
      manager.board();

      expect(manager.canDisembark(true)).toBe(true);
      const success = manager.disembark();
      expect(success).toBe(true);
      expect(manager.isPiloting).toBe(false);
    });

    it('never lets the pilot out while the ship is not landed, even if it hovers still', () => {
      const manager = new BoardingManager();
      manager.board();

      expect(manager.canDisembark(false)).toBe(false);
    });

    it('rejects disembarking when flying fast', () => {
      const manager = new BoardingManager();
      manager.board();

      expect(manager.canDisembark(false)).toBe(false);
    });

    it('does not disembark if already on foot', () => {
      const manager = new BoardingManager();
      expect(manager.canDisembark(true)).toBe(false);
      expect(manager.disembark()).toBe(false);
    });
  });
});
