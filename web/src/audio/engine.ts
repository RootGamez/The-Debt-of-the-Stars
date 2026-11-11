// Motor de audio: traduce la mezcla (mix.ts) a nodos de Web Audio y sintetiza todo sin archivos de sonido.
// Cada voz es un ambiente o una capa (ruido filtrado, tonos y golpes repetidos); al cambiar de mundo la
// voz vieja se apaga poco a poco y la nueva entra. Hasta el primer gesto del jugador no se crea el contexto
// (los navegadores no dejan sonar antes). Si no hay Web Audio, el motor no hace nada.
import type { NoiseBed, Soundscape, Tone } from '../data/soundscapes';
import type { Mix } from './mix';
import { createSampleBank, type SampleBank } from './sampleBank';
import {
  createSamplePlayer,
  type LoopHandle,
  type LoopOptions,
  type PlayOptions,
  type SamplePlayer,
} from './samplePlayer';
import { DEFAULT_VOLUMES, type VolumePreferences } from './volumePreferences';
import { t } from '../i18n';

/** Constantes de tiempo (s) de los cambios suaves. */
const LEVEL_SMOOTH = 0.7;
const SHAPE_SMOOTH = 0.25;
const MASTER_SMOOTH = 0.15;
const MUFFLE_SMOOTH = 0.4;
/** Lo que tarda en detenerse una voz tras empezar a apagarse. */
const RELEASE_AFTER = 4;
/** Lo que tarda por defecto en entrar y salir una pieza de música (s). */
const DEFAULT_MUSIC_FADE = 3;
/** Hasta dónde por delante se programan los golpes. */
const PULSE_LOOKAHEAD = 0.25;
const NOISE_SECONDS = 2;
const SILENCE = 0.0001;
/** La voz de letras: volumen, ataque y duración (s), y cuánto varía el tono de una letra a otra. */
const BLIP_LEVEL = 0.05;
const BLIP_ATTACK = 0.008;
const BLIP_LENGTH = 0.07;
const BLIP_WOBBLE = 0.14;
/** La campana: ataque (s) y sus parciales [razón con la fundamental, volumen, duración (s)]. */
const CHIME_ATTACK = 0.006;
const CHIME_PARTIALS: readonly (readonly [number, number, number])[] = [
  [1, 0.12, 1.6],
  [2.76, 0.05, 0.7],
];

