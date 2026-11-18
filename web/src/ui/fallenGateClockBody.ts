// El reloj de un portal caído (hito E4 de docs/plan-finales.md §3.2): la hora de fuera y la del portal, una al lado de
// la otra, y dos ruedas (minutos y segundos) para ponerlo en hora. Genérico: lo usa el reloj del muelle del Nudo y
// puede usarlo el del Taller. Las reglas están en game/fallenGate.ts y game/fallenGatePlay.ts (con tests). Mientras se
// lee el ciclo no corre, así que basta con pintar al abrir y con cada vuelta de rueda.
import { formatClock } from '../core/loopClock';
import type { FallenWheel } from '../game/fallenGate';
import type { FallenGatePlay } from '../game/fallenGatePlay';
import type { PuzzleBody } from './clockPuzzles';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

/** Los textos del lector, ya traducidos. */
export interface FallenGateClockLabels {
  hint: string;
  /** El nombre del reloj de fuera y el del portal. */
  outside: string;
  gate: string;
}

const WHEELS: readonly FallenWheel[] = ['minutes', 'seconds'];
const wheelName = (wheel: FallenWheel): string =>
  wheel === 'minutes' ? t('Minutos') : t('Segundos');

function readouts(labels: FallenGateClockLabels): {
  list: HTMLElement;
  outside: HTMLElement;
  own: HTMLElement;
} {
  const list = element('ul', 'puzzle-console');
  const outside = element('span', 'puzzle-console-time');
  const own = element('span', 'puzzle-console-time');
  for (const [name, readout] of [
    [labels.outside, outside],
    [labels.gate, own],
  ] as const) {
    const line = element('li', 'puzzle-console-line');
    line.append(element('span', 'puzzle-console-name', name), readout);
    list.append(line);
  }
  return { list, outside, own };
}

/** El lector del reloj del portal `id`; `status` es la línea de estado del panel. */
export function fallenGateClockBody(
  play: FallenGatePlay,
  id: string,
  labels: FallenGateClockLabels,
  status: HTMLElement,
): PuzzleBody {
  const rate = play.gate(id)?.spec.rate ?? 1;
  const { list, outside, own } = readouts(labels);
  const controls = element('div', 'puzzle-wheels');

  function paint(): void {
    const reading = play.reading(id);
    if (!reading) return;
    outside.textContent = formatClock(reading.target / rate);
    own.textContent = formatClock(reading.shown);
    if (play.lit(id)) status.textContent = t('La Puerta está encendida.');
    else
      status.textContent = reading.matched
        ? t('El reloj está en hora. La Puerta se enciende.')
        : '';
  }

  for (const wheel of WHEELS) {
    const name = wheelName(wheel);
    const row = element('div', 'puzzle-wheel-row');
    const back = button('−', 'puzzle-wheel', `${name}: ${t('atrasar')}`);
    const forward = button('+', 'puzzle-wheel', `${name}: ${t('adelantar')}`);
    const turn = (steps: number): void => {
      play.turn(id, wheel, steps);
      paint();
    };
    back.addEventListener('click', () => {
      turn(-1);
    });
    forward.addEventListener('click', () => {
      turn(1);
    });
    row.append(back, element('span', 'puzzle-wheel-name', name), forward);
    controls.append(row);
  }
  paint();
  const body = element('div', 'puzzle-body');
  body.append(element('p', 'puzzle-hint', labels.hint), list, controls);
  return { body };
}
