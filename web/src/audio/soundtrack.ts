// Une el audio con el navegador: crea el contexto en el primer gesto del jugador (los navegadores no dejan
// sonar antes), silencia con la tecla M, detiene el sonido con la pestaña oculta y entrega cada fotograma
// la mezcla al motor. Lo cubren las pruebas de Playwright (e2e/audio.spec.ts).
import { browserStore } from '../core/save';
import { createAudioEngine, type AudioEngine } from './engine';
import { computeMix, type Mix, type MixInput } from './mix';
import { loadMuted, saveMuted } from './mutePreference';
import type { LoopHandle, LoopOptions, PlayOptions } from './samplePlayer';
import type { VolumePreferences } from './volumePreferences';

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export interface Soundtrack {
  readonly muted: boolean;
  /**
   * Para la depuración y las pruebas: si suena, qué voces hay y la última mezcla (volumen general y el de cada
   * voz), que se calcula aunque el audio aún no haya arrancado.
   */
  snapshot(): {
    muted: boolean;
    running: boolean;
    voices: string[];
    master: number;
    levels: Record<string, number>;
  };
  update(input: Omit<MixInput, 'muted'>): void;
  /** La voz de letras de un texto que se escribe (no suena en silencio). */
  blip(frequency: number): void;
  /** El toque de una campana (no suena en silencio). */
  chime(frequency: number): void;
  /** Un sample puntual; false si está en silencio o no está cargado (quien llama usa el sintético). */
  play(id: string, options?: PlayOptions): boolean;
  /** Un bucle de sample; `undefined` en silencio o si no está cargado. */
  loop(id: string, options?: LoopOptions): LoopHandle | undefined;
  /** Pide cargar esos sonidos (los de un mundo al entrar en él). */
  preload(ids: readonly string[]): Promise<void>;
  /** Volumen de efectos, ambientes y música (Configuración). */
  setVolumes(volumes: Readonly<VolumePreferences>): void;
  /** Pide una pieza de música en bucle (empieza cuando pueda: tras el primer gesto y la carga). */
  playMusic(id: string, options?: { level?: number; fade?: number }): void;
  stopMusic(fade?: number): void;
  dispose(): void;
}

export function createSoundtrack(engine: AudioEngine = createAudioEngine()): Soundtrack {
  const store = browserStore();
  let muted = loadMuted(store);
  let last: Mix | undefined;
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
      return {
        muted,
        running: engine.running,
        voices: engine.voiceIds,
        master: last?.master ?? 0,
        levels: Object.fromEntries((last?.voices ?? []).map((voice) => [voice.id, voice.level])),
      };
    },
    update(input) {
      last = computeMix({ ...input, muted });
      engine.update(last);
    },
    blip(frequency) {
      if (!muted) engine.blip(frequency);
    },
    chime(frequency) {
      if (!muted) engine.chime(frequency);
    },
    play(id, options) {
      return muted ? false : engine.play(id, options);
    },
    loop(id, options) {
      return muted ? undefined : engine.loop(id, options);
    },
    preload: (ids) => engine.preload(ids),
    setVolumes: (volumes) => {
      engine.setVolumes(volumes);
    },
    playMusic: (id, options) => {
      engine.playMusic(id, options);
    },
    stopMusic: (fade) => {
      engine.stopMusic(fade);
    },
    dispose() {
      abort.abort();
      engine.dispose();
    },
  };
}
