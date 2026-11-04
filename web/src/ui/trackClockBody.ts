// El reloj de la Pista de Pruebas del Taller (Fase 11F): la hora del Taller y la de la Pista, una al lado de la otra,
// y dos ruedas (minutos y segundos) para igualarlas. Con el reloj en hora, el anillo de la Pista se enciende durante
// la secuencia de las 7:00. Lo que hacen las ruedas está en game/teleporter.ts (con tests).
import { formatClock } from '../core/loopClock';
import type { TrackClock } from '../game/teleporter';
import type { PuzzleBody } from './clockPuzzles';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

const WHEELS = [
  { wheel: 'minutes', name: 'Minutos' },
  { wheel: 'seconds', name: 'Segundos' },
] as const;

export function trackClockBody(
  track: TrackClock,
  status: HTMLElement,
  solve: () => void,
): PuzzleBody {
  const hint = element(
    'p',
    'puzzle-hint',
    t(
      'El anillo de la Pista no se enciende con su reloj desajustado. Gira las ruedas hasta que marque la hora del Taller.',
    ),
  );
  const list = element('ul', 'puzzle-console');
  const taller = element('span', 'puzzle-console-time');
  const own = element('span', 'puzzle-console-time');
  for (const [name, readout] of [
    [t('El Taller'), taller],
    [t('La Pista'), own],
  ] as const) {
    const line = element('li', 'puzzle-console-line');
    line.append(element('span', 'puzzle-console-name', name), readout);
    list.append(line);
  }
  const controls = element('div', 'puzzle-wheels');

  function paint(): void {
    const reading = track.read();
    taller.textContent = formatClock(reading.taller);
    own.textContent = formatClock(reading.track);
    if (reading.matched) {
      status.textContent = t('Los dos relojes marcan lo mismo.');
      solve();
    } else status.textContent = '';
  }

  for (const { wheel, name } of WHEELS) {
    const row = element('div', 'puzzle-wheel-row');
    const back = button('−', 'puzzle-wheel', `${name}: atrasar`);
    const forward = button('+', 'puzzle-wheel', `${name}: adelantar`);
    back.addEventListener('click', () => {
      track.turn(wheel, -1);
      paint();
    });
    forward.addEventListener('click', () => {
      track.turn(wheel, 1);
      paint();
    });
    row.append(back, element('span', 'puzzle-wheel-name', name), forward);
    controls.append(row);
  }
  paint();
  const body = element('div', 'puzzle-body');
  body.append(hint, list, controls);
  return { body };
}
