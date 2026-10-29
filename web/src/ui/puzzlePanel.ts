// Panel de los lectores de puzle (Fase 7, hito 7E): el cuaderno del turno (completar la última hora del
// Archivo) y las cartas del Archivo (ordenarlas por cuándo se escribieron de verdad). Diálogo accesible; todo
// entra como texto. La lógica está en reading/puzzles.ts (con tests).
import { LETTERS, NOTEBOOK, type Letter } from '../data/puzzles';
import type { OpenReading } from '../reading/readingSession';
import { checkLetters, formatMinutes, lettersInOrder, notebook } from '../reading/puzzles';

export interface PuzzlePanel {
  /** `onSolved` se llama una vez, al resolverlo. */
  show(reading: OpenReading, onSolved: () => void): void;
  /** Lo anotado al resolverlo (vacío: ya estaba en el Registro). */
  showSolved(noted: readonly string[]): void;
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

function button(text: string, className: string, label?: string): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  return node;
}

/** "4 días allí son 5 en Umbral": el ritmo de un reloj como una comparación, sin fórmulas. */
export function equivalence(rate: number): string {
  if (Math.abs(rate - 1) < 1e-9) return 'Es el reloj de Umbral.';
  for (let there = 1; there <= 10; there++) {
    const here = there / rate;
    if (Math.abs(here - Math.round(here)) < 1e-6) {
      return `${String(there)} ${there === 1 ? 'día' : 'días'} allí son ${String(Math.round(here))} en Umbral.`;
    }
  }
  return `Un día allí son ${(1 / rate).toFixed(1)} en Umbral.`;
}

