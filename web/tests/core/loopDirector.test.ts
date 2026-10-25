import { describe, expect, it } from 'vitest';
import { LoopDirector, type DirectorOptions } from '../../src/core/loopDirector';
import { parseChronology } from '../../src/core/timeline';
import { freshSave, type SaveData } from '../../src/core/save';
import { FADE_IN_SECONDS, FADE_OUT_SECONDS, FALL_DEATH_SPEED } from '../../src/data/loop';

const chronology = parseChronology({
  duracion: 100,
  eventos: [
    { id: 'inicio', t: 0, duracion: 1 },
    { id: 'pulso', t: 50, duracion: 2 },
  ],
  absorcion: { umbral: [80, 90] },
  relojes: {},
});

function director(overrides: Partial<DirectorOptions> = {}) {
  const saved: SaveData[] = [];
  const d = new LoopDirector({
    chronology,
    worldId: 'hogar',
    baseRate: 1,
    mode: 'player',
    extraEvents: [],
    save: freshSave(),
    persist: (data) => {
      saved.push(data);
      return true;
    },
    ...overrides,
  });
  return { d, saved };
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
    const { d } = director({ baseRate: 0.5 });

    run(d, 10);

    expect(d.clock.tau).toBeCloseTo(10);
    expect(d.clock.t).toBeCloseTo(20);
  });

  it('follows the clock curve of the world when it has one', () => {
    const curved = parseChronology({
      duracion: 100,
      eventos: [],
      relojes: {
        hogar: [
          [0, 1],
          [100, 0.5],
        ],
      },
    });
    const { d } = director({ chronology: curved });

    run(d, 50);

    expect(d.rate).toBeLessThan(1);
    expect(d.clock.t).toBeGreaterThan(50);
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
