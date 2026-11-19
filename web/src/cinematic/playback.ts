// El reproductor de una cinemática (puro): el tiempo, la pausa y los saltos. Cada entrada (un fotograma, una tecla o
// un botón) da un estado nuevo y las señales que hay que aplicar. Espacio pausa y sigue; Intro salta al plano
// siguiente; Esc pide confirmación («Esc otra vez para saltar») y, si se repite a tiempo, salta al final.
import { cuesBetween, nextShotStart, type Cinematic, type Cue } from './timeline';

/** Un fotograma no avanza más que esto (un tirón o volver de otra pestaña no se come la escena). */
export const MAX_STEP = 0.1;
/** Lo que dura el aviso de Esc: dentro de ese tiempo, otro Esc salta. */
export const ARM_SECONDS = 3;

export interface PlaybackState {
  /** Segundos de la cinemática; negativo durante la espera inicial. */
  readonly time: number;
  readonly paused: boolean;
  readonly done: boolean;
  /** Segundos que le quedan al aviso de Esc (0 = sin aviso). */
  readonly armed: number;
}

export type PlaybackInput =
  | { readonly kind: 'tick'; readonly dt: number }
  | { readonly kind: 'pause' }
  | { readonly kind: 'next' }
  | { readonly kind: 'escape' }
  | { readonly kind: 'skip' };

export interface PlaybackStep {
  readonly state: PlaybackState;
  /** Las señales que se han cruzado en este paso, en orden. */
  readonly cues: readonly Cue[];
}

/** @param preroll segundos en negro antes de empezar (la página acaba de cargar). */
export function startPlayback(preroll = 0): PlaybackState {
  return { time: preroll > 0 ? -preroll : 0, paused: false, done: false, armed: 0 };
}

function jump(scene: Cinematic, state: PlaybackState, to: number): PlaybackStep {
  const time = Math.min(to, scene.duration);
  const done = time >= scene.duration;
  return {
    state: { ...state, time, done, armed: 0, paused: done ? false : state.paused },
    cues: cuesBetween(scene, state.time, time, true),
  };
}

function tick(scene: Cinematic, state: PlaybackState, dt: number): PlaybackStep {
  const step = Math.min(Math.max(dt, 0), MAX_STEP);
  const armed = Math.max(0, state.armed - step);
  if (state.paused) return { state: { ...state, armed }, cues: [] };
  const time = Math.min(state.time + step, scene.duration);
  return {
    state: { ...state, time, armed, done: time >= scene.duration },
    cues: cuesBetween(scene, state.time, time),
  };
}

export function advancePlayback(
  scene: Cinematic,
  state: PlaybackState,
  input: PlaybackInput,
): PlaybackStep {
  if (state.done) return { state, cues: [] };
  switch (input.kind) {
    case 'tick':
      return tick(scene, state, input.dt);
    case 'pause':
      return { state: { ...state, paused: !state.paused }, cues: [] };
    case 'next':
      return jump(scene, state, nextShotStart(scene, Math.max(state.time, 0)));
    case 'escape':
      return state.armed > 0
        ? jump(scene, state, scene.duration)
        : { state: { ...state, armed: ARM_SECONDS }, cues: [] };
    case 'skip':
      return jump(scene, state, scene.duration);
  }
}

export type KeyAction = 'pause' | 'next' | 'escape';

/** Qué hace cada tecla en una cinemática (`KeyboardEvent.code`); undefined, ninguna de las suyas. */
export function keyAction(code: string): KeyAction | undefined {
  switch (code) {
    case 'Space':
      return 'pause';
    case 'Enter':
    case 'NumpadEnter':
      return 'next';
    case 'Escape':
      return 'escape';
    default:
      return undefined;
  }
}
