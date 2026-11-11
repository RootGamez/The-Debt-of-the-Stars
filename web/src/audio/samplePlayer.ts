// Reproduce los samples del banco: efectos puntuales (con variante al azar, un poco de variación de tono y de
// volumen, y posición en el estéreo) y bucles cuyo volumen y velocidad sigue el juego. Cada categoría tiene un
// límite de voces a la vez (sfxLogic.ts). Si el sonido no está cargado, no hace nada y lo dice: quien llama
// puede usar el sonido sintético de siempre.
import type { SampleBank } from './sampleBank';
import { createVoiceLimiter, pickVariant, spread } from './sfxLogic';

export interface PlayOptions {
  /** Multiplica la ganancia propia del sonido (por defecto 1). */
  volume?: number;
  /** Velocidad de reproducción (1 = la natural; también cambia el tono). */
  rate?: number;
  /** Posición en el estéreo, de −1 (izquierda) a 1 (derecha). */
  pan?: number;
  /** Variación aleatoria del tono, como fracción (0,05 = ±5 %). */
  pitchJitter?: number;
  /** Variación aleatoria del volumen, como fracción. */
  volumeJitter?: number;
}

export interface LoopOptions {
  /** Volumen con que arranca (por defecto 1); 0 la deja callada pero viva. */
  level?: number;
  rate?: number;
}

export interface LoopHandle {
  /** Cambia el volumen poco a poco (constante de tiempo en segundos). */
  setLevel(level: number, smooth?: number): void;
  setRate(rate: number, smooth?: number): void;
  /** La apaga en `fade` segundos y la detiene; llamarla otra vez no hace nada. */
  stop(fade?: number): void;
}

export interface SamplePlayer {
  /** Suena una variante del sonido; false si no está cargado. */
  play(id: string, options?: PlayOptions): boolean;
  /** Arranca un bucle; `undefined` si el sonido no está cargado. */
  loop(id: string, options?: LoopOptions): LoopHandle | undefined;
  /** Pide al banco que cargue estos sonidos. */
  preload(ids: readonly string[]): Promise<void>;
  /** Apaga todos los bucles que sigan sonando (al cambiar de mundo o cerrar el motor). */
  stopAll(): void;
}

export interface SamplePlayerOptions {
  context: AudioContext;
  bank: SampleBank;
  /** Adónde va todo el sonido (el bus de efectos del motor). */
  destination: AudioNode;
  random?: () => number;
}

/** Voces a la vez por categoría; las demás usan `DEFAULT_LIMIT`. */
const CATEGORY_LIMITS: Readonly<Record<string, number>> = { foley: 6, ship: 8, cosmos: 4, ui: 4 };
const DEFAULT_LIMIT = 6;
/** Fundido corto al cortar un efecto para que no haga clic. */
const CUT_FADE = 0.03;
const LOOP_FADE = 0.3;
const LOOP_SMOOTH = 0.15;

const MAX_GAIN = 4;
const MIN_RATE = 0.1;
const MAX_RATE = 4;

/** `value` si es un número de verdad (Web Audio lanza con NaN o infinito); si no, `fallback`. */
const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function createSamplePlayer(options: SamplePlayerOptions): SamplePlayer {
  const { context, bank, destination } = options;
  const random = options.random ?? Math.random;
  const limiter = createVoiceLimiter(CATEGORY_LIMITS, DEFAULT_LIMIT);
  const lastVariant = new Map<string, number>();
  /** Bucles en marcha: si quien los arrancó pierde su manejador, `stopAll` aún los para. */
  const loops = new Set<LoopHandle>();

  /** Fuente → (panorámica) → ganancia → destino. */
  function chain(buffer: AudioBuffer, gain: number, rate: number, pan?: number) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const level = context.createGain();
    level.gain.value = gain;
    source.connect(level);
    if (pan === undefined) {
      level.connect(destination);
    } else {
      const panner = context.createStereoPanner();
      panner.pan.value = clamp(finite(pan, 0), -1, 1);
      level.connect(panner);
      panner.connect(destination);
    }
    return { source, level };
  }

  return {
    play(id, play = {}) {
      const entry = bank.entry(id);
      const buffers = bank.buffers(id);
      if (!entry || !buffers) return false;
      const variant = pickVariant(buffers.length, lastVariant.get(id), random);
      const buffer = buffers[variant];
      if (!buffer) return false;
      lastVariant.set(id, variant);

      const volume = finite(play.volume ?? 1, 1);
      const gain = clamp(
        spread(entry.gain * volume, finite(play.volumeJitter ?? 0, 0), random),
        0,
        MAX_GAIN,
      );
      const rate = clamp(
        spread(finite(play.rate ?? 1, 1), finite(play.pitchJitter ?? 0, 0), random),
        MIN_RATE,
        MAX_RATE,
      );
      const { source, level } = chain(buffer, gain, rate, play.pan);
      const release = limiter.add(entry.category, () => {
        const now = context.currentTime;
        level.gain.setTargetAtTime(0, now, CUT_FADE / 3);
        source.stop(now + CUT_FADE * 2);
      });
      source.onended = release;
      source.start();
      return true;
    },

    loop(id, loop = {}) {
      const entry = bank.entry(id);
      const buffer = bank.buffers(id)?.[0];
      if (!entry || !buffer) return undefined;
      const start = clamp(entry.gain * finite(loop.level ?? 1, 1), 0, MAX_GAIN);
      const { source, level } = chain(
        buffer,
        start,
        clamp(finite(loop.rate ?? 1, 1), MIN_RATE, MAX_RATE),
      );
      source.loop = true;
      source.start();
      let stopped = false;
      const handle: LoopHandle = {
        setLevel(value, smooth = LOOP_SMOOTH) {
          if (stopped) return;
          const target = clamp(finite(value, 0) * entry.gain, 0, MAX_GAIN);
          level.gain.setTargetAtTime(target, context.currentTime, smooth);
        },
        setRate(value, smooth = LOOP_SMOOTH) {
          if (stopped) return;
          const target = clamp(finite(value, 1), MIN_RATE, MAX_RATE);
          source.playbackRate.setTargetAtTime(target, context.currentTime, smooth);
        },
        stop(fade = LOOP_FADE) {
          if (stopped) return;
          stopped = true;
          loops.delete(handle);
          const now = context.currentTime;
          level.gain.setTargetAtTime(0, now, fade / 3);
          source.stop(now + fade + 0.1);
        },
      };
      loops.add(handle);
      return handle;
    },

    stopAll() {
      for (const handle of [...loops]) handle.stop();
    },

    preload: (ids) => bank.load(ids),
  };
}
