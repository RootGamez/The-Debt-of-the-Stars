import { describe, expect, it } from 'vitest';
import { LoopDirector, type DirectorOptions, type Locale } from '../../src/core/loopDirector';
import { parseChronology } from '../../src/core/timeline';
import { freshSave, type SaveData } from '../../src/core/save';
import { FADE_IN_SECONDS, FADE_OUT_SECONDS, FALL_DEATH_SPEED } from '../../src/data/loop';

const chronology = parseChronology({
  duracion: 100,
  eventos: [
    { id: 'inicio', t: 0, duracion: 1 },
    { id: 'pulso', t: 50, duracion: 2 },
    { id: 'ranura', t: 20, duracion: 10, mundo: 'archivo' },
  ],
  absorcion: { umbral: [80, 90] },
  relojes: {},
});

/** Opciones del director más el lugar donde está el jugador, que los tests pueden cambiar sobre la marcha. */
function director(overrides: Partial<DirectorOptions> & Partial<Locale> = {}) {
  const { worldId, rate, engulfed, ...options } = overrides;
  // `worldId: undefined` es el espacio abierto: no se puede sustituir por el valor por defecto.
  const place: Locale = {
    worldId: 'worldId' in overrides ? worldId : 'hogar',
    rate: rate ?? 1,
    engulfed: engulfed ?? false,
  };
  const saved: SaveData[] = [];
  const d = new LoopDirector({
    chronology,
    locate: () => place,
    mode: 'player',
    extraEvents: [],
    save: freshSave(),
    persist: (data) => {
      saved.push(data);
      return true;
    },
    ...options,
  });
  return { d, saved, place };
}

const QUIET = { landings: 0, lastLandingSpeed: 0 };

/** Avanza en pasos de 0,1 s y junta los ids de los eventos que empiezan. */
function run(d: LoopDirector, seconds: number, landing = QUIET) {
  const started: string[] = [];
  let restarts = 0;
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    const update = d.update(0.1, landing);
    started.push(...update.changes.filter((c) => c.kind === 'start').map((c) => c.event.id));
    if (update.restart) restarts++;
  }
  return { started, restarts };
}

describe('LoopDirector while playing', () => {
  it('advances the loop clock and reports the events that start', () => {
    const { d } = director();

    const { started } = run(d, 60);

    expect(d.phase).toBe('playing');
    expect(d.clock.t).toBeCloseTo(60);
    expect(started).toEqual(['inicio', 'pulso']);
  });

  it('runs the outside clock faster on a slow world (mode B)', () => {
    const { d } = director({ rate: 0.5 });

    run(d, 10);

    expect(d.clock.tau).toBeCloseTo(10);
    expect(d.clock.t).toBeCloseTo(20);
  });

  it('follows the rate of the place as it changes', () => {
    const { d, place } = director({ rate: 1 });
    run(d, 10);

    place.rate = 0.5;
    run(d, 10);

    expect(d.rate).toBe(0.5);
    expect(d.clock.tau).toBeCloseTo(20);
    expect(d.clock.t).toBeCloseTo(30);
  });
});

describe('dying', () => {
  it('dies when the loop ends on a world that is never absorbed', () => {
    const { d } = director();

    run(d, 100.1);

    expect(d.phase).toBe('dying');
    expect(d.deathCause).toBe('fin');
  });

  it('is absorbed at the end of the absorption window of its world', () => {
    const { d } = director({ worldId: 'umbral' });

    run(d, 85);
    expect(d.phase).toBe('playing');
    expect(d.absorption).toBeCloseTo(0.5, 1);
    run(d, 5.1);

    expect(d.phase).toBe('dying');
    expect(d.deathCause).toBe('absorcion');
  });

  it('dies after a hard landing but not after a soft one', () => {
    const soft = director().d;
    const hard = director().d;

    soft.update(0.1, { landings: 1, lastLandingSpeed: FALL_DEATH_SPEED - 5 });
    hard.update(0.1, { landings: 1, lastLandingSpeed: FALL_DEATH_SPEED + 5 });

    expect(soft.phase).toBe('playing');
    expect(hard.phase).toBe('dying');
    expect(hard.deathCause).toBe('caida');
  });

  it('reads each landing only once', () => {
    const { d } = director();
    d.update(0.1, { landings: 1, lastLandingSpeed: 5 });

    d.update(0.1, { landings: 1, lastLandingSpeed: 5 });

    expect(d.phase).toBe('playing');
  });

  it('freezes the loop clock while fading out', () => {
    const { d } = director();
    run(d, 100.1);
    const t = d.clock.t;

    d.update(FADE_OUT_SECONDS / 2, QUIET);

    expect(d.clock.t).toBe(t);
    expect(d.fade).toEqual({ color: 'white', amount: expect.closeTo(0.5, 1) as number });
  });
});

