// Los sonidos del juego, descritos como datos: nada se descarga ni se licencia, todo se sintetiza con Web Audio
// (ver audio/engine.ts). Cada mundo tiene un ambiente según su atmósfera en CONTEXTO_PLANETAS.md; los eventos
// del ciclo y la nave añaden capas. Las ganancias son de cada capa (0 a 1 de la señal): el motor las mezcla
// con un volumen general bajo para que nunca se sature.

/** Ruido filtrado: viento, rumor, aire de sala. */
export interface NoiseBed {
  filter: BiquadFilterType;
  frequency: number;
  q: number;
  gain: number;
  /** Oleaje lento de la ganancia: `hz` ciclos por segundo y `depth` (0–1) de cuánto sube y baja. */
  swell?: { hz: number; depth: number };
}

/** Tono continuo: zumbido, bajo, campana lejana. */
export interface Tone {
  frequency: number;
  gain: number;
  type: OscillatorType;
  /** Desafinación en cents (dos tonos casi iguales laten entre sí). */
  detune?: number;
  swell?: { hz: number; depth: number };
}

/** Golpe repetido: tictac, latido de máquina, gota con eco. Su ritmo sigue al reloj del lugar. */
export interface Pulse {
  everySeconds: number;
  frequency: number;
  decay: number;
  gain: number;
  /** Con ruido (tictac seco) o con tono que cae (golpe grave). */
  noise?: boolean;
  /** Irregularidad del ritmo (0–1): cada intervalo varía hasta esa fracción. Sin ella, va a compás. */
  jitter?: number;
  /** Variación del tono de cada golpe (0–1): las sílabas de una voz no suenan todas igual. */
  wobble?: number;
}

export interface Soundscape {
  noise?: NoiseBed;
  tones?: Tone[];
  pulse?: Pulse;
}

/** Donde no hay mundo (y en la Luna del prólogo, aún sin construir): un rumor muy grave y un tono quieto. */
export const OPEN_SPACE_SOUND: Soundscape = {
  noise: { filter: 'lowpass', frequency: 90, q: 0.6, gain: 0.03 },
  tones: [{ frequency: 55, gain: 0.03, type: 'sine' }],
};

/** Ambiente de cada mundo. */
export const WORLD_SOUNDSCAPES: Readonly<Record<string, Soundscape>> = {
  // Ámbar y arena, sol bajo, viento leve.
  umbral: {
    noise: {
      filter: 'lowpass',
      frequency: 650,
      q: 0.4,
      gain: 0.1,
      swell: { hz: 0.07, depth: 0.6 },
    },
    tones: [
      { frequency: 110, gain: 0.02, type: 'sine' },
      { frequency: 165, gain: 0.012, type: 'sine', detune: 6 },
    ],
  },
  // Luz fría por rendijas, eco de pasos, casi sin música: una sala enorme que resuena.
  archivo: {
    noise: {
      filter: 'bandpass',
      frequency: 320,
      q: 3,
      gain: 0.035,
      swell: { hz: 0.05, depth: 0.5 },
    },
    tones: [
      { frequency: 73.4, gain: 0.03, type: 'sine' },
      { frequency: 146.8, gain: 0.01, type: 'triangle', detune: -5 },
    ],
    pulse: { everySeconds: 7, frequency: 880, decay: 1.2, gain: 0.025 },
  },
  // Viento, máquinas con ritmo: el latido de la fábrica que sigue trabajando para nadie.
  taller: {
    noise: {
      filter: 'highpass',
      frequency: 1200,
      q: 0.5,
      gain: 0.05,
      swell: { hz: 0.15, depth: 0.5 },
    },
    tones: [{ frequency: 55, gain: 0.02, type: 'sawtooth' }],
    pulse: { everySeconds: 0.5, frequency: 90, decay: 0.14, gain: 0.12 },
  },
  // Sonidos graves, tensión y tristeza: un rumor de fondo y un latido muy lento.
  cicatriz: {
    noise: { filter: 'lowpass', frequency: 160, q: 1, gain: 0.14, swell: { hz: 0.05, depth: 0.4 } },
    tones: [
      { frequency: 41, gain: 0.07, type: 'sine' },
      { frequency: 61.7, gain: 0.03, type: 'triangle', detune: 8 },
    ],
    pulse: { everySeconds: 9, frequency: 55, decay: 2, gain: 0.08 },
  },
  // Casi silencio: un hilo agudo apenas audible.
  observatorio: {
    noise: {
      filter: 'bandpass',
      frequency: 3000,
      q: 8,
      gain: 0.008,
      swell: { hz: 0.04, depth: 0.6 },
    },
    tones: [{ frequency: 220, gain: 0.006, type: 'sine' }],
  },
  // Un tictac lentísimo y el zumbido de las lámparas: aquí pasan meses mientras fuera pasan años.
  laboratorio: {
    noise: { filter: 'lowpass', frequency: 300, q: 0.7, gain: 0.025 },
    tones: [{ frequency: 120, gain: 0.02, type: 'sine' }],
    pulse: { everySeconds: 1, frequency: 1800, decay: 0.03, gain: 0.1, noise: true },
  },
  // Un mundo vivo: viento templado.
  hogar: {
    noise: {
      filter: 'lowpass',
      frequency: 900,
      q: 0.5,
      gain: 0.08,
      swell: { hz: 0.1, depth: 0.5 },
    },
    tones: [{ frequency: 196, gain: 0.01, type: 'sine' }],
  },
  // 🟡 El Archivo de las Puertas (Fase 10D), fuera del tiempo: aire quieto y un acorde que no termina de resolver.
  puertas: {
    noise: {
      filter: 'lowpass',
      frequency: 200,
      q: 0.6,
      gain: 0.02,
      swell: { hz: 0.03, depth: 0.7 },
    },
    tones: [
      { frequency: 110, gain: 0.012, type: 'sine' },
      { frequency: 164.8, gain: 0.008, type: 'sine', detune: 6 },
      { frequency: 246.9, gain: 0.004, type: 'sine' },
    ],
  },
  espacio: OPEN_SPACE_SOUND,
};

