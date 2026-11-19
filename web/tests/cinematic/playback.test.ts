import { describe, expect, it } from 'vitest';
import {
  ARM_SECONDS,
  advancePlayback,
  keyAction,
  MAX_STEP,
  startPlayback,
  type PlaybackState,
} from '../../src/cinematic/playback';
import type { Cinematic } from '../../src/cinematic/timeline';

const scene: Cinematic = {
  id: 'prueba',
  duration: 10,
  fov: 50,
  shots: [
    { id: 'a', start: 0, end: 4, keys: [{ t: 0, pos: [0, 0, 0], look: [0, 1, 0] }] },
    { id: 'b', start: 4, end: 10, keys: [{ t: 0, pos: [0, 0, 0], look: [0, 1, 0] }] },
  ],
  lines: [],
  cues: [
    { at: 1, id: 'sonido' },
    { at: 2, id: 'musica', persistent: true },
    { at: 6, id: 'gesto' },
    { at: 10, id: 'fin', persistent: true },
  ],
  tracks: {},
};

function run(state: PlaybackState, seconds: number) {
  let current = state;
  const fired: string[] = [];
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 0.05) {
    const step = advancePlayback(scene, current, { kind: 'tick', dt: 0.05 });
    current = step.state;
    fired.push(...step.cues.map((cue) => cue.id));
  }
  return { state: current, fired };
}

describe('reproducción', () => {
  it('empieza antes de cero (la espera en negro) y avanza con el reloj', () => {
    const start = startPlayback(1.5);
    expect(start.time).toBe(-1.5);
    const { state, fired } = run(start, 3.5);
    expect(state.time).toBeCloseTo(2);
    expect(fired).toEqual(['sonido', 'musica']);
  });

  it('un tirón largo de fotograma no se come la escena', () => {
    const step = advancePlayback(scene, startPlayback(), { kind: 'tick', dt: 5 });
    expect(step.state.time).toBeCloseTo(MAX_STEP);
    expect(advancePlayback(scene, startPlayback(), { kind: 'tick', dt: -1 }).state.time).toBe(0);
  });

  it('acaba al llegar al final y dispara la última señal', () => {
    const { state, fired } = run(startPlayback(), 10.2);
    expect(state.done).toBe(true);
    expect(state.time).toBe(10);
    expect(fired.at(-1)).toBe('fin');
  });

  it('Espacio pausa y sigue: en pausa no corre el tiempo', () => {
    const paused = advancePlayback(scene, startPlayback(), { kind: 'pause' }).state;
    expect(paused.paused).toBe(true);
    expect(run(paused, 1).state.time).toBe(0);
    expect(advancePlayback(scene, paused, { kind: 'pause' }).state.paused).toBe(false);
  });

  it('Intro salta al plano siguiente y solo aplica lo que deja algo puesto', () => {
    const step = advancePlayback(scene, startPlayback(1), { kind: 'next' });
    expect(step.state.time).toBe(4);
    expect(step.cues.map((cue) => cue.id)).toEqual(['musica']);
    const last = advancePlayback(scene, step.state, { kind: 'next' });
    expect(last.state.done).toBe(true);
    expect(last.cues.map((cue) => cue.id)).toEqual(['fin']);
  });

  it('Esc pide confirmar; otra vez antes de que se pase, salta al final', () => {
    const armed = advancePlayback(scene, startPlayback(), { kind: 'escape' }).state;
    expect(armed.armed).toBe(ARM_SECONDS);
    expect(armed.done).toBe(false);
    const skipped = advancePlayback(scene, armed, { kind: 'escape' });
    expect(skipped.state.done).toBe(true);
    expect(skipped.cues.map((cue) => cue.id)).toEqual(['musica', 'fin']);
  });

  it('el aviso de Esc caduca solo, incluso en pausa', () => {
    let state = advancePlayback(scene, startPlayback(), { kind: 'pause' }).state;
    state = advancePlayback(scene, state, { kind: 'escape' }).state;
    state = run(state, ARM_SECONDS + 0.2).state;
    expect(state.armed).toBe(0);
    expect(advancePlayback(scene, state, { kind: 'escape' }).state.done).toBe(false);
  });

  it('el botón de saltar no pide confirmación; acabada, nada la mueve', () => {
    const done = advancePlayback(scene, startPlayback(), { kind: 'skip' }).state;
    expect(done.done).toBe(true);
    for (const kind of ['pause', 'next', 'escape', 'skip'] as const) {
      const step = advancePlayback(scene, done, { kind });
      expect(step.state).toEqual(done);
      expect(step.cues).toEqual([]);
    }
  });
});

describe('teclas', () => {
  it('Espacio, Intro y Esc; lo demás no es de la cinemática', () => {
    expect(keyAction('Space')).toBe('pause');
    expect(keyAction('Enter')).toBe('next');
    expect(keyAction('NumpadEnter')).toBe('next');
    expect(keyAction('Escape')).toBe('escape');
    expect(keyAction('KeyM')).toBeUndefined();
    expect(keyAction('KeyW')).toBeUndefined();
  });
});