describe('waking up again', () => {
  it('restarts once after the fade, saves one more loop and starts the clock from zero', () => {
    const { d, saved } = director();
    run(d, 100.1);

    const { restarts } = run(d, FADE_OUT_SECONDS + 0.1);

    expect(restarts).toBe(1);
    expect(saved.at(-1)?.loopsCompleted).toBe(1);
    expect(d.loopsCompleted).toBe(1);
    expect(d.clock.t).toBeLessThan(0.5);
    expect(d.phase).toBe('waking');
  });

  it('fades in from black and then plays again, with the events starting over', () => {
    const { d } = director();
    run(d, 100.1);

    const fading = run(d, FADE_OUT_SECONDS + 0.1); // el reinicio ocurre dentro de este tramo
    const waking = run(d, FADE_IN_SECONDS + 1);

    expect(d.phase).toBe('playing');
    expect([...fading.started, ...waking.started]).toEqual(['inicio']);
  });

  it('keeps playing even when the progress cannot be saved', () => {
    const { d } = director({ persist: () => false });
    run(d, 100.1);

    run(d, FADE_OUT_SECONDS + FADE_IN_SECONDS + 0.5);

    expect(d.phase).toBe('playing');
    expect(d.loopsCompleted).toBe(1);
  });
});

describe('debug time skips', () => {
  it('reports the events skipped when jumping forward', () => {
    const { d } = director();

    const changes = d.skip(55);

    expect(changes.map((c) => c.event.id)).toContain('pulso');
    expect(d.clock.t).toBeCloseTo(55);
  });

  it('never goes before the start of the loop', () => {
    const { d } = director();
    d.skip(10);

    d.skip(-60);

    expect(d.clock.t).toBe(0);
  });
});

describe('active events', () => {
  it('lists the events happening now, including the extra ones of the world', () => {
    const { d } = director({ extraEvents: [{ id: 'trig', t: 49, duration: 5, world: 'hogar' }] });

    d.skip(51);

    expect(
      d
        .active()
        .map((e) => e.id)
        .sort(),
    ).toEqual(['pulso', 'trig']);
  });
});

describe('landings while not playing (review fixes)', () => {
  it('does not kill the player on resume for a landing that happened during the pause', () => {
    const { d } = director();
    d.observe({ landings: 1, lastLandingSpeed: FALL_DEATH_SPEED + 5 }); // en pausa

    d.update(0.1, { landings: 1, lastLandingSpeed: FALL_DEATH_SPEED + 5 });

    expect(d.phase).toBe('playing');
  });

  it('re-syncs when the landing counter goes down after a respawn and still detects the next fall', () => {
    const { d } = director();
    d.update(0.1, { landings: 3, lastLandingSpeed: 2 });
    d.observe({ landings: 0, lastLandingSpeed: 0 }); // el jugador reapareció

    d.update(0.1, { landings: 1, lastLandingSpeed: FALL_DEATH_SPEED + 1 });

    expect(d.deathCause).toBe('caida');
  });

  it('can die from a fall while waking up', () => {
    const { d } = director();
    run(d, 100.1);
    run(d, FADE_OUT_SECONDS + 0.1);
    expect(d.phase).toBe('waking');

    d.update(0.1, { landings: 1, lastLandingSpeed: FALL_DEATH_SPEED + 1 });

    expect(d.phase).toBe('dying');
  });

  it('ignores landings while already dying', () => {
    const { d } = director();
    run(d, 100.1);

    d.update(0.1, { landings: 1, lastLandingSpeed: FALL_DEATH_SPEED + 1 });

    expect(d.deathCause).toBe('fin');
  });
});

