// El menú principal: lo primero que se ve al entrar. Detrás, el desfile de mundos (showcase.ts); delante, el título y
// Jugar (o Continuar y Empezar de cero si ya hay partida), el idioma, siempre a la vista, y los tamaños de la
// interfaz y de las letras. El juego se carga por debajo; Jugar se activa cuando está listo.
import { TEXT_SCALES, UI_SCALES } from '../accessibility/preferences';
import { LANGUAGE_NAMES, LANGUAGES, t } from '../i18n';
import type { DisplaySettings } from '../ui/pauseOverlay';
import { createShowcase, type Showcase } from './showcase';

export interface MainMenuOptions {
  /** Ya hay una partida con algo de progreso: se ofrece Continuar y Empezar de cero. */
  hasProgress: boolean;
  display: DisplaySettings;
  /** Borra la partida (tras confirmar). */
  onNewGame: () => void;
}

export interface MainMenu {
  /** El juego está cargado: Jugar/Continuar se activan y `play` empieza a jugar. */
  ready(play: () => void): void;
  /** El juego no pudo cargarse: se dice aquí, donde se está mirando. */
  fail(message: string): void;
  dispose(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function menuButton(text: string, onClick: () => void, className = ''): HTMLButtonElement {
  const button = element('button', `menu-button ${className}`.trim(), text);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

const percent = (scale: number): string => `${Math.round(scale * 100)} %`;

/** Un grupo de opciones de las que se elige una; los botones dicen cuál está puesta. */
function choiceGroup<T extends string | number>(
  legend: string,
  values: readonly T[],
  current: T,
  labelOf: (value: T) => string,
  choose: (value: T) => void,
): HTMLElement {
  const group = element('fieldset', 'menu-choices');
  group.append(element('legend', 'menu-choices-legend', legend));
  const buttons = new Map<T, HTMLButtonElement>();
  for (const value of values) {
    const button = menuButton(labelOf(value), () => {
      choose(value);
      for (const [other, b] of buttons) b.setAttribute('aria-pressed', String(other === value));
    });
    button.setAttribute('aria-pressed', String(value === current));
    buttons.set(value, button);
  }
  group.append(...buttons.values());
  return group;
}

function languageChips(display: DisplaySettings): HTMLElement {
  const bar = element('div', 'menu-languages');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Language / Idioma');
  for (const language of LANGUAGES) {
    const chip = menuButton(LANGUAGE_NAMES[language], () => {
      display.chooseLanguage(language);
    });
    chip.lang = language;
    chip.setAttribute('aria-pressed', String(language === display.language));
    bar.append(chip);
  }
  return bar;
}

export function createMainMenu(options: MainMenuOptions): MainMenu {
  const { display, hasProgress } = options;
  const root = element('div', 'menu');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', t('La deuda de las estrellas'));
  const canvas = element('canvas', 'menu-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const cover = element('div', 'menu-cover');
  const shade = element('div', 'menu-shade');

  const content = element('div', 'menu-content');
  const status = element('p', 'menu-status', t('Cargando…'));
  status.setAttribute('role', 'status');
  const actions = element('div', 'menu-actions');
  const settings = element('div', 'menu-settings');
  settings.hidden = true;

  let play: (() => void) | undefined;
  const primary = menuButton(
    hasProgress ? t('Continuar') : t('Jugar'),
    () => {
      play?.();
    },
    'menu-primary',
  );
  primary.disabled = true;
  actions.append(primary);

  const confirm = element('div', 'menu-confirm');
  confirm.hidden = true;
  const askNew = menuButton(t('Empezar de cero'), () => {
    confirm.hidden = false;
    askNew.hidden = true;
    confirm.querySelector('button')?.focus();
  });
  confirm.append(
    element('span', 'menu-confirm-text', t('¿Borrar todo lo aprendido? No se puede deshacer.')),
    menuButton(t('Borrar'), options.onNewGame, 'menu-danger'),
    menuButton(t('Cancelar'), () => {
      confirm.hidden = true;
      askNew.hidden = false;
      askNew.focus();
    }),
  );
  if (hasProgress) actions.append(askNew, confirm);

  const accessibility = menuButton(t('Accesibilidad'), () => {
    settings.hidden = !settings.hidden;
    accessibility.setAttribute('aria-expanded', String(!settings.hidden));
  });
  accessibility.setAttribute('aria-expanded', 'false');
  actions.append(accessibility);

  const { accessibility: prefs } = display;
  settings.append(
    choiceGroup(
      t('Tamaño de la interfaz'),
      UI_SCALES,
      prefs.current.uiScale,
      percent,
      (uiScale) => {
        prefs.update({ uiScale });
      },
    ),
    choiceGroup(
      t('Tamaño de las letras'),
      TEXT_SCALES,
      prefs.current.textScale,
      percent,
      (textScale) => {
        prefs.update({ textScale });
      },
    ),
  );

  content.append(
    element('h1', 'menu-title', t('La deuda de las estrellas')),
    element('p', 'menu-tagline', t('Quince minutos antes del final de un mundo.')),
    actions,
    settings,
    status,
  );
  root.append(canvas, cover, shade, languageChips(display), content);
  document.body.append(root);

  let showcase: Showcase | undefined;
  try {
    showcase = createShowcase(canvas, cover);
  } catch {
    // Sin WebGL el menú sigue funcionando, sobre un fondo liso.
    cover.style.opacity = '0';
    root.classList.add('menu-plain');
  }
  primary.focus({ preventScroll: true });

  return {
    ready(onPlay) {
      play = onPlay;
      primary.disabled = false;
      status.hidden = true;
      primary.focus({ preventScroll: true });
    },
    fail(message) {
      status.hidden = false;
      status.textContent = message;
    },
    dispose() {
      showcase?.dispose();
      root.remove();
    },
  };
}
