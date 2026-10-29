// Reproductor de grabaciones: lo que se oye al pulsarla, las frases que van saliendo (deformadas mientras
// no se entienden), la rueda de velocidad, la claridad y, al entenderla entera, lo anotado en el Registro.
// Diálogo accesible; todo el contenido entra como texto (nunca como HTML). La lógica está en
// reading/recording.ts; esto solo la dibuja.
import type { OpenReading } from '../reading/readingSession';
import { sliderFromSpeed, speedFromSlider, type PlaybackView } from '../reading/recording';

export interface RecordingPanel {
  show(reading: OpenReading, startSpeed: number): void;
  /** Una vez por fotograma mientras está abierto. */
  update(view: PlaybackView): void;
  /** Se entendió entera: `noted` son las frases de los hechos nuevos (vacío si ya se sabían). */
  showUnderstood(noted: readonly string[]): void;
  hide(): void;
  readonly isOpen: boolean;
  dispose(): void;
}

/** Cuánto mueve la rueda cada pulsación (de 0 a 1; unas 23 pulsaciones de ×1 a ×5). */
const WHEEL_STEP = 0.02;

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

/** "×2,5": la velocidad como se lee en español. */
export function formatSpeed(speed: number): string {
  return `×${speed.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

function statusOf(clarity: number, understood: boolean): string {
  if (understood) return 'Entendida entera.';
  if (clarity >= 1) return 'Se entiende. Escúchala entera.';
  if (clarity > 0.5) return 'Casi se entiende.';
  if (clarity > 0) return 'Se adivina alguna palabra.';
  return 'No se entiende nada.';
}

export function createRecordingPanel(
  onClose: () => void,
  onSpeed: (speed: number) => void,
  touch: boolean,
): RecordingPanel {
  // Clases propias (recorder-*) con el mismo estilo que el panel de lectura, para no confundirse con él.
  const backdrop = element('div', 'recorder');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.hidden = true;
  const card = element('article', 'recorder-card');
  backdrop.append(card);
  document.body.append(backdrop);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) onClose();
  });

  const tape = element('div', 'recorder-tape');
  const wheel = element('input', 'recorder-wheel');
  wheel.type = 'range';
  wheel.id = 'recorder-wheel';
  wheel.min = '0';
  wheel.max = '1';
  wheel.step = String(WHEEL_STEP);
  const speedLabel = element('output', 'recorder-speed');
  speedLabel.htmlFor.add(wheel.id);
  const fill = element('div', 'recorder-meter-fill');
  const meter = element('div', 'recorder-meter');
  meter.setAttribute('role', 'meter');
  meter.setAttribute('aria-label', 'Claridad');
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', '100');
  meter.append(fill);
  const status = element('p', 'recorder-status');
  status.setAttribute('role', 'status');
  const noted = element('div', 'recorder-noted');

  let open = false;
  let lineNodes: HTMLParagraphElement[] = [];
  let shownStatus = '';
  let shownClarity = -1;

  function setSpeedFromWheel(): void {
    const speed = speedFromSlider(Number(wheel.value));
    const label = formatSpeed(speed);
    speedLabel.textContent = label;
    wheel.setAttribute('aria-valuetext', label);
    onSpeed(speed);
  }
  wheel.addEventListener('input', setSpeedFromWheel);

  function stepButton(text: string, label: string, direction: 1 | -1): HTMLButtonElement {
    const button = element('button', 'recorder-step', text);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => {
      wheel.value = String(Math.min(1, Math.max(0, Number(wheel.value) + direction * WHEEL_STEP)));
      setSpeedFromWheel();
    });
    return button;
  }

  return {
    show(reading, startSpeed) {
      const title = element('h2', 'recorder-title', reading.title);
      title.id = 'recorder-title';
      backdrop.setAttribute('aria-labelledby', title.id);
      const close = element('button', 'recorder-close', touch ? 'Cerrar' : 'Cerrar (E)');
      close.type = 'button';
      close.addEventListener('click', onClose);

      const lines = reading.recording?.lines ?? [];
      lineNodes = lines.map(() => element('p', 'recorder-line'));
      tape.replaceChildren(...lineNodes);
      noted.replaceChildren();
      shownStatus = '';
      shownClarity = -1;
      wheel.value = String(sliderFromSpeed(startSpeed));
      speedLabel.textContent = formatSpeed(startSpeed);
      wheel.setAttribute('aria-valuetext', formatSpeed(startSpeed));

      const wheelLabel = element('label', 'recorder-label', 'Velocidad');
      wheelLabel.htmlFor = wheel.id;
      const controls = element('div', 'recorder-controls');
      controls.append(
        wheelLabel,
        stepButton('−', 'Más lento', -1),
        wheel,
        stepButton('+', 'Más rápido', 1),
        speedLabel,
      );
      const clarityRow = element('div', 'recorder-clarity');
      clarityRow.append(element('span', 'recorder-label', 'Claridad'), meter);
      const hint = touch
        ? 'Mueve la rueda hasta que la voz se entienda.'
        : 'Mueve la rueda (← →) hasta que la voz se entienda.';

      const parts: HTMLElement[] = [title];
      if (reading.draft) parts.push(element('p', 'recorder-tag', 'Texto provisional'));
      for (const paragraph of reading.text) parts.push(element('p', 'recorder-text', paragraph));
      parts.push(
        tape,
        controls,
        clarityRow,
        status,
        element('p', 'recorder-hint', hint),
        noted,
        close,
      );
      card.replaceChildren(...parts);
      backdrop.hidden = false;
      open = true;
      wheel.focus({ preventScroll: true });
    },
    update(view) {
      view.lines.forEach((line, i) => {
        const node = lineNodes[i];
        if (!node) return;
        if (node.textContent !== line.text) node.textContent = line.text;
        if (node.dataset.state !== line.state) {
          node.dataset.state = line.state;
          // La cinta sigue a la frase que suena (sin mover la página).
          if (line.state === 'playing') node.scrollIntoView({ block: 'nearest' });
        }
        if ((node.dataset.heard === 'true') !== line.heard) node.dataset.heard = String(line.heard);
      });
      const percent = Math.round(view.clarity * 100);
      if (percent !== shownClarity) {
        shownClarity = percent;
        fill.style.width = `${String(percent)}%`;
        meter.setAttribute('aria-valuenow', String(percent));
      }
      const text = statusOf(view.clarity, view.understood);
      if (text !== shownStatus) {
        shownStatus = text;
        status.textContent = text;
      }
    },
    showUnderstood(lines) {
      if (lines.length === 0) {
        noted.replaceChildren(element('p', 'recorder-hint', 'Ya estaba anotado en el Registro.'));
        return;
      }
      const list = element('ul', 'recorder-noted-list');
      for (const line of lines) list.append(element('li', 'recorder-noted-item', line));
      noted.replaceChildren(element('p', 'recorder-noted-title', 'Anotado en el Registro'), list);
    },
    hide() {
      backdrop.hidden = true;
      open = false;
    },
    get isOpen() {
      return open;
    },
    dispose() {
      backdrop.remove();
    },
  };
}
