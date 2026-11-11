// Pantalla de inicio y pausa. En PC captura el ratón (pointer lock) al hacer clic; Esc lo libera y
// vuelve a mostrar la pausa. En pantallas táctiles basta con tocar para empezar.
// Es una página del cuaderno (plan del HUD, D.6), con un botón Configuración que solo lleva lo nuevo del HUD: la
// velocidad del texto y el sonido de letras (se guardan en el navegador, typewriter/textPreferences.ts).
import { TEXT_SCALES, UI_SCALES, type AccessibilitySettings } from '../accessibility/preferences';
import { VOLUME_STEPS, type VolumeSettings } from '../audio/volumePreferences';
import { LANGUAGE_NAMES, LANGUAGES, t, type Language } from '../i18n';
import { TEXT_SPEED_LABELS, TEXT_SPEEDS, type TextSettings } from '../typewriter/textPreferences';

export interface PauseOverlay {
  readonly playing: boolean;
  /** Jugando sin pointer lock (el navegador no lo concedió): mirar arrastrando el ratón. */
  readonly dragLook: boolean;
  /** Empieza a jugar (lo que hace el clic en la pantalla): desde un gesto del jugador, para captar el ratón. */
  begin(): void;
  /** Pausa el juego (botón de pausa táctil, Esc). */
  pause(): void;
  /** Suelta el ratón para usar un panel (puzle, grabadora) SIN pausar; se sigue jugando al cerrarlo. */
  releasePointer(): void;
  /** Vuelve a capturar el ratón tras `releasePointer` (llamar desde el gesto que cierra el panel). */
  recapturePointer(): void;
  /** Inhabilita la pantalla (otro diálogo está encima): sin foco ni clics, para que no se pueda reanudar detrás. */
  setInert(inert: boolean): void;
  /** Devuelve el foco al botón principal de la pantalla de pausa (al cerrar otro diálogo). */
  focus(): void;
  dispose(): void;
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

const desktopHelp = (): string =>
  t(
    'WASD moverse · ratón mirar · Espacio saltar · Shift correr · F nave · G mira · L luz · M sonido · Esc pausa · F3 datos',
  );

/** Lo que se lee en el botón de cada escala: 1,25 → «125 %». */
const percent = (scale: number): string => `${Math.round(scale * 100)} %`;

function line(tag: 'strong' | 'span' | 'small', text: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

/** El idioma y la accesibilidad (tamaño de la interfaz y de las letras), que se eligen en Configuración. */
export interface DisplaySettings {
  readonly language: Language;
  readonly accessibility: AccessibilitySettings;
  /** Volumen de los efectos y de los ambientes. */
  readonly volumes: VolumeSettings;
  /** Guarda el idioma y recarga la página (el progreso ya está guardado). */
  readonly chooseLanguage: (language: Language) => void;
}

export interface PauseOptions {
  /** Ciclos vividos (se muestran en la pausa si hay al menos uno). */
  loops: () => number;
  /** El progreso se guarda (falso en modo privado o con una partida más nueva). */
  savingWorks: () => boolean;
  /** Borra la partida guardada (tras confirmar); false si no se pudo. */
  onResetProgress: () => boolean;
  /** Abre el panel del Registro. */
  onOpenRegistry: () => void;
  /** La velocidad del texto y el sonido de letras. */
  settings: TextSettings;
  /** El idioma y el tamaño de la interfaz y de las letras. */
  display: DisplaySettings;
  /** Suena una letra de muestra (al encender el sonido de letras). */
  onLetterSample?: () => void;
}

/** Botón dentro de la pantalla: su clic no debe contar como "clic para jugar". */
function actionButton(text: string, onClick: () => void, className = ''): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  if (className) button.className = className;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  button.addEventListener('keydown', (event) => {
    // Intro sobre un botón no debe reanudar el juego (lo haría el manejador del diálogo); el resto
    // de teclas (Esc, R…) sí deben llegar a la ventana.
    if (event.key === 'Enter') event.stopPropagation();
  });
  return button;
}

export function createPauseOverlay(
  canvas: HTMLCanvasElement,
  title: string,
  onChange: () => void,
  options: PauseOptions,
): PauseOverlay {
  const touch = isTouchDevice();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  // Diálogo (no botón): dentro hay botones propios; hacer clic en el fondo también empieza a jugar.
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);
  overlay.tabIndex = 0;
  document.body.append(overlay);
  /** La hoja del cuaderno donde va todo; en Configuración, sus clics no empiezan a jugar. */
  const page = document.createElement('div');
  page.className = 'overlay-page';
  page.addEventListener('click', (event) => {
    if (inSettings) event.stopPropagation();
  });

