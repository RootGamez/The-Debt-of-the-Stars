// El reproductor de cinemáticas en el navegador (F3; reutilizable en F4 y F5). Junta el guion puro
// (cinematic/timeline.ts), el reproductor puro (cinematic/playback.ts) y la capa DOM (ui/cinematicLayer.ts):
//  - cada fotograma avanza el tiempo y entrega las señales cruzadas a `onCue` (en orden; al saltar, solo las que
//    dejan algo puesto);
//  - pone la cámara: las claves están en el marco de `frame` (un Object3D del mundo) y «arriba» es su eje Z;
//  - pinta franjas, negro y viñeta con las pistas `bars`, `fade` y `haze` de la escena, y los subtítulos con el signo,
//    el nombre y la voz de letras de quien habla (si está activada en Configuración);
//  - se queda con las teclas mientras dura: Espacio pausa, Intro plano siguiente, Esc dos veces salta (la M sigue
//    silenciando). Cualquier tecla despierta el audio, que tras recargar la página aún no ha tenido un gesto.
// Al acabar llama a `onEnd` una vez y suelta las teclas.
import { Vector3, type Object3D, type PerspectiveCamera } from 'three';
import {
  advancePlayback,
  keyAction,
  startPlayback,
  type PlaybackInput,
  type PlaybackState,
} from '../cinematic/playback';
import {
  cameraAt,
  cuesBetween,
  revealedLetters,
  subtitleAt,
  trackValue,
  type Cinematic,
  type Cue,
} from '../cinematic/timeline';
import { createCinematicLayer, type LayerSubtitle } from '../ui/cinematicLayer';
import { t } from '../i18n';

/** Lo que dura el aviso de las teclas al empezar (s). */
const KEYS_HINT_SECONDS = 7;
/** La voz de letras suena con cada par de letras nuevas. */
const LETTERS_PER_BLIP = 2;

export interface Speaker {
  /** Su nombre (traducido), para quien lee la pantalla con voz. */
  name: string;
  /** El tono de su voz de letras (Hz). */
  voice: number;
}

export interface CinematicAudio {
  running(): boolean;
  muted(): boolean;
  unlock(): void;
  blip(pitch: number): void;
}

export interface CinematicRunnerOptions {
  scene: Cinematic;
  /** El marco de las claves de cámara (se lee su matriz del mundo en cada fotograma). */
  frame: Object3D;
  reducedMotion: boolean;
  /** Segundos en negro antes de empezar. */
  preroll: number;
  speakers: Readonly<Record<string, Speaker>>;
  /** Cómo se anuncia la región (lectores de pantalla). */
  label: string;
  draft: boolean;
  text: { lettersPerSecond(): number; letterSound(): boolean };
  audio: CinematicAudio;
  onCue(cue: Cue): void;
  onEnd(): void;
}

export interface CinematicRunner {
  readonly state: PlaybackState;
  /** Avanza (con el tiempo real) y pinta la capa. */
  update(dt: number): void;
  /** Pone la cámara donde dice la escena. */
  aim(camera: PerspectiveCamera): void;
  /** Para probar: salta a ese momento (en pausa, si se pide). */
  seek(time: number, pause?: boolean): void;
  dispose(): void;
}