export function createPuzzlePanel(onClose: () => void, touch: boolean): PuzzlePanel {
  const backdrop = element('div', 'puzzle');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.hidden = true;
  const card = element('article', 'puzzle-card');
  backdrop.append(card);
  document.body.append(backdrop);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) onClose();
  });
  const status = element('p', 'puzzle-status');
  status.setAttribute('role', 'status');
  const noted = element('div', 'puzzle-noted');
  let open = false;

  function notebookBody(solved: boolean, onSolved: () => void): HTMLElement {
    const book = notebook(NOTEBOOK);
    const table = element('table', 'puzzle-notebook');
    const head = element('tr', '');
    head.append(element('th', '', 'Umbral'), element('th', '', NOTEBOOK.other));
    table.append(head);
    let blank: HTMLTableCellElement | undefined;
    book.rows.forEach((row, i) => {
      const line = element('tr', '');
      const last = i === book.rows.length - 1;
      const other = element('td', 'puzzle-cell', last && !solved ? '¿?' : formatMinutes(row.other));
      if (last && !solved) blank = other;
      line.append(element('td', 'puzzle-cell', formatMinutes(row.umbral)), other);
      table.append(line);
    });
    const body = element('div', 'puzzle-body');
    body.append(table);
    if (solved || !blank) return body;
    const choices = element('div', 'puzzle-choices');
    choices.append(
      element('p', 'puzzle-hint', `¿Qué hora anotó el turno en el ${NOTEBOOK.other}?`),
    );
    for (const option of book.options) {
      const choice = button(formatMinutes(option), 'puzzle-choice');
      choice.addEventListener('click', () => {
        if (option !== book.answer) {
          status.textContent = 'No cuadra con cómo se separan las columnas.';
          return;
        }
        if (blank) blank.textContent = formatMinutes(option);
        choices.remove();
        status.textContent = 'Las columnas se separan siempre igual: el Archivo se queda atrás.';
        onSolved();
      });
      choices.append(choice);
    }
    body.append(choices);
    return body;
  }

  function lettersBody(solved: boolean, onSolved: () => void): HTMLElement {
    const byId = new Map(LETTERS.map((l) => [l.id, l]));
    let order: Letter[] = solved
      ? lettersInOrder(LETTERS).flatMap((id) => byId.get(id) ?? [])
      : [...LETTERS];
    const body = element('div', 'puzzle-body');
    const list = element('ol', 'puzzle-letters');
    const check = button('Comprobar el orden', 'puzzle-check');

    function render(): void {
      list.replaceChildren(
        ...order.map((letter, i) => {
          const item = element('li', 'puzzle-letter');
          const text = element('div', 'puzzle-letter-text');
          text.append(
            element('strong', '', letter.title),
            element(
              'span',
              '',
              `Fechada el día ${String(letter.day)} según el reloj de ${letter.clock}.`,
            ),
            element('small', '', equivalence(letter.rate)),
          );
          item.append(text);
          if (!solved) {
            const up = button('↑', 'puzzle-move', `Subir: ${letter.title}`);
            const down = button('↓', 'puzzle-move', `Bajar: ${letter.title}`);
            up.disabled = i === 0;
            down.disabled = i === order.length - 1;
            up.addEventListener('click', () => {
              move(i, -1);
            });
            down.addEventListener('click', () => {
              move(i, 1);
            });
            item.append(up, down);
          }
          return item;
        }),
      );
    }
    function move(index: number, by: number): void {
      const next = [...order];
      const [taken] = next.splice(index, 1);
      if (!taken) return;
      next.splice(index + by, 0, taken);
      order = next;
      render();
      // El foco sigue a la carta movida (el mismo botón, o el otro si ya no se puede mover más).
      const buttons = list.querySelectorAll<HTMLButtonElement>('.puzzle-move');
      const at = (index + by) * 2;
      const same = buttons[at + (by > 0 ? 1 : 0)];
      (same && !same.disabled ? same : buttons[at + (by > 0 ? 0 : 1)])?.focus();
    }
    check.addEventListener('click', () => {
      if (
        !checkLetters(
          LETTERS,
          order.map((l) => l.id),
        )
      ) {
        status.textContent = 'Aún no: alguna contesta antes de que la otra se escribiera.';
        return;
      }
      solved = true;
      check.remove();
      render();
      status.textContent = 'En días de Umbral, cada carta llega después de la anterior.';
      onSolved();
    });
    render();
    body.append(
      element(
        'p',
        'puzzle-hint',
        'Ordénalas de la primera que se escribió a la última, en días de Umbral.',
      ),
      list,
    );
    if (!solved) body.append(check);
    return body;
  }

  return {
    show(reading, onSolved) {
      const title = element('h2', 'puzzle-title', reading.title);
      title.id = 'puzzle-title';
      backdrop.setAttribute('aria-labelledby', title.id);
      const close = button(touch ? 'Cerrar' : 'Cerrar (E)', 'puzzle-close');
      close.addEventListener('click', onClose);
      status.textContent = '';
      noted.replaceChildren();
      const solved = reading.puzzle?.solvedBefore ?? false;
      let done = false;
      const solve = (): void => {
        if (done) return;
        done = true;
        onSolved();
      };
      const parts: HTMLElement[] = [title];
      if (reading.draft) parts.push(element('p', 'puzzle-tag', 'Texto provisional'));
      for (const paragraph of reading.text) parts.push(element('p', 'puzzle-text', paragraph));
      parts.push(
        reading.puzzle?.reader === 'cartas'
          ? lettersBody(solved, solve)
          : notebookBody(solved, solve),
        status,
        noted,
        close,
      );
      card.replaceChildren(...parts);
      backdrop.hidden = false;
      open = true;
      (
        card.querySelector<HTMLButtonElement>('.puzzle-choice, .puzzle-move:not(:disabled)') ??
        close
      ).focus({
        preventScroll: true,
      });
    },
    showSolved(lines) {
      if (lines.length === 0) {
        noted.replaceChildren(element('p', 'puzzle-hint', 'Ya estaba anotado en el Registro.'));
        return;
      }
      const list = element('ul', 'puzzle-noted-list');
      for (const line of lines) list.append(element('li', 'puzzle-noted-item', line));
      noted.replaceChildren(element('p', 'puzzle-noted-title', 'Anotado en el Registro'), list);
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
