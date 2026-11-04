// Las bocas de casa (Fase 10D): el atril del Archivo de las Puertas enseña lo que se ve al otro lado de cada una;
// con K7, su desfase; con K8, el día de la prueba mayor. Se elige una y se cruza, con una confirmación: no hay
// vuelta atrás. No hay cuenta que hacer en el juego: solo comparar días. La lógica está en game/epilogue.ts (con
// tests).
import {
  arrivesBefore,
  mouthById,
  mouthRows,
  testDayLine,
  type MouthId,
  type MouthKnowledge,
} from '../game/epilogue';
import type { PuzzleBody } from './clockPuzzles';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

export interface MouthsReader {
  /** Lo que se ha entendido ahora (K7, K8). */
  knowledge(): MouthKnowledge;
  carryingPlans(): boolean;
  /** Cruza por la boca: el juego cierra la lectura y funde. */
  cross(id: MouthId): void;
}

const HINT = t('Cuatro bocas de casa. Al otro lado de cada una, Hogar.');

export function mouthsBody(
  reader: MouthsReader,
  status: HTMLElement,
  solve: () => void,
): PuzzleBody {
  const knowledge = reader.knowledge();
  const body = element('div', 'puzzle-body');
  const list = element('ul', 'puzzle-mouths');
  const confirm = element('div', 'puzzle-choices');
  confirm.hidden = true;
  confirm.setAttribute('role', 'group');
  confirm.setAttribute('aria-labelledby', 'puzzle-mouth-question');

  function ask(id: MouthId, view: string, pick: HTMLButtonElement): void {
    status.textContent = '';
    const go = button(t('Cruzar'), 'puzzle-choice');
    const wait = button(t('Todavía no'), 'puzzle-choice');
    const question = element(
      'p',
      'puzzle-hint',
      t('¿Cruzar hacia «{view}»? No hay vuelta atrás.', { view }),
    );
    question.id = 'puzzle-mouth-question';
    const lines = [question];
    if (reader.carryingPlans()) {
      lines.push(element('p', 'puzzle-hint', t('Llevas los planos del Contrapeso.')));
    }
    go.addEventListener('click', () => {
      const mouth = mouthById(id);
      if (mouth && arrivesBefore(mouth)) solve();
      reader.cross(id);
    });
    wait.addEventListener('click', () => {
      confirm.hidden = true;
      confirm.replaceChildren();
      pick.focus({ preventScroll: true });
    });
    confirm.replaceChildren(...lines, go, wait);
    confirm.hidden = false;
    wait.focus({ preventScroll: true });
  }

  for (const row of mouthRows(knowledge)) {
    const line = element('li', 'puzzle-mouth');
    line.append(element('p', 'puzzle-mouth-view', row.view));
    if (!row.open) {
      line.append(element('p', 'puzzle-mouth-note', t('Cerrada.')));
      list.append(line);
      continue;
    }
    if (row.seen) line.append(element('p', 'puzzle-mouth-note', row.seen));
    if (row.offset) line.append(element('p', 'puzzle-mouth-note', row.offset));
    const pick = button(t('Elegir'), 'puzzle-choice', `${t('Elegir')}: ${row.view}`);
    pick.addEventListener('click', () => {
      ask(row.id, row.view, pick);
    });
    line.append(pick);
    list.append(line);
  }
  body.append(element('p', 'puzzle-hint', testDayLine(knowledge) ?? HINT), list, confirm);
  return { body };
}
