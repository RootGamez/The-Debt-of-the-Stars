// Qué suena en cada momento, como lógica pura: de dónde estás, a qué ritmo corre tu reloj, qué eventos hay en
// curso (y cuánto cielo ocupa el agujero negro), si suena una grabación y en qué fase está el ciclo salen las
// voces que deben sonar y su volumen. El motor (engine.ts) solo las traduce a nodos de Web Audio.
import {
  EVENT_SOUNDS,
  OPEN_SPACE_SOUND,
  RECORDING_VOICE,
  SHIP_SOUND,
  WORLD_SOUNDSCAPES,
  type Soundscape,
} from '../data/soundscapes';

export interface MixInput {
  /** Mundo en cuyo marco estás; `undefined` = espacio abierto. */
  worldId: string | undefined;
  /** Ritmo del reloj aquí (1 = el de Umbral). */
  rate: number;
  /** Ids de los eventos en curso. */
  events: readonly string[];
  /** Avance de la absorción (0–1). */
  absorption: number;
  /** Cuánto ocupa el agujero negro en el cielo (0–1): su rumor sube con su tamaño y con la cercanía. */
  hole: number;
  phase: 'playing' | 'dying' | 'waking';
  /** Opacidad del fundido (muerte en blanco, despertar en negro). */
  fade: number;
  /** El tiempo corre (no hay pausa ni lectura abierta). */
  running: boolean;
  piloting: boolean;
  muted: boolean;
  /** Una grabación sonando: su velocidad respecto a la natural y si alguien habla ahora. */
  recording?: { factor: number; speaking: boolean } | null;
}

export interface VoiceMix {
  id: string;
  scape: Soundscape;
  /** Volumen de la voz (0–1); 0 la deja callada pero viva. */
  level: number;
  /** Cuánto se acortan sus golpes y su oleaje. */
  tempo: number;
  /** Escala de sus frecuencias. */
  pitch: number;
  /** Constante de tiempo (s) de sus cambios de volumen; sin ella, la general (lenta, de ambiente). */
  smooth?: number;
}

export interface Mix {
  voices: VoiceMix[];
  /** Ritmo de los ambientes: el del reloj del lugar. */
  tempo: number;
  /** Tono de los ambientes: el tiempo lento suena más grave. */
  pitch: number;
  /** Volumen general (0–1). */
  master: number;
  /** Frecuencia de corte del filtro general (Hz): se cierra cuando algo te alcanza. */
  muffle: number;
}

const MASTER_VOLUME = 0.7;
/** Volumen del mundo en pausa o leyendo: sigue ahí, más lejos. */
const DUCKED = 0.35;
/** Y mientras suena una grabación, más lejos aún: la voz manda. */
const LISTENING = 0.15;
const OPEN_MUFFLE = 18000;
const CLOSED_MUFFLE = 450;
const PITCH_EXPONENT = 0.35;
const MIN_PITCH = 0.4;
const MAX_PITCH = 1.25;
const MIN_TEMPO = 0.05;
const MAX_TEMPO = 1.5;
/** La voz de una grabación cambia más de tono que los ambientes (lenta, grave; rápida, aguda). */
const VOICE_PITCH_EXPONENT = 0.5;
const VOICE_MIN_PITCH = 0.3;
const VOICE_MAX_PITCH = 3;
const VOICE_MAX_TEMPO = 8;
/** La voz calla y vuelve entre frases enseguida (los ambientes, en cambio, entran despacio). */
const VOICE_SMOOTH = 0.06;
/** La capa del agujero negro (el evento de las 13:30) y lo poco que suena recién nacido. */
const HOLE_VOICE = 'evento:agujero_negro';
const HOLE_QUIET = 0.2;
/** Al morir, en qué punto del fundido a blanco ya no suena nada: el silencio justo antes del reinicio. */
const SILENT_FROM = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Volumen del rumor del agujero según cuánto ocupa en el cielo: crece deprisa al principio y llega a 1 encima. */
function holeLevel(fill: number): number {
  return HOLE_QUIET + (1 - HOLE_QUIET) * Math.sqrt(clamp(finiteOr(fill, 0), 0, 1));
}

export function computeMix(input: MixInput): Mix {
  const rate = Math.max(finiteOr(input.rate, 1), 0);
  const tempo = clamp(rate, MIN_TEMPO, MAX_TEMPO);
  const pitch = clamp(rate ** PITCH_EXPONENT, MIN_PITCH, MAX_PITCH);
  const { recording } = input;
  const around = recording ? LISTENING : input.running ? 1 : DUCKED;

  const voices: VoiceMix[] = [];
  const ambient = (id: string, scape: Soundscape, level = around): void => {
    voices.push({ id, scape, level, tempo, pitch });
  };
  const world = input.worldId ? WORLD_SOUNDSCAPES[input.worldId] : undefined;
  ambient(`mundo:${world ? (input.worldId ?? 'espacio') : 'espacio'}`, world ?? OPEN_SPACE_SOUND);
  for (const event of input.events) {
    const scape = EVENT_SOUNDS[event];
    const id = `evento:${event}`;
    if (scape) ambient(id, scape, id === HOLE_VOICE ? around * holeLevel(input.hole) : around);
  }
  if (input.piloting) ambient('nave', SHIP_SOUND);
  if (recording) {
    const factor = Math.max(finiteOr(recording.factor, 1), 0);
    voices.push({
      id: 'grabacion',
      scape: RECORDING_VOICE,
      level: recording.speaking ? 1 : 0,
      tempo: clamp(factor, MIN_TEMPO, VOICE_MAX_TEMPO),
      pitch: clamp(factor ** VOICE_PITCH_EXPONENT, VOICE_MIN_PITCH, VOICE_MAX_PITCH),
      smooth: VOICE_SMOOTH,
    });
  }

  const fade = clamp(finiteOr(input.fade, 0), 0, 1);
  let master = MASTER_VOLUME;
  // Al morir todo calla enseguida y el fundido de la Cámara llega en silencio; al despertar, vuelve con la luz.
  if (input.phase === 'dying') master *= clamp(1 - fade / SILENT_FROM, 0, 1);
  else if (input.phase === 'waking') master *= 1 - fade * 0.95;
  if (input.muted) master = 0;

  const absorption = clamp(finiteOr(input.absorption, 0), 0, 1);
  return {
    voices,
    tempo,
    pitch,
    master: clamp(master, 0, 1),
    muffle: OPEN_MUFFLE - (OPEN_MUFFLE - CLOSED_MUFFLE) * absorption * absorption,
  };
}

/** La mezcla de la pantalla de carga: ningún ambiente, solo la música (y el silencio de la M). */
export function musicOnlyMix(muted: boolean): Mix {
  return {
    voices: [],
    tempo: 1,
    pitch: 1,
    master: muted ? 0 : MASTER_VOLUME,
    muffle: OPEN_MUFFLE,
  };
}
