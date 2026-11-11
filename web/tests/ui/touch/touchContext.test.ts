// Qué botones táctiles hay a la vista según lo que pasa en el juego: aparecen solo cuando hacen falta.
import { describe, expect, it } from 'vitest';
import {
  LANDING_ALTITUDE,
  resolveTouchActions,
  type TouchContext,
} from '../../../src/ui/touch/touchContext';

const WALKING: TouchContext = {
  playing: true,
  piloting: false,
  landed: false,
  altitude: undefined,
  stabilize: true,
  station: undefined,
  swimming: false,
};

const ids = (context: Partial<TouchContext>): string[] =>
  [...resolveTouchActions({ ...WALKING, ...context }).visible].sort();

describe('on foot', () => {
  it('shows only Jump', () => {
    expect(ids({})).toEqual(['jump']);
  });

  it('swaps Jump for Up and Down while swimming', () => {
    expect(ids({ swimming: true })).toEqual(['swimDown', 'swimUp']);
  });

  it('adds the station button only in front of a station of the ship', () => {
    expect(ids({ station: 'asiento' })).toEqual(['jump', 'station']);
    expect(ids({ station: 'registro' })).toEqual(['jump', 'station']);
    expect(ids({ station: 'mapa' })).toEqual(['jump', 'station']);
    expect(resolveTouchActions({ ...WALKING, station: 'mapa' }).stationKind).toBe('mapa');
  });

  it('never shows ship controls', () => {
    const shown = ids({ station: 'asiento' });
    for (const id of ['stand', 'raise', 'lower', 'brake', 'target', 'stabilize', 'camera']) {
      expect(shown).not.toContain(id);
    }
  });
});

describe('piloting a landed ship', () => {
  const landed: Partial<TouchContext> = { piloting: true, landed: true, altitude: 0 };

  it('offers to stand up and take off, and the flight tools', () => {
    expect(ids(landed)).toEqual(['camera', 'raise', 'stabilize', 'stand', 'target']);
  });

  it('has no Down, Brake, Jump or station button', () => {
    const shown = ids({ ...landed, station: 'asiento', swimming: true });
    for (const id of ['lower', 'brake', 'jump', 'station', 'swimUp']) {
      expect(shown).not.toContain(id);
    }
  });
});

describe('piloting in flight', () => {
  const flying: Partial<TouchContext> = { piloting: true, landed: false, altitude: 400 };

  it('offers Up, Down, Brake and the flight tools, but not Stand up', () => {
    expect(ids(flying)).toEqual(['brake', 'camera', 'lower', 'raise', 'stabilize', 'target']);
  });

  it('adds the roll buttons only without the stabilizer', () => {
    expect(ids({ ...flying, stabilize: false })).toEqual([
      'brake',
      'camera',
      'lower',
      'raise',
      'rollLeft',
      'rollRight',
      'stabilize',
      'target',
    ]);
  });

  it('turns Down into Land near the ground', () => {
    expect(resolveTouchActions({ ...WALKING, ...flying, altitude: 400 }).landing).toBe(false);
    expect(
      resolveTouchActions({ ...WALKING, ...flying, altitude: LANDING_ALTITUDE - 1 }).landing,
    ).toBe(true);
    expect(resolveTouchActions({ ...WALKING, ...flying, altitude: LANDING_ALTITUDE }).landing).toBe(
      false,
    );
  });

  it('does not offer to land in open space', () => {
    expect(resolveTouchActions({ ...WALKING, ...flying, altitude: undefined }).landing).toBe(false);
  });

  it('never offers to land when not flying', () => {
    expect(resolveTouchActions({ ...WALKING, altitude: 3 }).landing).toBe(false);
    expect(
      resolveTouchActions({ ...WALKING, piloting: true, landed: true, altitude: 0 }).landing,
    ).toBe(false);
  });
});

describe('when the game is not being played', () => {
  it('shows nothing (pause, reading, panels, cutscenes)', () => {
    expect(ids({ playing: false })).toEqual([]);
    expect(ids({ playing: false, piloting: true, station: 'asiento', swimming: true })).toEqual([]);
  });
});