export interface AudioEngine {
  /** Voces vivas (sonando o apagándose). */
  readonly voiceCount: number;
  /** Ids de esas voces. */
  readonly voiceIds: string[];
  /** El contexto de audio existe y está sonando. */
  readonly running: boolean;
  /** Crea (o reanuda) el contexto: hay que llamarlo desde un gesto del jugador. */
  unlock(): void;
  /** Una vez por fotograma. */
  update(mix: Mix): void;
  /**
   * Un «bip» corto de la voz de letras (plan del HUD, decisión 6), con el tono `frequency` (Hz). Va directo al
   * volumen general: el silencio (M) también lo calla, pero no lo apaga el filtro de leer.
   */
  blip(frequency: number): void;
  /** El toque de una campana de bronce (las campanas del Anfiteatro): un tono con su armónico que se apaga despacio. */
  chime(frequency: number): void;
  /**
   * Suena un sample (paso, golpe, portal…). Devuelve false si no hay audio o el sonido no está cargado: quien
   * llama decide si usa el sintético de siempre.
   */
  play(id: string, options?: PlayOptions): boolean;
  /** Arranca un bucle de sample; `undefined` si no hay audio o el sonido no está cargado. */
  loop(id: string, options?: LoopOptions): LoopHandle | undefined;
  /** Pide cargar esos sonidos (si aún no hay audio, se cargan al desbloquearlo). Nunca falla. */
  preload(ids: readonly string[]): Promise<void>;
  /** El sample está descargado y decodificado. */
  sampleReady(id: string): boolean;
  /** Volumen de los efectos y de los ambientes (Configuración). */
  setVolumes(volumes: Readonly<VolumePreferences>): void;
  /**
   * Pide una pieza de música: suena en bucle, entra en `fade` segundos y sustituye a la que sonara (que sale con otro
   * fundido). Si aún no hay audio o la pieza no está cargada, empieza en cuanto pueda. Nunca falla.
   */
  playMusic(id: string, options?: { level?: number; fade?: number }): void;
  /** Apaga la música en `fade` segundos. */
  stopMusic(fade?: number): void;
  /** La pieza de música que suena ahora (o `undefined`). */
  readonly music: string | undefined;
  /** Pestaña oculta: el audio se detiene con el tiempo del juego. */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

function defaultContext(): AudioContext {
  const legacy = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = legacy.AudioContext ?? legacy.webkitAudioContext;
  if (!Ctor) throw new Error('Este navegador no tiene Web Audio');
  return new Ctor();
}

/** Ruido blanco reproducible (xorshift): un par de segundos que se repiten sin costuras audibles. */
function createNoise(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * NOISE_SECONDS);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 0x9e3779b9;
  for (let i = 0; i < length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[i] = ((state >>> 0) / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

interface Retunable {
  param: AudioParam;
  base: number;
}

class Voice {
  private readonly output: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly pitched: Retunable[] = [];
  private readonly swells: Retunable[] = [];
  private nextPulse = 0;
  private level = 0;
  /** Azar reproducible para los golpes irregulares (sílabas de una voz). */
  private seed = 0x2545f491;
  /** Instante (reloj del contexto) a partir del cual puede detenerse; `undefined` mientras suena. */
  releaseAt: number | undefined;

  constructor(
    private readonly context: AudioContext,
    private readonly scape: Soundscape,
    private readonly noise: AudioBuffer,
    destination: AudioNode,
  ) {
    this.output = context.createGain();
    this.output.gain.value = 0;
    this.output.connect(destination);
    if (scape.noise) this.addNoise(scape.noise);
    for (const tone of scape.tones ?? []) this.addTone(tone);
  }

  private addNoise(bed: NoiseBed): void {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = bed.filter;
    filter.frequency.value = bed.frequency;
    filter.Q.value = bed.q;
    const gain = this.context.createGain();
    gain.gain.value = bed.gain;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    source.start();
    this.sources.push(source);
    this.pitched.push({ param: filter.frequency, base: bed.frequency });
    this.addSwell(gain.gain, bed.gain, bed.swell);
  }

  private addTone(tone: Tone): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = tone.type;
    oscillator.frequency.value = tone.frequency;
    oscillator.detune.value = tone.detune ?? 0;
    const gain = this.context.createGain();
    gain.gain.value = tone.gain;
    oscillator.connect(gain);
    gain.connect(this.output);
    oscillator.start();
    this.sources.push(oscillator);
    this.pitched.push({ param: oscillator.frequency, base: tone.frequency });
    this.addSwell(gain.gain, tone.gain, tone.swell);
  }

  /** Oleaje lento: un oscilador que sube y baja la ganancia alrededor de su valor base. */
  private addSwell(target: AudioParam, base: number, swell?: { hz: number; depth: number }): void {
    if (!swell) return;
    const lfo = this.context.createOscillator();
    lfo.frequency.value = swell.hz;
    const depth = this.context.createGain();
    depth.gain.value = base * swell.depth;
    lfo.connect(depth);
    depth.connect(target);
    lfo.start();
    this.sources.push(lfo);
    this.swells.push({ param: lfo.frequency, base: swell.hz });
  }

  /** La voz suena a ese volumen (0 = callada, pero sigue viva: una grabación entre frases). */
  setLevel(level: number, now: number, smooth = LEVEL_SMOOTH): void {
    this.output.gain.setTargetAtTime(level, now, smooth);
    this.level = level;
    this.releaseAt = undefined;
  }

  /** La voz ya no hace falta: se apaga poco a poco y, pasado un rato, se puede detener. */
  release(now: number): void {
    if (this.releaseAt === undefined) this.output.gain.setTargetAtTime(0, now, LEVEL_SMOOTH);
    this.level = 0;
    this.releaseAt ??= now + RELEASE_AFTER;
  }

  /** Número entre -1 y 1, siempre la misma serie (xorshift). */
  private spread(): number {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >>> 17;
    this.seed ^= this.seed << 5;
    return ((this.seed >>> 0) / 0xffffffff) * 2 - 1;
  }

  setShape(pitch: number, tempo: number, now: number): void {
    for (const { param, base } of this.pitched)
      param.setTargetAtTime(base * pitch, now, SHAPE_SMOOTH);
    for (const { param, base } of this.swells)
      param.setTargetAtTime(base * tempo, now, SHAPE_SMOOTH);
  }

  /** Programa los golpes que caen en la próxima fracción de segundo; su ritmo sigue al del reloj. */
  tick(now: number, pitch: number, tempo: number): void {
    const pulse = this.scape.pulse;
    if (!pulse || this.level <= 0) return;
    // Tras una pausa (o un silencio) no se recuperan los golpes perdidos: se sigue desde ahora.
    if (this.nextPulse < now) this.nextPulse = now + 0.05;
    while (this.nextPulse < now + PULSE_LOOKAHEAD) {
      const wobble = 1 + (pulse.wobble ?? 0) * this.spread();
      this.hit(this.nextPulse, pitch * wobble);
      const jitter = 1 + (pulse.jitter ?? 0) * this.spread();
      this.nextPulse += (pulse.everySeconds / tempo) * jitter;
    }
  }

  private hit(time: number, pitch: number): void {
    const pulse = this.scape.pulse;
    if (!pulse) return;
    const frequency = pulse.frequency * pitch;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(SILENCE, time);
    envelope.gain.linearRampToValueAtTime(pulse.gain, time + 0.005);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, time + pulse.decay);
    envelope.connect(this.output);
    const end = time + pulse.decay + 0.05;
    if (pulse.noise) {
      const burst = this.context.createBufferSource();
      burst.buffer = this.noise;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = 4;
      burst.connect(filter);
      filter.connect(envelope);
      burst.start(time, 0);
      burst.stop(end);
    } else {
      const oscillator = this.context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, time);
      // Un golpe grave cae de tono al apagarse; una campana lejana se mantiene.
      if (frequency < 400)
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, time + pulse.decay);
      oscillator.connect(envelope);
      oscillator.start(time);
      oscillator.stop(end);
    }
  }

  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // ya estaba detenida
      }
    }
    this.output.disconnect();
  }
}

