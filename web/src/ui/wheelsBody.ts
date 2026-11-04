// Las ruedas de la cuna del núcleo (Fase 10C): el reloj de la máquina y el del Contrapeso, uno al lado del otro, y
// dos ruedas (minutos y segundos) para igualarlos. No hay cuenta: solo comparar dos relojes. Al coincidir se anota
// que su reloj importa. Lo que hacen las ruedas está en game/counterweightPlay.ts (con tests).
import { formatClock } from '../core/loopClock';
import type { CounterweightWheels, WheelsReading } from '../game/counterweightPlay';
import type { PuzzleBody } from './clockPuzzles';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

const WHEELS = [
  { wheel: 'minutes', name: 'Minutos' },
  { wheel: 'seconds', name: 'Segundos' },
] as const;

/** Lo que dice la cuna según lo que tiene. */
export function cradleHint(reading: WheelsReading): string {
  switch (reading.place) {
    case 'cradle':
      return t(
        'Gira las ruedas hasta que los dos relojes marquen lo mismo. El pulso de las 9:00 hará el resto.',
      );
    case 'installed':
      return t('El Contrapeso ya está en el núcleo.');
    case 'rejected':
      return t(
        'El pulso lo ha rechazado: los dos relojes no coincidían. Habrá que volver a intentarlo.',
      );
    default:
      return reading.motorOut
        ? t('El núcleo está abierto. La cuna espera el Contrapeso.')
        : t('El motor viejo sigue en el núcleo: antes hay que sacarlo.');
  }
}

export function wheelsBody(
  wheels: CounterweightWheels,
  status: HTMLElement,
  solve: () => void,
): PuzzleBody {
  const hint = element('p', 'puzzle-hint');
  const list = element('ul', 'puzzle-console');
  const machine = element('span', 'puzzle-console-time');
  const counterweight = element('span', 'puzzle-console-time');
  for (const [name, readout] of [
    [t('La máquina'), machine],
    [t('El Contrapeso'), counterweight],
  ] as const) {
    const line = element('li', 'puzzle-console-line');
    line.append(element('span', 'puzzle-console-name', name), readout);
    list.append(line);
  }
  const controls = element('div', 'puzzle-wheels');

  function paint(): void {
    const reading = wheels.read();
    hint.textContent = cradleHint(reading);
    machine.textContent = formatClock(reading.machine);
    counterweight.textContent =
      reading.counterweight === undefined ? '—' : formatClock(reading.counterweight);
    controls.hidden = reading.place !== 'cradle';
    if (reading.place !== 'cradle') return;
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
      wheels.turn(wheel, -1);
      paint();
    });
    forward.addEventListener('click', () => {
      wheels.turn(wheel, 1);
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