/** Capas que se suman mientras dura cada evento del ciclo (los ids son los de cronologia.json). */
export const EVENT_SOUNDS: Readonly<Record<string, Soundscape>> = {
  // Las señales de los Ausentes: un pitido lejano y espaciado.
  senales: {
    tones: [{ frequency: 1320, gain: 0.004, type: 'sine' }],
    pulse: { everySeconds: 6, frequency: 1320, decay: 1.2, gain: 0.03 },
  },
  // La Máquina abre las Puertas: un golpe grave de seis segundos.
  pulso_cicatriz: {
    noise: { filter: 'lowpass', frequency: 120, q: 0.8, gain: 0.2 },
    tones: [{ frequency: 36, gain: 0.25, type: 'sine' }],
  },
  // El cielo rojo: dos notas casi iguales que baten, tensión sostenida.
  cielo_rojo: {
    noise: { filter: 'lowpass', frequency: 400, q: 0.5, gain: 0.04 },
    tones: [
      { frequency: 82.4, gain: 0.02, type: 'sawtooth' },
      { frequency: 82.4, gain: 0.02, type: 'sawtooth', detune: 14 },
    ],
  },
  // El final: un rumor enorme que oscila.
  agujero_negro: {
    noise: { filter: 'lowpass', frequency: 80, q: 0.5, gain: 0.18, swell: { hz: 0.3, depth: 0.5 } },
    tones: [
      { frequency: 30, gain: 0.14, type: 'sine' },
      { frequency: 45, gain: 0.07, type: 'triangle' },
    ],
  },
  // El haz de luz por la ranura del Archivo: dos notas suaves, como de campana.
  ranura_luz: {
    tones: [
      { frequency: 523, gain: 0.02, type: 'sine' },
      { frequency: 784, gain: 0.012, type: 'sine' },
    ],
  },
  // La alineación del Observatorio: un brillo agudo.
  alineacion: {
    tones: [
      { frequency: 1760, gain: 0.01, type: 'sine' },
      { frequency: 1760, gain: 0.01, type: 'sine', detune: 9 },
    ],
  },
  // El gusano que se abre junto al fragmento de la Luna (Fase 9E, no es de la cronología): un zumbido que sube
  // y tiembla; luego, el silencio del fundido a blanco.
  gusano: {
    noise: { filter: 'bandpass', frequency: 900, q: 2, gain: 0.05, swell: { hz: 0.9, depth: 0.5 } },
    tones: [
      { frequency: 110, gain: 0.08, type: 'sine' },
      { frequency: 220.5, gain: 0.05, type: 'triangle', detune: 12 },
      { frequency: 440, gain: 0.02, type: 'sine', swell: { hz: 2.2, depth: 0.6 } },
    ],
  },
  // La secuencia de la fábrica: el ritmo se acelera.
  secuencia_fabrica: {
    noise: { filter: 'highpass', frequency: 2000, q: 0.6, gain: 0.03 },
    pulse: { everySeconds: 0.25, frequency: 140, decay: 0.08, gain: 0.08 },
  },
};

/**
 * La voz de una grabación, mientras no haya voces de verdad: un zumbido que tiembla al ritmo de las sílabas
 * y golpes de ruido filtrado como consonantes. Su ritmo y su tono siguen a la velocidad de reproducción: a
 * ×1 una grabación lenta suena grave y arrastrada; acertando la velocidad, a ritmo de habla.
 */
export const RECORDING_VOICE: Soundscape = {
  noise: { filter: 'bandpass', frequency: 1600, q: 1.5, gain: 0.012 },
  tones: [
    { frequency: 125, gain: 0.035, type: 'triangle', swell: { hz: 4.5, depth: 0.9 } },
    { frequency: 250, gain: 0.012, type: 'sine', detune: 7, swell: { hz: 4.5, depth: 0.9 } },
  ],
  pulse: {
    everySeconds: 0.21,
    frequency: 950,
    decay: 0.08,
    gain: 0.1,
    noise: true,
    jitter: 0.45,
    wobble: 0.35,
  },
};

/** Zumbido de la cabina mientras pilotas. */
export const SHIP_SOUND: Soundscape = {
  noise: { filter: 'lowpass', frequency: 250, q: 0.5, gain: 0.08 },
  tones: [{ frequency: 70, gain: 0.03, type: 'triangle' }],
};
