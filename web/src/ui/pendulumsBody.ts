// La viga de los péndulos (P3): mientras los cinco se mecen al unísono, la viga tiembla y el cerrojo no cede; con
// los largos de la figura se sueltan y se calma. No hay nada que hacer en el panel: solo mirar cómo van.
import type { DepthsPlay } from '../game/depthsPlay';
import { coupled } from '../puzzles/pendulums';
import type { PuzzleBody } from './clockPuzzles';
import { element } from './puzzleKit';
import { t } from '../i18n';

/** Lo que dice la viga según cómo cuelgan los péndulos. */
export function beamHint(lengths: readonly number[], open: boolean): string {
  if (open) {
    return t('Los cinco péndulos van cada uno a su paso. La viga se calma y el cerrojo cae.');
  }
  if (coupled(lengths)) {
    return t('Los cinco péndulos se mecen a la vez y la viga tiembla. El cerrojo no cede.');
  }
  return t('Los péndulos ya no van juntos, pero la viga sigue temblando: aún no es la figura.');
}

export function pendulumsBody(
  play: DepthsPlay,
  status: HTMLElement,
  solve: () => void,
): PuzzleBody {
  const hint = element('p', 'puzzle-hint');
  const body = element('div', 'puzzle-body');
  body.append(hint);
  const open = play.hatchOpen;
  hint.textContent = beamHint(play.lengths(), open);
  if (open) {
    status.textContent = t('La trampilla de la Sala Cerrada está abierta.');
    solve();
  } else status.textContent = '';
  return { body };
}