  let playing = false;
  let started = false;
  /** Jugando sin pointer lock: se mira arrastrando. */
  let dragLook = false;
  const abort = new AbortController();
  const { signal } = abort;

  let confirmingReset = false;
  let resetFailed = false;
  let inSettings = false;

  /** Un grupo de opciones de las que se elige una (los botones dicen cuál está puesta). */
  const choices = <T extends string | number | boolean>(
    legend: string,
    values: readonly T[],
    current: T,
    labelOf: (value: T) => string,
    choose: (value: T) => void,
  ): HTMLElement => {
    const group = document.createElement('fieldset');
    group.className = 'overlay-choices';
    group.dataset.group = legend;
    const caption = document.createElement('legend');
    caption.textContent = legend;
    group.append(caption);
    for (const value of values) {
      const label = labelOf(value);
      const button = actionButton(label, () => {
        choose(value);
        render();
        // Redibujar destruye el botón con foco: el teclado sigue donde estaba, en la misma opción.
        [...overlay.querySelectorAll<HTMLButtonElement>('fieldset button')]
          .find((b) => b.textContent === label && b.parentElement?.dataset.group === legend)
          ?.focus({ preventScroll: true });
      });
      button.setAttribute('aria-pressed', String(value === current));
      if (value === current) button.classList.add('chosen');
      group.append(button);
    }
    return group;
  };

  const settingsView = (): HTMLElement[] => {
    const prefs = options.settings.current;
    const { accessibility, language, volumes } = options.display;
    const back = actionButton(t('Volver'), () => {
      inSettings = false;
      render();
      focusDefault(true);
    });
    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    actions.append(back);
    return [
      line('strong', t('Configuración')),
      choices(
        t('Idioma'),
        LANGUAGES,
        language,
        (l) => LANGUAGE_NAMES[l],
        (l) => {
          options.display.chooseLanguage(l);
        },
      ),
      choices(
        t('Tamaño de la interfaz'),
        UI_SCALES,
        accessibility.current.uiScale,
        percent,
        (uiScale) => {
          accessibility.update({ uiScale });
        },
      ),
      choices(
        t('Tamaño de las letras'),
        TEXT_SCALES,
        accessibility.current.textScale,
        percent,
        (textScale) => {
          accessibility.update({ textScale });
        },
      ),
      choices(
        t('Volumen de los efectos'),
        VOLUME_STEPS,
        volumes.current.effects,
        percent,
        (effects) => {
          volumes.update({ effects });
        },
      ),
      choices(
        t('Volumen de los ambientes'),
        VOLUME_STEPS,
        volumes.current.ambient,
        percent,
        (ambient) => {
          volumes.update({ ambient });
        },
      ),
      choices(t('Volumen de la música'), VOLUME_STEPS, volumes.current.music, percent, (music) => {
        volumes.update({ music });
      }),
      choices(
        t('Velocidad del texto'),
        TEXT_SPEEDS,
        prefs.speed,
        (s) => t(TEXT_SPEED_LABELS[s]),
        (speed) => {
          options.settings.update({ speed });
        },
      ),
      choices(
        t('Sonido de letras'),
        [true, false],
        prefs.letterSound,
        (on) => (on ? t('Sí') : t('No')),
        (on) => {
          options.settings.update({ letterSound: on });
          if (on) options.onLetterSample?.();
        },
      ),
      actions,
    ];
  };

  const resetActions = (): HTMLElement => {
    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    if (confirmingReset) {
      actions.append(
        line('span', t('¿Borrar todo lo aprendido? No se puede deshacer.')),
        actionButton(
          t('Borrar'),
          () => {
            resetFailed = !options.onResetProgress();
            confirmingReset = false;
            render();
          },
          'danger',
        ),
        actionButton(t('Cancelar'), () => {
          confirmingReset = false;
          render();
        }),
      );
    } else {
      actions.append(
        actionButton(t('Empezar de cero'), () => {
          confirmingReset = true;
          render();
        }),
      );
    }
    return actions;
  };

