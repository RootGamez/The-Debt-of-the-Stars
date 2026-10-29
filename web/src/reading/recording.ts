// Las grabaciones de los Ausentes se oyen al ritmo del reloj con que se grabaron (CONTEXTO_HISTORIA.md §6):
// una voz grabada donde el tiempo iba cinco veces más lento suena lentísima. Para entenderla hay que girar la
// rueda de velocidad hasta deshacer ese reloj (velocidad × reloj ≈ 1). Lógica pura, sin DOM ni audio: la
// interfaz (ui/recordingPanel.ts) y el murmullo (audio/) solo muestran lo que esto calcula.

/** Ritmo natural del habla (palabras por segundo del que habla). */
export const WORDS_PER_SECOND = 2.5;
/** Hasta este error (±15 %) la voz se entiende del todo. */
export const CLEAR_TOLERANCE = 1.15;
/** A partir de este error (×2,5 o ÷2,5) ya no se entiende nada. */
export const LOST_RATIO = 2.5;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 8;
/** Lo mínimo que dura una frase y el silencio entre frases y al final (segundos del que habla). */
const MIN_LINE_SECONDS = 0.8;
const LINE_PAUSE = 0.6;
const END_PAUSE = 2;
/** Reparto de las palabras que se entienden primero (número áureo: se reparten sin amontonarse). */
const GOLDEN = 0.6180339887;
const VOWEL = /[aeiouáéíóúü]/i;
const VOWELS = /[aeiouáéíóúü]/gi;
const LETTERS = /\p{L}+/gu;

/** Cuánto se entiende la voz (0–1) a esa velocidad, si se grabó con ese ritmo de reloj. */
export function clarity(speed: number, recordedRate: number): number {
  const factor = speed * recordedRate;
  if (!Number.isFinite(factor) || factor <= 0) return 0;
  const error = Math.abs(Math.log(factor));
  const clear = Math.log(CLEAR_TOLERANCE);
  const lost = Math.log(LOST_RATIO);
  if (error <= clear) return 1;
  if (error >= lost) return 0;
  return (lost - error) / (lost - clear);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** La rueda va de 0 a 1 y la velocidad crece en escala logarítmica (cada paso multiplica lo mismo). */
export function speedFromSlider(position: number): number {
  return MIN_SPEED * (MAX_SPEED / MIN_SPEED) ** clamp01(position);
}

export function sliderFromSpeed(speed: number): number {
  return clamp01(Math.log(speed / MIN_SPEED) / Math.log(MAX_SPEED / MIN_SPEED));
}

export interface TimedLine {
  text: string;
  words: string[];
  /** Inicio y fin en segundos del que habla. */
  start: number;
  end: number;
}

/** Reparte las frases en el tiempo del que habla. */
export function timeline(lines: readonly string[]): { lines: TimedLine[]; duration: number } {
  let cursor = 0;
  const timed = lines.map((text) => {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const start = cursor;
    const end = start + Math.max(MIN_LINE_SECONDS, words.length / WORDS_PER_SECOND);
    cursor = end + LINE_PAUSE;
    return { text, words, start, end };
  });
  const last = timed.at(-1);
  return { lines: timed, duration: (last?.end ?? 0) + END_PAUSE };
}

/** Lento: las vocales se arrastran. Rápido: se tragan (si no queda nada, queda la primera letra). */
function smear(word: string, factor: number): string {
  return word.replace(LETTERS, (letters) => {
    if (factor < 1) return letters.replace(VOWELS, (v) => v + v.toLowerCase().repeat(2));
    const swallowed = letters.replace(VOWELS, '');
    return swallowed.length > 0 ? swallowed : letters.charAt(0);
  });
}

/**
 * El texto tal como se oye: con `clarity` 1, intacto; por debajo, una parte de las palabras (siempre las
 * mismas, para que no parpadee) sale deformada según suene lenta (`factor` < 1) o rápida.
 */
export function garble(text: string, clarityLevel: number, factor: number): string {
  if (clarityLevel >= 1) return text;
  return text
    .split(' ')
    .map((word, index) => {
      const rank = (index * GOLDEN) % 1;
      return rank < clarityLevel || !VOWEL.test(word) ? word : smear(word, factor);
    })
    .join(' ');
}

export type LineState = 'pending' | 'playing' | 'done';

export interface LineView {
  text: string;
  state: LineState;
  /** Se oyó entera a la velocidad buena (se entiende para siempre). */
  heard: boolean;
}

export interface PlaybackView {
  lines: LineView[];
  speed: number;
  clarity: number;
  understood: boolean;
}

/** Una grabación sonando: avanza con el tiempo real, a la velocidad de la rueda, y vuelve a empezar. */
export class RecordingPlayback {
  private readonly timed: TimedLine[];
  private readonly duration: number;
  private readonly heard: boolean[];
  private readonly reached: boolean[];
  /** La frase en curso sonó clara desde que empezó en esta pasada. */
  private readonly clearSoFar: boolean[];
  private position = 0;
  private speed_: number;

  constructor(
    lines: readonly string[],
    private readonly recordedRate: number,
    startSpeed = 1,
  ) {
    const { lines: timed, duration } = timeline(lines);
    this.timed = timed;
    this.duration = duration;
    this.heard = timed.map(() => false);
    this.reached = timed.map(() => false);
    this.clearSoFar = timed.map(() => false);
    this.speed_ = Math.min(MAX_SPEED, Math.max(MIN_SPEED, startSpeed));
  }

  get speed(): number {
    return this.speed_;
  }

  /** Velocidad a la que suena la voz respecto a la natural (1 = como se habló). */
  get factor(): number {
    return this.speed_ * this.recordedRate;
  }

  get clarity(): number {
    return clarity(this.speed_, this.recordedRate);
  }

  get understood(): boolean {
    return this.heard.every(Boolean);
  }

  /** Hay alguien hablando ahora mismo (no es un silencio entre frases). */
  get speaking(): boolean {
    return this.timed.some((line) => this.position > line.start && this.position < line.end);
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return;
    this.speed_ = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
  }

  /** Avanza `dt` segundos reales. */
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const clear = this.clarity >= 1;
    let next = this.position + dt * this.factor;
    this.timed.forEach((line, i) => {
      const startsNow = this.position <= line.start && next > line.start;
      if (startsNow) {
        this.reached[i] = true;
        this.clearSoFar[i] = clear;
      } else if (this.position > line.start && this.position < line.end && !clear) {
        this.clearSoFar[i] = false;
      }
      if (this.position < line.end && next >= line.end && this.reached[i] && this.clearSoFar[i]) {
        this.heard[i] = true;
      }
    });
    if (next >= this.duration) next = 0; // vuelve a empezar (sin saltarse frases: el final es silencio)
    this.position = next;
  }

  view(): PlaybackView {
    const level = this.clarity;
    const lines = this.timed.map((line, i): LineView => {
      const state: LineState =
        this.position <= line.start ? 'pending' : this.position < line.end ? 'playing' : 'done';
      const heard = this.heard[i] ?? false;
      if (heard) return { text: line.text, state, heard };
      if (state === 'playing') {
        const progress = (this.position - line.start) / (line.end - line.start);
        const shown = Math.min(line.words.length, Math.floor(progress * line.words.length) + 1);
        return {
          text: garble(line.words.slice(0, shown).join(' '), level, this.factor),
          state,
          heard,
        };
      }
      const known = this.reached[i] ?? false;
      return { text: known ? garble(line.text, level, this.factor) : '', state, heard };
    });
    return { lines, speed: this.speed_, clarity: level, understood: this.understood };
  }
}
