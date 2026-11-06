// El atril de las campanas (P1): la tapa está cerrada hasta que las cuatro campanas suenan a compás; entonces se
// abre y da la canción de los mundos. No hay nada que hacer aquí: solo mirar cómo van las campanas.
import type { BellsPlay } from '../game/bellsPlay';
import { BELLS } from '../puzzles/bells';
import type { PuzzleBody } from './clockPuzzles';
import { element } from './puzzleKit';
import { t } from '../i18n';

/** Lo que dice el atril según cómo van las campanas. */
export function lecternHint(placed: number, solved: boolean): string {
  if (solved) return t('Las cuatro campanas suenan a compás. La tapa se ha abierto.');
  if (placed === 0) {
    return t('La tapa no cede. Debajo se oye un mecanismo que espera algo: un compás.');
  }
  if (placed < BELLS.count) {
    return t('La tapa no cede. Hay {placed} de {total} campanas en el canal.', {
      placed,
      total: BELLS.count,
    });
  }
  return t('La tapa no cede: las campanas suenan, pero no a compás.');
}

export function bellsBody(play: BellsPlay, status: HTMLElement, solve: () => void): PuzzleBody {
  const hint = element('p', 'puzzle-hint');
  const body = element('div', 'puzzle-body');
  body.append(hint);
  const solved = play.solved;
  hint.textContent = lecternHint(play.placedMarks().length, solved);
  if (solved) {
    status.textContent = t('La tapa del atril está abierta.');
    solve();
  } else status.textContent = '';
  return { body };
}
