// La tarjeta del final (Fase 10E): título, texto y botones, encima de todo, al cerrar el viaje con la Directora. Es un
// diálogo propio: el juego ya no sigue detrás (quien la abre suelta el ratón e inhabilita la pausa).
import type { EndingCard } from '../data/endings';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

export interface EndingChoice {
  label: string;
  run(): void;
}

/**
 * Cerrado el viaje ya no hay vuelta al juego: ninguna tecla llega a sus atajos (Esc pausa, R y Tab abren el Registro).
 * Lo que hace el navegador por su cuenta sigue: Intro y Espacio pulsan el botón con el foco.
 */
export function lockGameKeys(): void {
  window.addEventListener(
    'keydown',
    (event) => {
      event.stopPropagation();
    },
    { capture: true },
  );
}

/**
 * Enseña la tarjeta y lleva el foco a su primer botón; `note`, un aviso bajo el texto (no se pudo guardar). Devuelve
 * el diálogo.
 */
export function showEndingCard(
  card: EndingCard,
  choices: readonly EndingChoice[],
  note?: string,
): HTMLElement {
  const dialog = element('div', 'ending');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'ending-title');
  dialog.setAttribute('aria-describedby', 'ending-body');
  const sheet = element('div', 'ending-card');
  const title = element('h2', 'ending-title', card.title);
  title.id = 'ending-title';
  sheet.append(title);
  if (card.draft) sheet.append(element('p', 'reader-tag', t('Texto provisional')));
  const body = element('div', 'ending-body');
  body.id = 'ending-body';
  for (const paragraph of card.text) body.append(element('p', 'ending-text', paragraph));
  if (note) body.append(element('p', 'reader-tag', note));
  sheet.append(body);
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
  actions.querySelector('button')?.focus();
  return dialog;
}
