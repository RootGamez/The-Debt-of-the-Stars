import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DIRECTOR, MAESTRA, type HomeVia } from '../../src/game/homecoming';
import { createHomecomingRig } from '../../src/game/homecomingRig';
import type { Ending } from '../../src/game/epilogue';
import { showEndingCard } from '../../src/ui/endingCard';

// La tarjeta es DOM: aquí solo importa qué se enseña y cuándo.
vi.mock('../../src/ui/endingCard', () => ({ showEndingCard: vi.fn() }));
const shown = vi.mocked(showEndingCard);

interface RigOptions {
  canSave?: boolean;
  via?: HomeVia;
  /** Con la escena del Mirador (F3). */
  mirador?: boolean;
}

function rig(ending: Ending, { canSave = true, via, mirador = false }: RigOptions = {}) {
  const calls = {
    freeze: 0,
    seen: [] as string[],
    replay: 0,
    archive: 0,
    mirador: 0,
  };
  const homecoming = createHomecomingRig({
    ending,
    via,
    freeze: () => {
      calls.freeze += 1;
    },
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
    toMirador: mirador
      ? () => {
          calls.mirador += 1;
        }
      : undefined,
  });
  return { homecoming, calls };
}

function lastChoices() {
  return shown.mock.calls.at(-1)?.[1] ?? [];
}

describe('the end of the journey at home', () => {
  beforeEach(() => {
    shown.mockClear();
    shown.mockImplementation(() => ({ remove: () => undefined }) as unknown as HTMLElement);
  });

  it('shows the bad ending at once, saves it as seen and offers to play again or go back', () => {
    const { homecoming, calls } = rig('tarde', { via: 'boca' });

    expect(homecoming.blocking).toBe(false);
    homecoming.play.actions.run(DIRECTOR);

    expect(calls.freeze).toBe(1);
    expect(homecoming.phase).toBe('card');
    expect(homecoming.blocking).toBe(true);
    expect(calls.seen).toEqual(['tarde']);
    expect(shown.mock.calls[0]?.[0].title).toBe('Llegas tarde');
    expect(shown.mock.calls[0]?.[2]).toBeUndefined();
    expect(lastChoices().map((c) => c.label)).toEqual(['Volver a jugar', 'Volver al Archivo']);
    lastChoices()[0]?.run();
    lastChoices()[1]?.run();
    expect(calls.replay).toBe(1);
    expect(calls.archive).toBe(1);
  });

  it('closes the late journey when the collapse scene ends, without anyone to talk to (F5)', () => {
    const { homecoming, calls } = rig('tarde', { via: 'boca' });
    homecoming.finish();
    homecoming.finish();

    expect(calls.freeze).toBe(1);
    expect(homecoming.phase).toBe('card');
    expect(calls.seen).toEqual(['tarde']);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown.mock.calls[0]?.[0].title).toBe('Llegas tarde');
  });

  it('shows the saved-system card when a wrong mouth of the Archive led here', () => {
    const { homecoming } = rig('tarde');
    homecoming.play.actions.run(DIRECTOR);

    expect(shown.mock.calls[0]?.[0].title).toBe('Un sistema que no era el tuyo');
  });

  it('closes the journey while the scene at the nest plays in the good ending (F4)', () => {
    const { homecoming, calls } = rig('A', { mirador: true });

    expect(homecoming.blocking).toBe(false);
    homecoming.begin();
    homecoming.begin();

    expect(homecoming.phase).toBe('scene');
    expect(homecoming.blocking).toBe(true);
    expect(calls.freeze).toBe(1);
    expect(calls.seen).toEqual([]);
    expect(shown).not.toHaveBeenCalled();
  });

  it('goes from the scene to the Lookout of Umbral, saving A first (F3)', () => {
    const { homecoming, calls } = rig('A', { mirador: true });
    homecoming.begin();
    homecoming.finish();

    expect(homecoming.phase).toBe('mirador');
    expect(homecoming.blocking).toBe(true);
    expect(calls.freeze).toBe(1);
    expect(calls.seen).toEqual(['A']);
    expect(calls.mirador).toBe(1);
    expect(shown).not.toHaveBeenCalled(); // la tarjeta sale al final de la escena del Mirador
    homecoming.finish();
    expect(calls.mirador).toBe(1);
  });

  it('shows the good ending here, offering to play again, when there is no Lookout scene', () => {
    const { homecoming, calls } = rig('A');
    homecoming.begin();
    homecoming.finish();

    expect(homecoming.phase).toBe('card');
    expect(calls.seen).toEqual(['A']);
    expect(shown.mock.calls[0]?.[0].title).toBe('Tres días después');
    expect(lastChoices().map((c) => c.label)).toEqual(['Volver a jugar']);
  });

  it('shows the card here when A could not be saved (the scene asks for it)', () => {
    const { homecoming, calls } = rig('A', { mirador: true, canSave: false });
    homecoming.begin();
    homecoming.finish();

    expect(calls.mirador).toBe(0);
    expect(homecoming.phase).toBe('card');
    expect(shown.mock.calls.at(-1)?.[2]).toBe('No se ha podido guardar el final.');
  });

  it('lets talking to the Teacher close the good journey too, if the scene could not play', () => {
    const { homecoming, calls } = rig('A', { mirador: true });
    expect(homecoming.play.actions.verb(MAESTRA, false)).toBe('hablar');
    homecoming.play.actions.run(MAESTRA);

    expect(calls.freeze).toBe(1);
    expect(homecoming.phase).toBe('mirador');
    expect(calls.mirador).toBe(1);
  });

  it('does not begin the scene of the nest when arriving late', () => {
    const { homecoming, calls } = rig('tarde');
    homecoming.begin();

    expect(homecoming.phase).toBe('playing');
    expect(calls.freeze).toBe(0);
  });
});