/** Dónde están los samples (la carpeta `public/audio/`); las pruebas ponen los suyos. */
export interface EngineSamples {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export function createAudioEngine(
  createContext: () => AudioContext = defaultContext,
  samples: EngineSamples = {},
): AudioEngine {
  let context: AudioContext | undefined;
  let failed = false;
  let noise: AudioBuffer | undefined;
  let bus: GainNode | undefined;
  let effectsBus: GainNode | undefined;
  let musicBus: GainNode | undefined;
  let master: GainNode | undefined;
  let muffle: BiquadFilterNode | undefined;
  let bank: SampleBank | undefined;
  let player: SamplePlayer | undefined;
  let musicPlayer: SamplePlayer | undefined;
  /** La pieza que se ha pedido y la que suena (con su manejador): `syncMusic` las junta. */
  let musicWanted: { id: string; level: number; fade: number } | undefined;
  let musicNow: { id: string; handle: LoopHandle } | undefined;
  const musicRequested = new Set<string>();
  let volumes: Readonly<VolumePreferences> = DEFAULT_VOLUMES;
  /** Lo pedido antes de que hubiera audio: se carga al desbloquearlo. */
  const wanted = new Set<string>();
  let heldBack = false; // la pestaña está oculta: no reanudar hasta que vuelva
  const voices = new Map<string, Voice>();

  function applyVolumes(now: number, smooth: number): void {
    bus?.gain.setTargetAtTime(volumes.ambient, now, smooth);
    effectsBus?.gain.setTargetAtTime(volumes.effects, now, smooth);
    musicBus?.gain.setTargetAtTime(volumes.music, now, smooth);
  }

  function build(): void {
    const created = createContext();
    noise = createNoise(created);
    bus = created.createGain();
    bus.gain.value = volumes.ambient;
    effectsBus = created.createGain();
    effectsBus.gain.value = volumes.effects;
    musicBus = created.createGain();
    musicBus.gain.value = volumes.music;
    muffle = created.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 18000;
    master = created.createGain();
    master.gain.value = 0;
    // Un compresor suave evita que se sature cuando se superponen varios eventos graves.
    const limiter = created.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.ratio.value = 6;
    bus.connect(muffle);
    effectsBus.connect(muffle);
    musicBus.connect(muffle);
    muffle.connect(limiter);
    limiter.connect(master);
    master.connect(created.destination);
    bank = createSampleBank({
      baseUrl: samples.baseUrl ?? `${import.meta.env.BASE_URL}audio/`,
      fetchFn: samples.fetchFn,
      decode: (data) => created.decodeAudioData(data),
    });
    player = createSamplePlayer({ context: created, bank, destination: effectsBus });
    musicPlayer = createSamplePlayer({ context: created, bank, destination: musicBus });
    const started = bank;
    // Con pocos sonidos se carga todo el índice nada más desbloquear el audio; si crece, se pedirá por mundos.
    void started.init().then(() => {
      // La música no se baja de golpe con los efectos: pesa mucho; se pide cuando hace falta.
      const effects = started.ids().filter((id) => started.entry(id)?.category !== 'music');
      return started.load([...wanted, ...effects]);
    });
    context = created;
  }

  /** Junta lo que se ha pedido de música con lo que suena: carga la pieza, la arranca y apaga la anterior. */
  function syncMusic(): void {
    const current = context;
    const loaded = bank;
    if (!current || !loaded || !musicPlayer || current.state !== 'running') return;
    if (musicNow && musicNow.id !== musicWanted?.id) {
      musicNow.handle.stop(musicWanted?.fade ?? DEFAULT_MUSIC_FADE);
      musicNow = undefined;
    }
    if (!musicWanted) return;
    const { id, level, fade } = musicWanted;
    if (!loaded.loaded(id)) {
      // La música no se carga con los efectos (pesa): se baja una vez, la primera vez que se pide.
      if (!musicRequested.has(id)) {
        musicRequested.add(id);
        void loaded
          .init()
          .then(() => loaded.load([id]))
          .then(syncMusic);
      }
      return;
    }
    if (!musicNow) {
      const handle = musicPlayer.loop(id, { level: 0 });
      if (!handle) return;
      musicNow = { id, handle };
    }
    musicNow.handle.setLevel(level, fade / 3);
  }

  function dropVoices(): void {
    for (const voice of voices.values()) voice.stop();
    voices.clear();
  }

  return {
    get voiceCount() {
      return voices.size;
    },
    get voiceIds() {
      return [...voices.keys()];
    },
    get running() {
      return context?.state === 'running';
    },
    unlock() {
      if (failed) return;
      try {
        if (!context) build();
        if (!heldBack) void context?.resume().then(syncMusic, () => undefined);
      } catch (error) {
        failed = true;
        console.warn(t('Sin sonido: no se pudo crear el audio.'), error);
      }
    },
    update(mix) {
      if (!context || !bus || !master || !muffle || !noise || context.state !== 'running') return;
      const now = context.currentTime;
      master.gain.setTargetAtTime(mix.master, now, MASTER_SMOOTH);
      muffle.frequency.setTargetAtTime(mix.muffle, now, MUFFLE_SMOOTH);
      const wanted = new Set<string>();
      for (const { id, scape, level, pitch, tempo, smooth } of mix.voices) {
        wanted.add(id);
        let voice = voices.get(id);
        if (!voice) {
          voice = new Voice(context, scape, noise, bus);
          voices.set(id, voice);
        }
        voice.setLevel(level, now, smooth);
        voice.setShape(pitch, tempo, now);
        voice.tick(now, pitch, tempo);
      }
      for (const [id, voice] of voices) {
        if (wanted.has(id)) continue;
        voice.release(now);
        if (voice.releaseAt !== undefined && now >= voice.releaseAt) {
          voice.stop();
          voices.delete(id);
        }
      }
    },
    blip(frequency) {
      if (!context || !master || context.state !== 'running') return;
      const now = context.currentTime;
      const tone = context.createOscillator();
      const level = context.createGain();
      tone.type = 'triangle';
      tone.frequency.value = frequency * (1 + (Math.random() - 0.5) * BLIP_WOBBLE);
      level.gain.setValueAtTime(SILENCE, now);
      level.gain.exponentialRampToValueAtTime(BLIP_LEVEL, now + BLIP_ATTACK);
      level.gain.exponentialRampToValueAtTime(SILENCE, now + BLIP_LENGTH);
      tone.connect(level);
      level.connect(master);
      tone.start(now);
      tone.stop(now + BLIP_LENGTH + 0.01);
    },
    chime(frequency) {
      if (!context || !master || context.state !== 'running') return;
      const now = context.currentTime;
      // Fundamental y un armónico inarmónico (2,76×), como el bronce; el segundo se apaga antes.
      for (const [ratio, level, length] of CHIME_PARTIALS) {
        const tone = context.createOscillator();
        const gain = context.createGain();
        tone.type = 'sine';
        tone.frequency.value = frequency * ratio;
        gain.gain.setValueAtTime(SILENCE, now);
        gain.gain.exponentialRampToValueAtTime(level, now + CHIME_ATTACK);
        gain.gain.exponentialRampToValueAtTime(SILENCE, now + length);
        tone.connect(gain);
        gain.connect(effectsBus ?? master); // la campana es un efecto: la baja «Volumen de los efectos»
        tone.start(now);
        tone.stop(now + length + 0.01);
      }
    },
    play(id, options) {
      if (!context || context.state !== 'running') return false;
      return player?.play(id, options) ?? false;
    },
    loop(id, options) {
      if (!context || context.state !== 'running') return undefined;
      return player?.loop(id, options);
    },
    async preload(ids) {
      for (const id of ids) wanted.add(id);
      const current = bank;
      if (!current) return;
      await current.init();
      await current.load(ids);
    },
    sampleReady(id) {
      return bank?.loaded(id) ?? false;
    },
    setVolumes(next) {
      volumes = next;
      if (context) applyVolumes(context.currentTime, MASTER_SMOOTH);
    },
    playMusic(id, options = {}) {
      musicWanted = { id, level: options.level ?? 1, fade: options.fade ?? DEFAULT_MUSIC_FADE };
      syncMusic();
    },
    stopMusic(fade = DEFAULT_MUSIC_FADE) {
      if (musicWanted) musicWanted = { ...musicWanted, fade };
      const previous = musicNow;
      musicWanted = undefined;
      if (previous) {
        previous.handle.stop(fade);
        musicNow = undefined;
      }
    },
    get music() {
      return musicNow?.id;
    },
    suspend() {
      heldBack = true;
      void context?.suspend().catch(() => undefined);
    },
    resume() {
      heldBack = false;
      void context?.resume().catch(() => undefined);
    },
    dispose() {
      player?.stopAll();
      musicPlayer?.stopAll();
      musicNow = undefined;
      dropVoices();
      void context?.close().catch(() => undefined);
      context = undefined;
      bank = undefined;
      player = undefined;
      musicPlayer = undefined;
    },
  };
}
