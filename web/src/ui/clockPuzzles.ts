// Los lectores que enseñan la cuenta del Contrapeso (Fase 10, hito 10A): los diarios de los gemelos (una regla de
// tres guiada), la consola de la Cabina (relojes en vivo, uno casi quieto) y la pizarra del Laboratorio (la ruta
// tramo a tramo). Rótulos neutros y cortos: los textos de verdad son de Anthony. Lógica en reading/puzzles.ts.
import { CONSOLE_CLOCKS, CONSOLE_MINUTES_PER_SECOND, ROUTE, TWINS } from '../data/puzzles';
import {
  consoleReadings,
  formatDrift,
  formatMinutesSeconds,
  routeDrift,
  slowestClock,
  twins,
} from '../reading/puzzles';
import { choiceQuestion, element, row } from './puzzleKit';
import { getLanguage, t } from '../i18n';

export interface PuzzleBody {
  body: HTMLElement;
  /** Para lo que siga vivo (la consola): se llama al cerrar. */
  stop?: () => void;
}

/** Cada cuánto se repintan los relojes de la consola (ms). */
const CONSOLE_REFRESH_MS = 250;

export function twinsBody(solved: boolean, status: HTMLElement, onSolved: () => void): PuzzleBody {
  const book = twins(TWINS);
  const table = element('table', 'puzzle-notebook');
  const lastTaller = element('td', 'puzzle-cell', solved ? String(book.last.answer) : '¿?');
  const technician = row([t('Técnico (Taller)'), String(book.stormTaller)]);
  technician.append(lastTaller);
  table.append(
    row([t('Diario'), t('La tormenta'), t('Última página')], true),
    row([t('Hermana (Umbral)'), String(TWINS.stormDay), String(TWINS.lastDay)]),
    technician,
  );
  const body = element('div', 'puzzle-body');
  body.append(table);
  if (solved) return { body };
  const second = choiceQuestion(
    {
      prompt: t('Tres meses: la hermana va por el día {day}. ¿Por qué día va el técnico?', {
        day: TWINS.lastDay,
      }),
      options: book.last.options,
      answer: book.last.answer,
      label: (day) => t('Día {day}', { day }),
      wrong: t('No cuadra: el atraso no se queda fijo, crece con los días.'),
    },
    status,
    () => {
      lastTaller.textContent = String(book.last.answer);
      status.textContent = t('El atraso crece con el tiempo: cada {storm} días, {lag} más.', {
        storm: TWINS.stormDay,
        lag: book.lag.answer,
      });
      onSolved();
    },
  );
  const first = choiceQuestion(
    {
      prompt: t('¿Cuántos días se queda atrás el técnico por cada {storm} de su hermana?', {
        storm: TWINS.stormDay,
      }),
      options: book.lag.options,
      answer: book.lag.answer,
      label: (days) => t('{days} días', { days }),
      wrong: t('Mira la tormenta: el mismo día, contado en los dos diarios.'),
    },
    status,
    () => {
      status.textContent = `Cada ${String(TWINS.stormDay)} días de Umbral, el Taller se queda ${String(book.lag.answer)} atrás.`;
      body.append(second);
      second.querySelector('button')?.focus();
    },
  );
  body.append(first);
  return { body };
}

export function consoleBody(
  solved: boolean,
  status: HTMLElement,
  onSolved: () => void,
): PuzzleBody {
  const list = element('ul', 'puzzle-console');
  const readouts = new Map<string, HTMLElement>();
  for (const clock of CONSOLE_CLOCKS) {
    const line = element('li', 'puzzle-console-line');
    const readout = element('span', 'puzzle-console-time', '0:00');
    readouts.set(clock.id, readout);
    line.append(element('span', 'puzzle-console-name', clock.label), readout);
    list.append(line);
  }
  const started = performance.now();
  const paint = (): void => {
    const minutes = ((performance.now() - started) / 1000) * CONSOLE_MINUTES_PER_SECOND;
    for (const { id, minutes: shown } of consoleReadings(CONSOLE_CLOCKS, minutes)) {
      const readout = readouts.get(id);
      if (readout) readout.textContent = formatMinutesSeconds(shown);
    }
  };
  const timer = window.setInterval(paint, CONSOLE_REFRESH_MS);
  const body = element('div', 'puzzle-body');
  body.append(
    element('p', 'puzzle-hint', t('Todos los relojes se igualaron a la vez. Míralos correr.')),
    list,
  );
  const slowest = slowestClock(CONSOLE_CLOCKS);
  if (!solved && slowest) {
    body.append(
      choiceQuestion(
        {
          prompt: t('¿Qué destino se queda atrás más deprisa?'),
          options: CONSOLE_CLOCKS.map((c) => c.id),
          answer: slowest,
          label: (id) => CONSOLE_CLOCKS.find((c) => c.id === id)?.label ?? id,
          wrong: t('Ese corre más: espera un poco y compáralos otra vez.'),
        },
        status,
        () => {
          status.textContent = t(
            'La ruta sin nombre casi no avanza: allí el tiempo apenas corre. Lo que se ve de ella hay que corregirlo.',
          );
          onSolved();
        },
      ),
    );
  }
  return {
    body,
    stop: () => {
      window.clearInterval(timer);
    },
  };
}

export function routeBody(solved: boolean, status: HTMLElement, onSolved: () => void): PuzzleBody {
  const route = routeDrift(ROUTE.legs, ROUTE.machineRate);
  const table = element('table', 'puzzle-notebook');
  table.append(
    row([t('Tramo'), t('Minutos'), t('El Contrapeso marca'), t('La máquina marca')], true),
  );
  ROUTE.legs.forEach((leg, i) => {
    const counted = route.legs[i];
    table.append(
      row([
        leg.place,
        String(leg.minutes),
        formatMinutesSeconds(counted?.counterweight ?? 0),
        formatMinutesSeconds(counted?.machine ?? 0),
      ]),
    );
  });
  const body = element('div', 'puzzle-body');
  body.append(
    element(
      'p',
      'puzzle-hint',
      t('Un viaje de ejemplo hasta la máquina, que marcha a {rate}.', {
        rate: ROUTE.machineRate.toLocaleString(getLanguage() === 'en' ? 'en-US' : 'es'),
      }),
    ),
    table,
  );
  if (solved) {
    body.append(
      element('p', 'puzzle-hint', t('Al llegar: {drift}.', { drift: formatDrift(route.drift) })),
    );
    return { body };
  }
  body.append(
    choiceQuestion(
      {
        prompt: t('Al llegar, ¿cómo va el Contrapeso respecto a la máquina?'),
        options: route.step.options,
        answer: route.drift,
        label: formatDrift,
        wrong: t('Cuenta todos los tramos: en unos se atrasa y en otros se adelanta.'),
      },
      status,
      () => {
        status.textContent = t(
          'Cada tramo suma lo que se adelanta o se atrasa: al llegar, {drift}. Las ruedas lo corrigen.',
          { drift: formatDrift(route.drift) },
        );
        onSolved();
      },
    ),
  );
  return { body };
}