  function render(): void {
    overlay.hidden = playing;
    if (inSettings && !playing) {
      page.replaceChildren(...settingsView());
      overlay.replaceChildren(page);
      return;
    }
    const action = touch ? t('Toca') : t('Haz clic');
    const lines = started
      ? [line('strong', t('Pausa')), line('span', t('{action} para seguir', { action }))]
      : [line('strong', title), line('span', t('{action} para empezar', { action }))];
    const play = document.createElement('div');
    play.className = 'overlay-actions';
    play.append(
      actionButton(started ? t('Seguir') : t('Jugar'), start, 'primary'),
      actionButton(t('Registro'), options.onOpenRegistry),
      actionButton(t('Configuración'), () => {
        inSettings = true;
        render();
        focusDefault(true);
      }),
    );
    lines.push(play);
    const loops = options.loops();
    if (loops > 0) {
      lines.push(
        line('span', t('Ciclos vividos: {loops}', { loops }), 'overlay-loops'),
        resetActions(),
      );
    }
    if (!options.savingWorks()) {
      lines.push(
        line('small', t('Este navegador no está guardando la partida.'), 'overlay-warning'),
      );
    }
    if (resetFailed) {
      lines.push(line('small', t('No se pudo borrar la partida.'), 'overlay-warning'));
    }
    if (!touch) lines.push(line('small', desktopHelp()));
    page.replaceChildren(...lines);
    overlay.replaceChildren(page);
    focusDefault();
  }

  /** Al mostrarse (o redibujarse), el foco va al botón principal o a "Cancelar" al confirmar,
   * para que con teclado no se pierda en el fondo de la página. */
  function focusDefault(force = false): void {
    if (playing) return;
    // No quitarle el foco a otro diálogo abierto encima (el Registro): solo se coloca si el foco
    // está ya en esta pantalla o en ninguna parte.
    const focused = document.activeElement;
    if (!force && focused && focused !== document.body && !overlay.contains(focused)) return;
    const buttons = overlay.querySelectorAll<HTMLButtonElement>('button');
    const target = confirmingReset
      ? [...buttons].find((b) => b.textContent === t('Cancelar'))
      : inSettings
        ? (overlay.querySelector<HTMLButtonElement>('button.chosen') ?? buttons[0])
        : buttons[0];
    target?.focus({ preventScroll: true });
  }

  const setPlaying = (value: boolean): void => {
    playing = value;
    if (value) started = true;
    confirmingReset = false;
    inSettings = false;
    render();
    onChange();
  };

  // Si el navegador no concede el pointer lock (iframe sin permiso, automatización, o Chrome
  // justo después de Esc), se juega igual mirando con arrastre del ratón.
  const playWithDragLook = (): void => {
    if (playing) return;
    dragLook = true;
    setPlaying(true);
  };

  const start = (): void => {
    if (touch) {
      setPlaying(true);
      return;
    }
    try {
      // Navegadores antiguos devuelven undefined en vez de una promesa y avisan con
      // "pointerlockerror"; Promise.resolve cubre ambos casos.
      const request: unknown = canvas.requestPointerLock();
      Promise.resolve(request).catch(playWithDragLook);
    } catch {
      playWithDragLook();
    }
  };

  const pause = (): void => {
    if (!playing) return;
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock(); // "pointerlockchange" mostrará la pausa
      return;
    }
    dragLook = false;
    setPlaying(false);
  };

  // Normalmente el navegador ya libera el ratón con Esc; si no (p. ej. teclas sintéticas o juego
  // con arrastre), se pausa aquí.
  const pauseWithEscape = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    if (!playing && inSettings) {
      inSettings = false;
      render();
      focusDefault(true);
      return;
    }
    pause();
  };

  overlay.addEventListener('click', start, { signal });
  overlay.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Enter' && !inSettings) start();
    },
    { signal },
  );
  /** El ratón se soltó a propósito para un panel: perder la captura no es pausar. */
  let releasing = false;
  document.addEventListener(
    'pointerlockchange',
    () => {
      if (releasing && document.pointerLockElement !== canvas) {
        releasing = false;
        dragLook = true; // se sigue jugando, con el ratón libre
        return;
      }
      dragLook = false;
      setPlaying(document.pointerLockElement === canvas);
    },
    { signal },
  );
  document.addEventListener('pointerlockerror', playWithDragLook, { signal });
  window.addEventListener('keydown', pauseWithEscape, { signal });
  render();

  return {
    get playing() {
      return playing;
    },
    get dragLook() {
      return dragLook;
    },
    begin: start,
    pause,
    releasePointer() {
      if (!playing || document.pointerLockElement !== canvas) return;
      releasing = true;
      document.exitPointerLock();
    },
    recapturePointer() {
      if (!playing || !dragLook || document.pointerLockElement === canvas) return;
      try {
        const request: unknown = canvas.requestPointerLock();
        Promise.resolve(request).catch(() => undefined); // si no se concede, se sigue mirando arrastrando
      } catch {
        // sin captura: se sigue mirando arrastrando
      }
    },
    setInert(inert) {
      overlay.inert = inert;
    },
    focus() {
      focusDefault(true);
    },
    dispose() {
      abort.abort();
      overlay.remove();
    },
  };
}
