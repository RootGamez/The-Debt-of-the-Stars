// La placa que canta (P7): con las pinzas en los agujeros del símbolo, la arena se junta y dibuja la firma entera.
// No hay nada que hacer en el panel: solo mirar cómo va la arena.
import type { BenchPlay } from '../game/benchPlay';
import { PLATE } from '../puzzles/chladni';
import type { PuzzleBody } from './clockPuzzles';
import { element } from './puzzleKit';
import { t } from '../i18n';

/** Lo que dice la placa según cómo van las pinzas. */
export function plateHint(clamps: number, rings: number, symbol: boolean): string {
  if (symbol)
    return t('La arena se junta en dos aros y tres marcas: la firma entera. La placa canta.');
  if (clamps === 0)
    return t(
      'La placa vibra con el latido de la máquina, pero la arena no dibuja nada. Faltan las pinzas.',
    );
  if (rings === 0)
    return t('La arena corre por la placa y no se queda: ningún agujero es el bueno.');
  if (clamps < PLATE.clamps)
    return t('La arena se queda en {rings} aro(s). Faltan pinzas por poner.', { rings });
  return t(
    'La arena dibuja {rings} aro(s), pero no la firma entera: alguna pinza no está donde toca.',
    { rings },
  );
}

export function plateBody(play: BenchPlay, status: HTMLElement, solve: () => void): PuzzleBody {
  const hint = element('p', 'puzzle-hint');
  const body = element('div', 'puzzle-body');
  body.append(hint);
  const figure = play.figure();
  hint.textContent = plateHint(play.clamps().length, figure.rings, figure.symbol);
  if (figure.symbol) {
    status.textContent = t('La arena dibuja el símbolo entero.');
    solve();
  } else status.textContent = '';
  return { body };
}