describe('director details (review fixes)', () => {
  it('uses the reference mode when asked (A: loop clock on real time)', () => {
    const { d } = director({ rate: 0.5, mode: 'reference' });

    run(d, 10);

    expect(d.clock.t).toBeCloseTo(10);
    expect(d.clock.tau).toBeCloseTo(5);
  });

  it('reports the same clamped rate it applies', () => {
    const { d } = director({ rate: 0 });

    expect(d.rate).toBeGreaterThan(0);
  });

  it('does nothing when skipping time while dying', () => {
    const { d } = director();
    run(d, 100.1);
    const t = d.clock.t;

    expect(d.skip(30)).toEqual([]);
    expect(d.clock.t).toBe(t);
  });

  it('remembers when the progress could not be saved', () => {
    const { d } = director({ persist: () => false });
    expect(d.saveFailed).toBe(false);

    run(d, 100.1);
    run(d, FADE_OUT_SECONDS + 0.1);

    expect(d.saveFailed).toBe(true);
  });

  it('remembers the last events that started, for the debug panel and the tests', () => {
    const { d } = director();

    run(d, 60);

    expect(d.recentEvents).toEqual(['inicio', 'pulso']);
  });
});

describe('following the player from place to place (Phase 5)', () => {
  it('reports the events of the world where the player is and not the others', () => {
    const elsewhere = director({ worldId: 'hogar' });
    const there = director({ worldId: 'archivo' });

    expect(run(elsewhere.d, 40).started).not.toContain('ranura');
    expect(run(there.d, 40).started).toContain('ranura');
  });

  it('reports no world event in open space', () => {
    const { d } = director({ worldId: undefined });

    expect(run(d, 40).started).not.toContain('ranura');
    expect(d.active().map((e) => e.id)).not.toContain('ranura');
  });

  it('does not lose or repeat events when changing world in the middle of a run', () => {
    const { d, place } = director({ worldId: 'hogar' });
    const started: string[] = [];

    started.push(...run(d, 10).started);
    place.worldId = 'archivo';
    started.push(...run(d, 15).started); // la ranura empieza en 20 s: la ve
    place.worldId = 'hogar';
    started.push(...run(d, 5).started);
    place.worldId = 'archivo';
    started.push(...run(d, 5).started); // ya empezó: no se repite

    expect(started.filter((id) => id === 'ranura')).toHaveLength(1);
    expect(started.filter((id) => id === 'inicio')).toHaveLength(1);
  });

  it('shows an event that is already under way when arriving at its world', () => {
    const { d, place } = director({ worldId: 'hogar' });
    run(d, 25);

    expect(d.active().map((e) => e.id)).not.toContain('ranura');
    place.worldId = 'archivo';

    expect(d.active().map((e) => e.id)).toContain('ranura');
  });

  it('is absorbed only when the world it is on is absorbed', () => {
    const safe = director({ worldId: 'hogar' });
    const doomed = director({ worldId: 'umbral' });
    safe.d.skip(85);
    doomed.d.skip(85);

    run(safe.d, 6);
    run(doomed.d, 6);

    expect(safe.d.phase).toBe('playing');
    expect(doomed.d.deathCause).toBe('absorcion');
  });

  it('escapes the absorption of a world by leaving it in time', () => {
    const { d, place } = director({ worldId: 'umbral' });
    d.skip(85);
    run(d, 2);

    place.worldId = undefined;
    run(d, 8);

    expect(d.phase).toBe('playing');
  });

  it('is absorbed in open space when the front reaches the player', () => {
    const { d, place } = director({ worldId: undefined });
    d.skip(60);
    run(d, 1);
    expect(d.phase).toBe('playing');
    expect(d.absorption).toBe(0);

    place.engulfed = true;
    run(d, 0.2);

    expect(d.absorption).toBe(1);
    expect(d.phase).toBe('dying');
    expect(d.deathCause).toBe('absorcion');
  });

  it('ignores the front while the player is inside the influence of a world', () => {
    const { d } = director({ worldId: 'hogar', engulfed: true });

    run(d, 5);

    expect(d.phase).toBe('playing');
  });
});
