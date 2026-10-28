// Motor de audio: traduce la mezcla (mix.ts) a nodos de Web Audio y sintetiza todo sin archivos de sonido.
// Cada voz es un ambiente o una capa (ruido filtrado, tonos y golpes repetidos); al cambiar de mundo la
// voz vieja se apaga poco a poco y la nueva entra. Hasta el primer gesto del jugador no se crea el contexto
// (los navegadores no dejan sonar antes). Si no hay Web Audio, el motor no hace nada.
import type { NoiseBed, Soundscape, Tone } from '../data/soundscapes';
import type { Mix } from './mix';

/** Constantes de tiempo (s) de los cambios suaves. */
const LEVEL_SMOOTH = 0.7;
const SHAPE_SMOOTH = 0.25;
const MASTER_SMOOTH = 0.15;
const MUFFLE_SMOOTH = 0.4;
/** Lo que tarda en detenerse una voz tras empezar a apagarse. */
const RELEASE_AFTER = 4;
/** Hasta dónde por delante se programan los golpes. */
const PULSE_LOOKAHEAD = 0.25;
const NOISE_SECONDS = 2;
const SILENCE = 0.0001;

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
  private fading = false;
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

  /** La voz suena (true) o se apaga (false). */
  setActive(active: boolean, now: number): void {
    this.fading = !active;
    this.output.gain.setTargetAtTime(active ? 1 : 0, now, LEVEL_SMOOTH);
    this.releaseAt = active ? undefined : (this.releaseAt ?? now + RELEASE_AFTER);
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
    if (!pulse || this.fading) return;
    // Tras una pausa no se recuperan los golpes perdidos: se sigue desde ahora.
    if (this.nextPulse < now) this.nextPulse = now + 0.05;
    while (this.nextPulse < now + PULSE_LOOKAHEAD) {
      this.hit(this.nextPulse, pitch);
      this.nextPulse += pulse.everySeconds / tempo;
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

export function createAudioEngine(createContext: () => AudioContext = defaultContext): AudioEngine {
  let context: AudioContext | undefined;
  let failed = false;
  let noise: AudioBuffer | undefined;
  let bus: GainNode | undefined;
  let master: GainNode | undefined;
  let muffle: BiquadFilterNode | undefined;
  let heldBack = false; // la pestaña está oculta: no reanudar hasta que vuelva
  const voices = new Map<string, Voice>();

  function build(): void {
    const created = createContext();
    noise = createNoise(created);
    bus = created.createGain();
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
    muffle.connect(limiter);
    limiter.connect(master);
    master.connect(created.destination);
    context = created;
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
        if (!heldBack) void context?.resume().catch(() => undefined);
      } catch (error) {
        failed = true;
        console.warn('Sin sonido: no se pudo crear el audio.', error);
      }
    },
    update(mix) {
      if (!context || !bus || !master || !muffle || !noise || context.state !== 'running') return;
      const now = context.currentTime;
      master.gain.setTargetAtTime(mix.master, now, MASTER_SMOOTH);
      muffle.frequency.setTargetAtTime(mix.muffle, now, MUFFLE_SMOOTH);
      const wanted = new Set<string>();
      for (const { id, scape } of mix.voices) {
        wanted.add(id);
        let voice = voices.get(id);
        if (!voice) {
          voice = new Voice(context, scape, noise, bus);
          voices.set(id, voice);
        }
        voice.setActive(true, now);
        voice.setShape(mix.pitch, mix.tempo, now);
        voice.tick(now, mix.pitch, mix.tempo);
      }
      for (const [id, voice] of voices) {
        if (wanted.has(id)) continue;
        voice.setActive(false, now);
        if (voice.releaseAt !== undefined && now >= voice.releaseAt) {
          voice.stop();
          voices.delete(id);
        }
      }
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
      dropVoices();
      void context?.close().catch(() => undefined);
      context = undefined;
    },
  };
}
