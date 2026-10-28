// Qué suena en cada momento, como lógica pura: de dónde estás, a qué ritmo corre tu reloj, qué eventos hay en
// curso y en qué fase está el ciclo salen las voces que deben sonar y su volumen. El motor (engine.ts) solo
// las traduce a nodos de Web Audio.
import {
  EVENT_SOUNDS,
  OPEN_SPACE_SOUND,
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
  phase: 'playing' | 'dying' | 'waking';
  /** Opacidad del fundido (muerte en blanco, despertar en negro). */
  fade: number;
  /** El tiempo corre (no hay pausa ni lectura abierta). */
  running: boolean;
  piloting: boolean;
  muted: boolean;
}

export interface VoiceMix {
  id: string;
  scape: Soundscape;
}

export interface Mix {
  voices: VoiceMix[];
  /** Cuánto se acortan los golpes y el oleaje (el ritmo del reloj del lugar). */
  tempo: number;
  /** Escala de las frecuencias: el tiempo lento suena más grave. */
  pitch: number;
  /** Volumen general (0–1). */
  master: number;
  /** Frecuencia de corte del filtro general (Hz): se cierra cuando algo te alcanza. */
  muffle: number;
}

const MASTER_VOLUME = 0.7;
/** Volumen relativo en pausa o leyendo: el mundo sigue ahí, más lejos. */
const DUCKED = 0.35;
const OPEN_MUFFLE = 18000;
const CLOSED_MUFFLE = 450;
const PITCH_EXPONENT = 0.35;
const MIN_PITCH = 0.4;
const MAX_PITCH = 1.25;
const MIN_TEMPO = 0.05;
const MAX_TEMPO = 1.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeMix(input: MixInput): Mix {
  const rate = Number.isFinite(input.rate) ? Math.max(input.rate, 0) : 1;
  const voices: VoiceMix[] = [];
  const world = input.worldId ? WORLD_SOUNDSCAPES[input.worldId] : undefined;
  voices.push({
    id: `mundo:${world ? input.worldId : 'espacio'}`,
    scape: world ?? OPEN_SPACE_SOUND,
  });
  for (const event of input.events) {
    const scape = EVENT_SOUNDS[event];
    if (scape) voices.push({ id: `evento:${event}`, scape });
  }
  if (input.piloting) voices.push({ id: 'nave', scape: SHIP_SOUND });

  const fade = clamp(Number.isFinite(input.fade) ? input.fade : 0, 0, 1);
  let master = MASTER_VOLUME;
  if (!input.running) master *= DUCKED;
  if (input.phase !== 'playing') master *= 1 - fade * 0.95;
  if (input.muted) master = 0;

  const absorption = clamp(Number.isFinite(input.absorption) ? input.absorption : 0, 0, 1);
  return {
    voices,
    tempo: clamp(rate, MIN_TEMPO, MAX_TEMPO),
    pitch: clamp(rate ** PITCH_EXPONENT, MIN_PITCH, MAX_PITCH),
    master: clamp(master, 0, 1),
    muffle: OPEN_MUFFLE - (OPEN_MUFFLE - CLOSED_MUFFLE) * absorption * absorption,
  };
}
