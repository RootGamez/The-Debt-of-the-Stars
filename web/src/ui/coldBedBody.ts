// El lector del lecho de escarcha (hito E4 de docs/plan-finales.md §3.3): una rueda de latón que se gira de vuelta en
// vuelta y una barra con el calor del lecho, que sube despacio hacia cada paso. Si se gira antes de que la escarcha
// ceda, se cierra otra vez. Las reglas están en game/scientist.ts (con tests); quien lo usa es game/laboratoryRig.ts.
import type { WarmResult } from '../game/scientist';
import type { PuzzleBody } from './clockPuzzles';
import { button, element } from './puzzleKit';
import { t } from '../i18n';

/** Lo que el lector necesita del lecho. */
export interface ColdBedControl {
  /** Gira la rueda una vez. */
  warm(): WarmResult;
  /** El calor del lecho ahora (0 helado, 1 despierta). */
  warmth(): number;
  readonly awake: boolean;
}

function message(result: WarmResult): string {
  switch (result) {
    case 'warmer':
      return t('La escarcha cede un poco. Espera a que se asiente.');
    case 'too_soon':
      return t('Demasiado deprisa: la escarcha se cierra otra vez.');
    case 'awake':
      return t('La escarcha se abre. Se mueve.');
    case 'idle':
      return t('Ya no queda escarcha que fundir.');
  }
}

export function coldBedBody(bed: ColdBedControl, status: HTMLElement): PuzzleBody {
  const hint = element(
    'p',
    'puzzle-hint',
    t('Una vuelta de rueda, y esperar a que la escarcha ceda. Sin prisa.'),
  );
  const bar = document.createElement('progress');
  bar.className = 'puzzle-progress';
  bar.max = 1;
  bar.setAttribute('aria-label', t('Calor del lecho'));
  const wheel = button(t('Girar la rueda'), 'puzzle-choice');
  wheel.addEventListener('click', () => {
    status.textContent = message(bed.warm());
    wheel.disabled = bed.awake;
  });
  wheel.disabled = bed.awake;
  let frame = 0;
  const paint = (): void => {
    bar.value = bed.warmth();
    frame = requestAnimationFrame(paint);
  };
  paint();
  const body = element('div', 'puzzle-body');
  body.append(hint, bar, wheel);
  return {
    body,
    stop: () => {
      cancelAnimationFrame(frame);
    },
  };
}
