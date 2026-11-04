// El teletransportador del Taller (Fase 11F): el reloj de la Pista se ajusta con dos ruedas y el anillo solo se
// abre con la secuencia de las 7:00 y el reloj en hora.
import { describe, expect, it } from 'vitest';
import {
  createTrackClock,
  TELEPORTER,
  TRACK_ERROR,
  teleporterOpen,
} from '../../src/game/teleporter';

describe('the clock of the Test Track', () => {
  it('starts each loop ahead of the Taller and is set right with the wheels', () => {
    let now = 300;
    const track = createTrackClock(() => now);
    expect(track.read()).toEqual({ taller: 300, track: 300 + TRACK_ERROR, matched: false });

    track.turn('minutes', -3);
    track.turn('seconds', -17);
    expect(track.read()).toMatchObject({ track: 300, matched: true });
    // Ajustado, sigue al Taller mientras pasa el tiempo.
    now = 420;
    expect(track.read()).toEqual({ taller: 420, track: 420, matched: true });
  });

  it('accepts a couple of seconds off, but not more', () => {
    const track = createTrackClock(() => 0, 5);
    track.turn('seconds', -3);
    expect(track.matched).toBe(true);
    track.turn('seconds', -5);
    expect(track.matched).toBe(false);
  });

  it('goes back out of time when the loop starts again', () => {
    const track = createTrackClock(() => 0);
    track.turn('seconds', -TRACK_ERROR);
    expect(track.matched).toBe(true);
    track.reset();
    expect(track.matched).toBe(false);
  });

  it('never shows a time before the start of the loop', () => {
    const track = createTrackClock(() => 10, -60);
    expect(track.read().track).toBe(0);
  });
});

describe('the ring of the track', () => {
  const set = { matched: true };
  const unset = { matched: false };

  it('opens only during the sequence of 7:00 and with the clock set', () => {
    expect(teleporterOpen(TELEPORTER.lock, [TELEPORTER.event], set)).toBe(true);
    expect(teleporterOpen(TELEPORTER.lock, [TELEPORTER.event], unset)).toBe(false);
    expect(teleporterOpen(TELEPORTER.lock, [], set)).toBe(false);
  });

  it('does not open locks it does not know', () => {
    expect(teleporterOpen('otra', [TELEPORTER.event], set)).toBe(false);
  });
});
