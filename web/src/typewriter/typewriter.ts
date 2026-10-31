// La máquina de escribir de los diálogos y lecturas (plan del HUD, hito B): cuántas letras se ven en cada
// momento. Las letras salen a un ritmo fijo, con una pausa breve tras «, ; :» y otra más larga tras «. ! ? …».
// Donde el reloj va lento (`rate` < 1) todo se arrastra, pausas incluidas (con un límite: si no, una grabación
// del Nudo tardaría minutos en cada coma). Mantener pulsado acelera. Pura: el DOM solo pinta `visible`.

/** Pausa tras una coma, punto y coma o dos puntos (s). */
export const COMMA_PAUSE = 0.12;
/** Pausa tras un punto, exclamación, interrogación o puntos suspensivos (s). */
export const STOP_PAUSE = 0.3;
/** Mantener pulsado escribe así de rápido. */
export const HOLD_FACTOR = 4;
/** Lo más que se estira una pausa donde el reloj va lento. */
const MAX_PAUSE_SCALE = 3;
/** Por debajo de este ritmo no se sigue frenando (un reloj casi parado no congela el texto). */
const MIN_RATE = 0.2;

const COMMAS = new Set([',', ';', ':']);
const STOPS = new Set(['.', '!', '?', '…']);
/** Lo que cierra una frase: sale pegado a su signo, y la pausa va después. */
const CLOSERS = new Set(['»', '"', "'", ')', '”', '’']);

function pauseAfter(char: string): number {
  if (STOPS.has(char)) return STOP_PAUSE;
  return COMMAS.has(char) ? COMMA_PAUSE : 0;
}

export class Typewriter {
  private readonly chars: readonly string[];
  private shown = 0;
  /** Fracción de letra acumulada que aún no llega a una entera. */
  private budget = 0;
  /** Lo que queda de la pausa en curso (s, a ritmo normal). */
  private wait = 0;

  /** @param lettersPerSecond `Infinity` = todo de golpe. */
  constructor(
    text: string,
    private readonly lettersPerSecond: number,
  ) {
    this.chars = Array.from(text);
  }

  get length(): number {
    return this.chars.length;
  }

  get visible(): number {
    return this.shown;
  }

  get done(): boolean {
    return this.shown >= this.chars.length;
  }

  /** La primera pulsación del jugador: se ve la frase entera. */
  complete(): void {
    this.shown = this.chars.length;
    this.wait = 0;
    this.budget = 0;
  }

  /**
   * Avanza `dt` segundos reales. `rate`: ritmo del reloj donde se habló (1 = normal); `held`: el jugador mantiene
   * pulsado. Devuelve cuántas letras nuevas aparecieron.
   */
  step(dt: number, rate = 1, held = false): number {
    if (this.done) return 0;
    const before = this.shown;
    if (!Number.isFinite(this.lettersPerSecond)) {
      this.complete();
      return this.shown - before;
    }
    if (!(dt > 0)) return 0;
    const pace = Math.max(rate, MIN_RATE);
    const perSecond = this.lettersPerSecond * pace;
    const pauseScale = Math.min(MAX_PAUSE_SCALE, 1 / pace);
    let time = dt * (held ? HOLD_FACTOR : 1);
    while (this.shown < this.chars.length) {
      if (this.wait > 0) {
        if (time <= this.wait) {
          this.wait -= time;
          break;
        }
        time -= this.wait;
        this.wait = 0;
      }
      const letters = this.budget + time * perSecond;
      if (letters < 1) {
        this.budget = letters;
        break;
      }
      time = (letters - 1) / perSecond;
      this.budget = 0;
      this.wait = this.reveal() * pauseScale;
    }
    return this.shown - before;
  }

  /** Muestra la siguiente letra (y lo que la cierra); devuelve la pausa que toca después. */
  private reveal(): number {
    const char = this.chars[this.shown++] ?? '';
    while (CLOSERS.has(this.chars[this.shown] ?? '')) this.shown++;
    const next = this.chars[this.shown];
    // «...»: una sola pausa al final, no una por punto.
    if (next !== undefined && pauseAfter(next) > 0) return 0;
    return pauseAfter(char);
  }
}