export function createCinematicRunner(options: CinematicRunnerOptions): CinematicRunner {
  const { scene } = options;
  let state = startPlayback(options.preroll);
  let ended = false;
  let watched = 0;
  let blipped = 0;
  let blippedLine: string | undefined;
  const queue: PlaybackInput[] = [];
  const layer = createCinematicLayer({
    label: options.label,
    draft: options.draft,
    onPause: () => queue.push({ kind: 'pause' }),
    onNext: () => queue.push({ kind: 'next' }),
    onSkip: () => queue.push({ kind: 'skip' }),
  });
  const controls = new AbortController();

  window.addEventListener(
    'keydown',
    (event) => {
      if (ended) return;
      options.audio.unlock();
      if (event.code === 'KeyM') return; // el silencio sigue funcionando
      event.stopPropagation();
      // Con el foco en uno de sus botones, Intro y Espacio pulsan ese botón.
      if (event.target instanceof HTMLButtonElement && event.target.closest('.cine')) return;
      const action = keyAction(event.code);
      if (!action) return;
      event.preventDefault();
      if (!event.repeat) queue.push({ kind: action });
    },
    { capture: true, signal: controls.signal },
  );

  function apply(input: PlaybackInput): void {
    const step = advancePlayback(scene, state, input);
    state = step.state;
    for (const cue of step.cues) options.onCue(cue);
  }

  function subtitle(time: number): LayerSubtitle | undefined {
    const now = subtitleAt(scene, time);
    if (!now) return undefined;
    const { line, alpha } = now;
    const speaker = options.speakers[line.speaker];
    const shown = revealedLetters(line, time, options.text.lettersPerSecond());
    if (line.text !== blippedLine) {
      blippedLine = line.text;
      blipped = 0;
    }
    if (shown - blipped >= LETTERS_PER_BLIP) {
      blipped = shown;
      if (options.text.letterSound() && speaker) options.audio.blip(speaker.voice);
    }
    return { speaker: line.speaker, name: speaker?.name ?? '', text: line.text, shown, alpha };
  }

  function hint(): string | undefined {
    if (state.armed > 0) return t('Esc otra vez para saltar la escena');
    if (state.paused) return t('Escena en pausa');
    if (watched < KEYS_HINT_SECONDS) return t('Espacio pausa · Intro plano siguiente · Esc saltar');
    if (!options.audio.running() && !options.audio.muted())
      return t('Pulsa una tecla para oír la escena');
    return undefined;
  }

  function finish(): void {
    if (ended || !state.done) return;
    ended = true;
    controls.abort();
    layer.end();
    options.onEnd();
  }

  const at = new Vector3();
  const target = new Vector3();
  const up = new Vector3();
  const forward = new Vector3();

  return {
    get state() {
      return state;
    },
    update(dt) {
      for (const input of queue.splice(0)) apply(input);
      apply({ kind: 'tick', dt });
      if (!state.paused && state.time >= 0) watched += Math.max(0, dt);
      const time = state.time;
      layer.render({
        bars: trackValue(scene, 'bars', time, 1),
        fade: time < 0 ? 1 : trackValue(scene, 'fade', time, 0),
        haze: trackValue(scene, 'haze', time, 0),
        subtitle: ended ? undefined : subtitle(time),
        hint: ended ? undefined : hint(),
        paused: state.paused,
      });
      finish();
    },
    aim(camera) {
      const pose = cameraAt(scene, Math.max(0, state.time), options.reducedMotion);
      options.frame.updateWorldMatrix(true, false);
      const matrix = options.frame.matrixWorld;
      at.set(...pose.pos).applyMatrix4(matrix);
      target.set(...pose.look).applyMatrix4(matrix);
      up.setFromMatrixColumn(matrix, 2).normalize();
      forward.subVectors(target, at).normalize();
      if (pose.roll !== 0) up.applyAxisAngle(forward, pose.roll);
      camera.position.copy(at);
      camera.up.copy(up);
      camera.lookAt(target);
      camera.up.set(0, 1, 0);
      if (Math.abs(camera.fov - pose.fov) > 1e-3) {
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
      }
    },
    seek(time, pause = true) {
      if (ended) return;
      const to = Math.min(Math.max(time, 0), scene.duration);
      const cues = cuesBetween(scene, Math.min(state.time, to), to, true);
      state = { ...state, time: to, paused: pause, armed: 0, done: to >= scene.duration };
      for (const cue of cues) options.onCue(cue);
      watched = KEYS_HINT_SECONDS;
    },
    dispose() {
      controls.abort();
      layer.dispose();
    },
  };
}
