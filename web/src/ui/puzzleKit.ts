// Piezas comunes de los lectores de puzle (Fases 7 y 10): nodos, botones y una pregunta de elegir.

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(text: string, className: string, label?: string): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  return node;
}

/** Una fila de una tabla de puzle (celdas de texto). */
export function row(cells: readonly string[], header = false): HTMLTableRowElement {
  const line = element('tr', '');
  for (const cell of cells) line.append(element(header ? 'th' : 'td', 'puzzle-cell', cell));
  return line;
}

export interface Choice<T> {
  prompt: string;
  options: readonly T[];
  answer: T;
  label: (option: T) => string;
  /** Lo que dice el estado al fallar. */
  wrong: string;
}

/** Una pregunta con botones: al acertar se quita y llama a `onRight`; al fallar, avisa en `status`. */
export function choiceQuestion<T>(
  choice: Choice<T>,
  status: HTMLElement,
  onRight: () => void,
): HTMLElement {
  const box = element('div', 'puzzle-choices');
  box.append(element('p', 'puzzle-hint', choice.prompt));
  for (const option of choice.options) {
    const pick = button(choice.label(option), 'puzzle-choice');
    pick.addEventListener('click', () => {
      if (option !== choice.answer) {
        status.textContent = choice.wrong;
        return;
      }
      box.remove();
      onRight();
    });
    box.append(pick);
  }
  return box;
}
