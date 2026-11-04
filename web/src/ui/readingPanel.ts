// Panel de lectura (plan del HUD, C.1 y C.3). Lo que se lee (placas, notas, objetos) es una hoja pegada con cinta
// en el centro: los párrafos se escriben de uno en uno y los anteriores se quedan, más tenues. Las charlas son una
// tira de papel rasgado abajo, frase a frase, con bandas de cine, el retrato y el nombre de quien habla (la
// narración va en cursiva y sin nombre). Se avanza como en un juego: la primera pulsación completa la frase, la
// segunda pasa; mantener pulsado acelera. Al final se escribe a mano lo anotado en el Registro. Diálogo accesible;
// el contenido siempre entra como texto (nunca como HTML).
import type { OpenReading } from '../reading/readingSession';
import { portraitOf, speechLines, voicePitch, type SpeechLine } from '../typewriter/speech';
import { lettersPerSecond, type TextSettings } from '../typewriter/textPreferences';
import { createInkWriter, inkLetters } from './ink';
import { portraitSvg } from './portraits';
import { t } from '../i18n';

/** Mantener pulsado (ratón o dedo) más que esto acelera en vez de avanzar. */
const HOLD_MS = 260;
const ADVANCE_KEYS = new Set(['KeyE', 'Space', 'Enter', 'NumpadEnter']);

export interface ReadingPanel {
  /** `noted`: frases de los hechos que esta lectura acaba de añadir al Registro. */
  show(reading: OpenReading, noted: readonly string[]): void;
  /** Completa la frase o pasa a la siguiente; false si ya no queda nada (toca cerrar). */
  advance(): boolean;
  /** Una vez por fotograma, con el tiempo real (la lectura detiene el del juego). */
  update(dt: number): void;
  hide(): void;
  readonly isOpen: boolean;
  dispose(): void;
}

