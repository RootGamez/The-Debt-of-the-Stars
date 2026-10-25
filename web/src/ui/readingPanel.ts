// Panel de lectura: muestra el texto de una fuente, lo que se ha anotado en el Registro y, si hay,
// el aviso de una lectura más profunda aún cerrada. Diálogo accesible; el contenido siempre entra
// como texto (nunca como HTML).
import type { OpenReading } from '../reading/readingSession';

export interface ReadingPanel {
  /** `noted`: frases de los hechos que esta lectura acaba de añadir al Registro. */
  show(reading: OpenReading, noted: readonly string[]): void;
  hide(): void;
  readonly isOpen: boolean;
  dispose(): void;
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

export function createReadingPanel(onClose: () => void, touch: boolean): ReadingPanel {
  const backdrop = element('div', 'reader');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.hidden = true;
  const card = element('article', 'reader-card');
  backdrop.append(card);
  document.body.append(backdrop);
  let open = false;

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) onClose();
  });

  return {
    show(reading, noted) {
      const title = element('h2', 'reader-title', reading.title);
      title.id = 'reader-title';
      backdrop.setAttribute('aria-labelledby', title.id);
      const close = element('button', 'reader-close', touch ? 'Cerrar' : 'Cerrar (E)');
      close.type = 'button';
      close.addEventListener('click', onClose);

      const parts: HTMLElement[] = [title];
      if (reading.level === 'deep') parts.push(element('p', 'reader-tag', 'Lectura más profunda'));
      if (reading.draft) parts.push(element('p', 'reader-tag', 'Texto provisional'));
      for (const paragraph of reading.text) parts.push(element('p', 'reader-text', paragraph));
      if (noted.length > 0) {
        const list = element('ul', 'reader-noted');
        for (const line of noted) list.append(element('li', 'reader-noted-item', line));
        parts.push(element('p', 'reader-noted-title', 'Anotado en el Registro'), list);
      }
      if (reading.deepPending) {
        parts.push(element('p', 'reader-hint', 'Hay algo más aquí que aún no sabes leer.'));
      }
      parts.push(close);
      card.replaceChildren(...parts);
      backdrop.hidden = false;
      open = true;
      close.focus({ preventScroll: true });
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
