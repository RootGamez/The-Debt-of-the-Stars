// La tarjeta del final (Fase 10E): título, texto y botones, encima de todo, al cerrar el viaje con la Directora. Es un
// diálogo propio: el juego ya no sigue detrás (quien la abre suelta el ratón e inhabilita la pausa).
import type { EndingCard } from '../data/endings';
import { button, element } from './puzzleKit';

export interface EndingChoice {
  label: string;
  run(): void;
}

/** Enseña la tarjeta y lleva el foco a su primer botón. Devuelve el diálogo (para los tests y para quitarlo). */
export function showEndingCard(card: EndingCard, choices: readonly EndingChoice[]): HTMLElement {
  const dialog = element('div', 'ending');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'ending-title');
  const sheet = element('div', 'ending-card');
  const title = element('h2', 'ending-title', card.title);
  title.id = 'ending-title';
  sheet.append(title);
  if (card.draft) sheet.append(element('p', 'reader-tag', 'Texto provisional'));
  for (const paragraph of card.text) sheet.append(element('p', 'ending-text', paragraph));
  const actions = element('div', 'ending-actions');
  for (const choice of choices) {
    const pick = button(choice.label, 'ending-choice');
    pick.addEventListener('click', () => {
      choice.run();
    });
    actions.append(pick);
  }
  sheet.append(actions);
  dialog.append(sheet);
  document.body.append(dialog);
  actions.querySelector('button')?.focus({ preventScroll: true });
  return dialog;
}