export interface ReadingPanelOptions {
  onClose: () => void;
  touch: boolean;
  settings: TextSettings;
  reducedMotion: boolean;
  /** Cada pocas letras, con el tono de quien habla (el sonido de letras, si está encendido). */
  onLetters?: (pitch: number) => void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** La flecha que invita a seguir (se mece cuando la frase está entera). */
function nextArrow(): HTMLElement {
  const holder = element('span', 'reader-next');
  holder.setAttribute('aria-hidden', 'true');
  holder.textContent = '▾';
  return holder;
}

export function createReadingPanel(options: ReadingPanelOptions): ReadingPanel {
  const { onClose, touch, settings } = options;
  const backdrop = element('div', 'reader');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.hidden = true;
  const card = element('article', 'reader-card');
  backdrop.append(card);
  document.body.append(backdrop);
  const ink = createInkWriter();
  const abort = new AbortController();
  const { signal } = abort;

  let open = false;
  let lines: SpeechLine[] = [];
  let paragraphs: HTMLParagraphElement[] = [];
  let index = -1;
  let notes: HTMLElement | undefined;
  let close: HTMLButtonElement | undefined;
  let portrait: HTMLElement | undefined;
  let held = false;
  let holdTimer: number | undefined;
  /** El último toque fue largo: al soltar no avanza. */
  let wasHeld = false;

  function speed(): number {
    return options.reducedMotion ? Infinity : lettersPerSecond(settings.current.speed);
  }

  function label(last: boolean): string {
    const word = last ? t('Cerrar') : t('Seguir');
    return touch ? word : `${word} (E)`;
  }

  function paragraphDone(): void {
    portrait?.classList.remove('is-talking');
    backdrop.classList.add('is-ready');
    if (index >= lines.length - 1) {
      notes?.classList.add('is-written');
      if (close) close.textContent = label(true);
    }
  }

  function startParagraph(next: number): void {
    index = next;
    const line = lines[next];
    const target = paragraphs[next];
    if (!line || !target) return;
    paragraphs.forEach((p, k) => {
      p.classList.toggle('is-current', k === next);
      p.classList.toggle('is-past', k < next);
    });
    card.classList.toggle('is-narration', line.speaker === undefined);
    portrait?.classList.add('is-talking');
    backdrop.classList.remove('is-ready');
    ink.write(target, line.text, {
      lettersPerSecond: speed(),
      onLetters: () => options.onLetters?.(voicePitch(line.speaker)),
      onDone: paragraphDone,
    });
  }

  function advance(): boolean {
    if (!open) return false;
    if (ink.typing) {
      ink.complete();
      return true;
    }
    if (index < lines.length - 1) {
      startParagraph(index + 1);
      return true;
    }
    return false;
  }

  function advanceOrClose(): void {
    if (!advance()) onClose();
  }

  function notesOf(reading: OpenReading, noted: readonly string[]): HTMLElement {
    const box = element('div', 'reader-notes');
    if (noted.length > 0) {
      const list = element('ul', 'reader-noted');
      for (const line of noted) list.append(element('li', 'reader-noted-item', line));
      box.append(element('p', 'reader-noted-title', t('Anotado en el Registro')), list);
    }
    if (reading.deepPending) {
      box.append(element('p', 'reader-hint', t('Hay algo más aquí que aún no sabes leer.')));
    }
    return box;
  }

  function build(reading: OpenReading, noted: readonly string[]): HTMLElement[] {
    const talk = reading.source.kind === 'charla';
    const title = element('h2', 'reader-title', reading.title);
    title.id = 'reader-title';
    backdrop.setAttribute('aria-labelledby', title.id);
    close = element('button', 'reader-close', label(lines.length <= 1));
    close.type = 'button';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      advanceOrClose();
    });
    close.addEventListener('keydown', (event) => {
      // Intro mantenido repetiría el clic: mantener solo acelera.
      if (event.repeat) event.preventDefault();
    });
    const paras = element('div', 'reader-paras');
    // Todo el texto está desde el principio, invisible: las pruebas y los lectores de pantalla lo encuentran entero.
    paragraphs = lines.map((line) => {
      const paragraph = element('p', 'reader-text');
      inkLetters(paragraph, line.text);
      return paragraph;
    });
    paras.append(...paragraphs);
    notes = notesOf(reading, noted);
    const foot = element('div', 'reader-foot');
    foot.append(nextArrow(), close);
    const tags: HTMLElement[] = [];
    if (reading.level === 'deep') tags.push(element('p', 'reader-tag', t('Lectura más profunda')));
    if (reading.draft) tags.push(element('p', 'reader-tag', t('Texto provisional')));
    if (!talk) {
      portrait = undefined;
      return [title, ...tags, paras, notes, foot];
    }
    portrait = element('div', 'reader-portrait');
    portrait.append(portraitSvg(portraitOf(reading.source.id)));
    const body = element('div', 'reader-body');
    body.append(title, ...tags, paras, notes, foot);
    return [portrait, body];
  }

  backdrop.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button > 0) return;
      window.clearTimeout(holdTimer);
      wasHeld = false;
      holdTimer = window.setTimeout(() => {
        held = wasHeld = true;
      }, HOLD_MS);
    },
    { signal },
  );
  const release = (): void => {
    window.clearTimeout(holdTimer);
    held = false;
  };
  backdrop.addEventListener('pointerup', release, { signal });
  backdrop.addEventListener('pointercancel', release, { signal });
  backdrop.addEventListener(
    'click',
    () => {
      if (wasHeld) {
        wasHeld = false;
        return;
      }
      advanceOrClose();
    },
    { signal },
  );
  // Mantener E, Espacio o Intro acelera la escritura (la pulsación suelta la lleva readingUi.ts).
  window.addEventListener(
    'keydown',
    (event) => {
      if (open && event.repeat && ADVANCE_KEYS.has(event.code)) held = true;
    },
    { signal },
  );
  window.addEventListener(
    'keyup',
    (event) => {
      if (ADVANCE_KEYS.has(event.code)) held = false;
    },
    { signal },
  );

  return {
    show(reading, noted) {
      const talk = reading.source.kind === 'charla';
      lines = talk
        ? speechLines(reading.text, reading.title)
        : reading.text.map((text) => ({ text, speaker: undefined }));
      if (lines.length === 0) lines = [{ text: '', speaker: undefined }];
      backdrop.classList.toggle('reader--charla', talk);
      card.classList.toggle('reader-strip', talk);
      card.classList.toggle('reader-sheet', !talk);
      card.replaceChildren(...build(reading, noted));
      backdrop.hidden = false;
      open = true;
      held = false;
      startParagraph(0);
      close?.focus({ preventScroll: true });
    },
    advance,
    update(dt) {
      if (open) ink.update(dt, held);
    },
    hide() {
      ink.stop();
      backdrop.hidden = true;
      backdrop.classList.remove('is-ready');
      open = false;
      held = false;
    },
    get isOpen() {
      return open;
    },
    dispose() {
      abort.abort();
      window.clearTimeout(holdTimer);
      backdrop.remove();
    },
  };
}
