// La mesa del Planetario (P2): su manivela no gira hasta que las cinco esferas están en sus rieles; al pararse, da la
// hora de la alineación. No hay nada que hacer en el panel: solo mirar cómo va.
import type { ArchivoPlay } from '../game/archivoPlay';
import { ORRERY } from '../puzzles/orrery';
import type { PuzzleBody } from './clockPuzzles';
import { element } from './puzzleKit';
import { t } from '../i18n';

/** Lo que dice la mesa según cómo van las esferas. */
export function orreryHint(placed: number, right: boolean, aligned: boolean): string {
  if (aligned)
    return t('La manivela se ha parado: las esferas quedan en una misma línea. Son las 6:30.');
  if (right)
    return t('Las esferas empiezan a girar, cada una a su paso. La manivela aún no se ha parado.');
  if (placed === 0) return t('Seis rieles y una manivela que no gira. Faltan las esferas.');
  if (placed < ORRERY.spheres.length) {
    return t('La manivela no gira. Hay {placed} de {total} esferas en sus rieles.', {
      placed,
      total: ORRERY.spheres.length,
    });
  }
  return t('La manivela no gira: algo no está en su sitio.');
}

export function orreryBody(play: ArchivoPlay, status: HTMLElement, solve: () => void): PuzzleBody {
  const hint = element('p', 'puzzle-hint');
  const body = element('div', 'puzzle-body');
  body.append(hint);
  const aligned = play.crank >= 1;
  hint.textContent = orreryHint(Object.keys(play.placement()).length, play.orreryRight, aligned);
  if (aligned) {
    status.textContent = t('Las esferas están alineadas.');
    solve();
  } else status.textContent = '';
  return { body };
}
