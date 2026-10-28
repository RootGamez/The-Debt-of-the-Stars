// Une el audio con el navegador: crea el contexto en el primer gesto del jugador (los navegadores no dejan
// sonar antes), silencia con la tecla M, detiene el sonido con la pestaña oculta y entrega cada fotograma
// la mezcla al motor. Lo cubren las pruebas de Playwright (e2e/audio.spec.ts).
import { browserStore } from '../core/save';
import { createAudioEngine, type AudioEngine } from './engine';
import { computeMix, type MixInput } from './mix';
import { loadMuted, saveMuted } from './mutePreference';

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export interface Soundtrack {
  readonly muted: boolean;
  /** Para la depuración y las pruebas: si suena y qué voces hay. */
  snapshot(): { muted: boolean; running: boolean; voices: string[] };
  update(input: Omit<MixInput, 'muted'>): void;
  dispose(): void;
}

export function createSoundtrack(engine: AudioEngine = createAudioEngine()): Soundtrack {
  const store = browserStore();
  let muted = loadMuted(store);
  const abort = new AbortController();
  const { signal } = abort;

  // La M silencia o devuelve el sonido; cuenta como gesto, así que también despierta el audio.
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.code !== 'KeyM' || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      muted = !muted;
      saveMuted(store, muted);
    },
    { signal },
  );
  for (const type of UNLOCK_EVENTS) {
    window.addEventListener(
      type,
      () => {
        engine.unlock();
      },
      { signal, passive: true },
    );
  }
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) engine.suspend();
      else engine.resume();
    },
    { signal },
  );

  return {
    get muted() {
      return muted;
    },
    snapshot() {
      return { muted, running: engine.running, voices: engine.voiceIds };
    },
    update(input) {
      engine.update(computeMix({ ...input, muted }));
    },
    dispose() {
      abort.abort();
      engine.dispose();
    },
  };
}
