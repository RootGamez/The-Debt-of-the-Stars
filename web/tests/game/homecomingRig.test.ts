import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DIRECTOR } from '../../src/game/homecoming';
import { createHomecomingRig, TURN_SECONDS } from '../../src/game/homecomingRig';
import type { Ending } from '../../src/game/epilogue';
import { showEndingCard } from '../../src/ui/endingCard';

// La tarjeta es DOM: aquí solo importa qué se enseña y cuándo.
vi.mock('../../src/ui/endingCard', () => ({ showEndingCard: vi.fn() }));
const shown = vi.mocked(showEndingCard);

function rig(ending: Ending, { reducedMotion = false, canSave = true } = {}) {
  const calls = {
    freeze: 0,
    outside: 0,
    turns: [] as number[],
    seen: [] as string[],
    replay: 0,
    archive: 0,
  };
  const homecoming = createHomecomingRig({
    ending,
    freeze: () => {
      calls.freeze += 1;
    },
    stepOutside: () => {
      calls.outside += 1;
    },
    turnToMoon: (share) => {
      calls.turns.push(share);
    },
    reducedMotion,
    markSeen: (seen) => {
      calls.seen.push(seen);
      return canSave;
    },
    replay: () => {
      calls.replay += 1;
    },
    backToArchive: () => {
      calls.archive += 1;
    },
  });
  return { homecoming, calls };
}

function lastChoices() {
  return shown.mock.calls.at(-1)?.[1] ?? [];
}

describe('the end of the journey at home', () => {
  beforeEach(() => {
    shown.mockClear();
  });

  it('shows ending B at once, saves it as seen and offers to play again', () => {
    const { homecoming, calls } = rig('B');

    expect(homecoming.blocking).toBe(false);
    homecoming.play.actions.run(DIRECTOR);

    expect(calls.freeze).toBe(1);
    expect(homecoming.phase).toBe('card');
    expect(homecoming.blocking).toBe(true);
    expect(calls.seen).toEqual(['B']);
    expect(calls.outside).toBe(0);
    expect(shown.mock.calls[0]?.[0].title).toBe('Final B');
    expect(shown.mock.calls[0]?.[2]).toBeUndefined();
    expect(lastChoices().map((c) => c.label)).toEqual(['Volver a jugar']);
    lastChoices()[0]?.run();
    expect(calls.replay).toBe(1);
  });

  it('turns the view toward the Moon before ending A', () => {
    const { homecoming, calls } = rig('A');
    homecoming.play.actions.run(DIRECTOR);

    expect(homecoming.phase).toBe('turning');
    expect(calls.outside).toBe(1);
    expect(shown).not.toHaveBeenCalled();
    homecoming.update(0); // en pausa no se gira
    expect(calls.turns).toHaveLength(0);
    for (let t = 0; t < TURN_SECONDS - 0.5; t += 0.5) homecoming.update(0.5);
    expect(calls.turns.length).toBeGreaterThan(0);
    expect(calls.turns.every((share) => share > 0 && share <= 1)).toBe(true);
    expect(shown).not.toHaveBeenCalled();
    homecoming.update(0.5);

    expect(homecoming.phase).toBe('card');
    expect(calls.seen).toEqual(['A']);
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('turns at once with reduced motion', () => {
    const { homecoming, calls } = rig('A', { reducedMotion: true });
    homecoming.play.actions.run(DIRECTOR);
    homecoming.update(0.5);

    expect(calls.turns).toEqual([1]);
  });

  it('says so on the card when the ending could not be saved', () => {
    const { homecoming } = rig('B', { canSave: false });
    homecoming.play.actions.run(DIRECTOR);

    expect(shown.mock.calls[0]?.[2]).toBe('No se ha podido guardar el final.');
  });

  it('arriving late is not an ending: nothing is saved and the card leads back to the Archive', () => {
    const { homecoming, calls } = rig('tarde');
    homecoming.play.actions.run(DIRECTOR);

    expect(calls.seen).toEqual([]);
    expect(lastChoices().map((c) => c.label)).toEqual(['Volver al Archivo']);
    lastChoices()[0]?.run();
    expect(calls.archive).toBe(1);
  });
});
