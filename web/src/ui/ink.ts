// La tinta de los textos que se escriben solos (plan del HUD, B.2 y B.4). Cada letra ocupa su sitio desde el
// principio (invisible), así las líneas no saltan mientras se escribe; las palabras no se parten. Al aparecer, la
// letra brilla como tinta de filamento que se seca. El lector de pantalla no oye letra a letra: recibe la frase
// entera al terminar, por una región viva aparte. La lógica de cuántas letras se ven está en typewriter/typewriter.ts.
import { Typewriter } from '../typewriter/typewriter';

/** Un «bip» cada tantas letras (no en cada una: cansaría). */
const LETTERS_PER_BLIP = 2;

export interface InkOptions {
  lettersPerSecond: number;
  /** Ritmo del reloj donde se dijo (1 = normal). */
  rate?: number;
  /** Cada pocas letras (para el sonido de letras). */
  onLetters?: () => void;
  /** Cuando la frase está entera (por sí sola o porque el jugador la completó). */
  onDone?: () => void;
}

export interface InkWriter {
  /** Escribe `text` en `target`, que se vacía antes. */
  write(target: HTMLElement, text: string, options: InkOptions): void;
  /** Una vez por fotograma, con el tiempo real. */
  update(dt: number, held: boolean): void;
  /** La frase entera, ya. */
  complete(): void;
  /** Deja de escribir sin terminar (al cerrar el panel). */
  stop(): void;
  readonly typing: boolean;
}

/** Las letras de `text` como piezas sueltas dentro de `target`; las palabras van juntas. */
export function inkLetters(target: HTMLElement, text: string): HTMLSpanElement[] {
  target.replaceChildren();
  const letters: HTMLSpanElement[] = [];
  for (const part of text.split(/(\s+)/)) {
    if (part === '') continue;
    const holder = /^\s+$/.test(part) ? target : document.createElement('span');
    if (holder !== target) {
      holder.className = 'ink-w';
      target.append(holder);
    }
    for (const char of part) {
      const letter = document.createElement('span');
      letter.className = 'ink-c';
      letter.textContent = char;
      holder.append(letter);
      letters.push(letter);
    }
  }
  return letters;
}

let liveRegion: HTMLElement | undefined;

/** Anuncia una frase entera a los lectores de pantalla, sin robar el foco. */
export function announce(text: string): void {
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement('p');
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.append(liveRegion);
  }
  liveRegion.textContent = text;
}

export function createInkWriter(): InkWriter {
  let letters: HTMLSpanElement[] = [];
  let writer: Typewriter | undefined;
  let options: InkOptions | undefined;
  let text = '';
  let sinceBlip = 0;

  function reveal(from: number, to: number): void {
    for (let i = from; i < to; i++) {
      const letter = letters[i];
      if (!letter) continue;
      letter.classList.add('on');
      if (letter.textContent.trim()) sinceBlip++;
    }
    if (sinceBlip >= LETTERS_PER_BLIP) {
      sinceBlip = 0;
      options?.onLetters?.();
    }
  }

  function finish(): void {
    const done = options?.onDone;
    writer = undefined;
    options = undefined;
    announce(text);
    done?.();
  }

  return {
    write(target, value, opts) {
      text = value;
      letters = inkLetters(target, value);
      writer = new Typewriter(value, opts.lettersPerSecond);
      options = opts;
      sinceBlip = 0;
      // «Al instante» (o reducir movimiento): todo de golpe, sin esperar al fotograma siguiente.
      if (!Number.isFinite(opts.lettersPerSecond)) {
        writer.complete();
        reveal(0, letters.length);
        finish();
      }
    },
    update(dt, held) {
      if (!writer) return;
      const before = writer.visible;
      writer.step(dt, options?.rate ?? 1, held);
      reveal(before, writer.visible);
      if (writer.done) finish();
    },
    complete() {
      if (!writer) return;
      const before = writer.visible;
      writer.complete();
      for (let i = before; i < letters.length; i++) letters[i]?.classList.add('on', 'ya');
      finish();
    },
    stop() {
      writer = undefined;
      options = undefined;
    },
    get typing() {
      return writer !== undefined;
    },
  };
}
