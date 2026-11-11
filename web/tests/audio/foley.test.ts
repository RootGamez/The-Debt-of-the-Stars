import { describe, expect, it } from 'vitest';
import {
  createFoley,
  soundOf,
  surfaceOf,
  type FoleyEvent,
  type FoleyFrame,
} from '../../src/audio/foley';
import { STRIDE_RUN, STRIDE_WALK } from '../../src/character/gait';

const WALKING: FoleyFrame = {
  dt: 1 / 60,
  speed: 4,
  grounded: true,
  swimming: false,
  verticalSpeed: 0,
  landings: 0,
  landingSpeed: 0,
  surface: 'rock',
};

/** Avanza `seconds` con ese fotograma y junta lo que sonó. */
function run(
  foley: ReturnType<typeof createFoley>,
  frame: Partial<FoleyFrame>,
  seconds: number,
): FoleyEvent[] {
  const events: FoleyEvent[] = [];
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) events.push(...foley.update({ ...WALKING, ...frame }));
  return events;
}

type StepEvent = Extract<FoleyEvent, { kind: 'step' }>;
type LandEvent = Extract<FoleyEvent, { kind: 'land' }>;
const stepsOf = (events: readonly FoleyEvent[]): StepEvent[] =>
  events.filter((e): e is StepEvent => e.kind === 'step');
const landsOf = (events: readonly FoleyEvent[]): LandEvent[] =>
  events.filter((e): e is LandEvent => e.kind === 'land');

describe('the surface under the feet', () => {
  it('depends on the world', () => {
    expect(surfaceOf('umbral')).toBe('dust');
    expect(surfaceOf('cicatriz')).toBe('rock');
    expect(surfaceOf('taller')).toBe('metal');
    expect(surfaceOf('observatorio')).toBe('glass');
    expect(surfaceOf('hogar')).toBe('soft');
  });

  it('is rock for a world nobody described', () => {
    expect(surfaceOf('desconocido')).toBe('rock');
    expect(surfaceOf(undefined)).toBe('rock');
  });
});

describe('the footsteps', () => {
  it('fall once per half stride walked', () => {
    const foley = createFoley();
    const metres = 13; // 20 pasos de 0,65 m

    const steps = run(foley, { speed: 4 }, metres / 4).filter((e) => e.kind === 'step');

    const halfStride = STRIDE_WALK / 2;
    expect(steps.length).toBeGreaterThanOrEqual(Math.floor(metres / halfStride) - 1);
    expect(steps.length).toBeLessThanOrEqual(Math.ceil(metres / halfStride) + 1);
  });

  it('are longer and louder running than walking', () => {
    const walking = stepsOf(run(createFoley(), { speed: 4 }, 4));
    const running = run(createFoley(), { speed: 6.5 }, 4);
    const runSteps = stepsOf(running);

    // Corriendo se avanza más por paso: en el mismo tiempo, cada paso cubre más metros.
    expect((6.5 * 4) / runSteps.length).toBeGreaterThan((4 * 4) / walking.length);
    expect(runSteps.every((e) => e.run)).toBe(true);
    expect(walking.every((e) => !e.run)).toBe(true);
    expect(STRIDE_RUN).toBeGreaterThan(STRIDE_WALK);
  });

  it('do not sound standing still', () => {
    expect(run(createFoley(), { speed: 0 }, 2)).toEqual([]);
    expect(run(createFoley(), { speed: 0.2 }, 2)).toEqual([]);
  });

  it('do not sound in the air or swimming', () => {
    expect(run(createFoley(), { grounded: false }, 2)).toEqual([]);
    expect(run(createFoley(), { swimming: true }, 2)).toEqual([]);
  });

  it('carry the surface they were taken on', () => {
    const steps = stepsOf(run(createFoley(), { surface: 'dust' }, 2));

    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((e) => e.surface === 'dust')).toBe(true);
  });

  it('start soon after touching the ground again', () => {
    const foley = createFoley();
    run(foley, { grounded: false, verticalSpeed: -3 }, 0.5);

    const events = run(foley, {}, 0.3).filter((e) => e.kind === 'step');

    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});

describe('the jump', () => {
  it('sounds when leaving the ground going up', () => {
    const foley = createFoley();
    run(foley, {}, 0.1);

    const events = run(foley, { grounded: false, verticalSpeed: 4.8 }, 1 / 60);

    expect(events).toEqual([{ kind: 'jump' }]);
  });

  it('does not sound when walking off a ledge', () => {
    const foley = createFoley();
    run(foley, {}, 0.1);

    const events = run(foley, { grounded: false, verticalSpeed: -0.5 }, 1 / 60);

    expect(events).toEqual([]);
  });

  it('does not sound when leaving the water', () => {
    const foley = createFoley();
    run(foley, { swimming: true, grounded: false }, 0.1);

    expect(run(foley, { grounded: false, verticalSpeed: 4 }, 1 / 60)).toEqual([]);
  });
});

describe('the landing', () => {
  it('stays silent on the first frame, with whatever landings were counted before', () => {
    expect(createFoley().update({ ...WALKING, landings: 7, landingSpeed: 9 })).toEqual([]);
  });

  it('sounds once per landing, by how hard it was', () => {
    const cases: [number, string | undefined][] = [
      [1, undefined],
      [3, 'light'],
      [6, 'medium'],
      [11, 'hard'],
    ];
    for (const [speed, severity] of cases) {
      const foley = createFoley();
      run(foley, {}, 0.1);

      const events = run(foley, { landings: 1, landingSpeed: speed, speed: 0 }, 1 / 60);
      const again = run(foley, { landings: 1, landingSpeed: speed, speed: 0 }, 0.5);

      expect(landsOf(events).map((e) => e.severity)).toEqual(severity ? [severity] : []);
      expect(landsOf(again)).toEqual([]);
    }
  });

  it('follows the counter down when the player respawns', () => {
    const foley = createFoley();
    run(foley, { landings: 5 }, 0.1);

    run(foley, { landings: 0 }, 0.1);
    const events = run(foley, { landings: 1, landingSpeed: 6, speed: 0 }, 1 / 60);

    expect(events.some((e) => e.kind === 'land')).toBe(true);
  });
});

describe('what each event plays', () => {
  it('maps a step to the sound of its surface, with a little variation', () => {
    const sound = soundOf({ kind: 'step', surface: 'dust', run: false, speed: 4 });

    expect(sound.id).toBe('step.dust');
    expect(sound.options.pitchJitter).toBeGreaterThan(0);
    expect(sound.options.volumeJitter).toBeGreaterThan(0);
  });

  it('makes running steps louder than walking ones', () => {
    const walk = soundOf({ kind: 'step', surface: 'rock', run: false, speed: 4 });
    const run = soundOf({ kind: 'step', surface: 'rock', run: true, speed: 6.5 });

    expect(run.options.volume ?? 1).toBeGreaterThan(walk.options.volume ?? 1);
  });

  it('maps landings and jumps to their sounds', () => {
    expect(soundOf({ kind: 'land', severity: 'hard', surface: 'rock' }).id).toBe('land.hard');
    expect(soundOf({ kind: 'land', severity: 'light', surface: 'rock' }).id).toBe('land.light');
    expect(soundOf({ kind: 'jump' }).id).toBe('jump');
  });
});
