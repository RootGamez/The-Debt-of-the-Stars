import { describe, expect, it } from 'vitest';
import {
  createMusicDirector,
  type MusicChoice,
  type MusicFrame,
} from '../../src/audio/musicDirector';

const BASE: MusicFrame = {
  dt: 1,
  worldId: 'umbral',
  events: [],
  phase: 'playing',
  playing: true,
};

function run(
  director: ReturnType<typeof createMusicDirector>,
  frame: Partial<MusicFrame>,
  seconds: number,
): MusicChoice {
  let choice: MusicChoice = { id: undefined };
  for (let i = 0; i < seconds; i++) choice = director.update({ ...BASE, ...frame, dt: 1 });
  return choice;
}

describe('the music director', () => {
  it('lets the world breathe in silence at the start, then plays its piece', () => {
    const d = createMusicDirector();

    expect(run(d, {}, 1).id).toBeUndefined();
    expect(run(d, {}, 80).id).toBe('music.umbral');
  });

  it('plays for a while and then falls silent, again and again', () => {
    const d = createMusicDirector();
    const seen = new Set<string | undefined>();
    for (let i = 0; i < 600; i++) seen.add(d.update(BASE).id);

    expect(seen.has('music.umbral')).toBe(true);
    expect(seen.has(undefined)).toBe(true);
  });

  it('has a piece for every world and none in open space', () => {
    for (const [world, id] of [
      ['archivo', 'music.archivo'],
      ['taller', 'music.taller'],
      ['cicatriz', 'music.cicatriz'],
    ] as const) {
      expect(run(createMusicDirector(), { worldId: world }, 100).id).toBe(id);
    }
    expect(run(createMusicDirector(), { worldId: 'hogar' }, 100).id).toBe('music.main');
    expect(run(createMusicDirector(), { worldId: 'observatorio' }, 100).id).toBe('music.archivo');
    expect(run(createMusicDirector(), { worldId: 'laboratorio' }, 100).id).toBe('music.umbral');
    expect(run(createMusicDirector(), { worldId: 'puertas' }, 100).id).toBe('music.archivo');
    expect(run(createMusicDirector(), { worldId: 'anclaje_sur' }, 100).id).toBe('music.cicatriz');
    expect(run(createMusicDirector(), { worldId: undefined }, 300).id).toBeUndefined();
  });

  it('puts on the red sky layer for as long as the event lasts, without silences', () => {
    const d = createMusicDirector();

    const choice = run(d, { events: ['cielo_rojo'] }, 400);

    expect(choice.id).toBe('music.cielo_rojo');
  });

  it('gives way to the black hole above everything else', () => {
    const d = createMusicDirector();

    expect(run(d, { events: ['cielo_rojo', 'agujero_negro'] }, 5).id).toBe('music.agujero_negro');
  });

  it('is silent while dying or waking, and does not advance while paused', () => {
    const d = createMusicDirector();
    expect(run(d, { phase: 'dying', events: ['cielo_rojo'] }, 5).id).toBeUndefined();
    expect(run(d, { phase: 'waking' }, 5).id).toBeUndefined();

    const paused = createMusicDirector();
    run(paused, { playing: false }, 500);
    expect(run(paused, {}, 1).id).toBeUndefined();
  });

  it('fades slowly in and out', () => {
    const d = createMusicDirector();
    run(d, { events: ['cielo_rojo'] }, 1);

    expect(d.update({ ...BASE, events: ['cielo_rojo'] }).fade).toBeGreaterThanOrEqual(3);
  });
});
