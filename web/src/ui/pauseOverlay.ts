// Pantalla de inicio y pausa. En PC captura el ratón (pointer lock) al hacer clic; Esc lo libera y
// vuelve a mostrar la pausa. En pantallas táctiles basta con tocar para empezar.

export interface PauseOverlay {
  readonly playing: boolean;
  /** Jugando sin pointer lock (el navegador no lo concedió): mirar arrastrando el ratón. */
  readonly dragLook: boolean;
  /** Pausa el juego (botón de pausa táctil, Esc). */
  pause(): void;
  /** Inhabilita la pantalla (otro diálogo está encima): sin foco ni clics, para que no se pueda reanudar detrás. */
  setInert(inert: boolean): void;
  /** Devuelve el foco al botón principal de la pantalla de pausa (al cerrar otro diálogo). */
  focus(): void;
  dispose(): void;
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

const DESKTOP_HELP =
  'WASD moverse · ratón mirar · Espacio saltar · Shift correr · F nave · Esc pausa · F3 datos';

function line(tag: 'strong' | 'span' | 'small', text: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
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

  let playing = false;
  let started = false;
  /** Jugando sin pointer lock: se mira arrastrando. */
  let dragLook = false;
  const abort = new AbortController();
  const { signal } = abort;

  let confirmingReset = false;
  let resetFailed = false;

  const resetActions = (): HTMLElement => {
    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    if (confirmingReset) {
      actions.append(
        line('span', '¿Borrar todo lo aprendido? No se puede deshacer.'),
        actionButton(
          'Borrar',
          () => {
            resetFailed = !options.onResetProgress();
            confirmingReset = false;
            render();
          },
          'danger',
        ),
        actionButton('Cancelar', () => {
          confirmingReset = false;
          render();
        }),
      );
    } else {
      actions.append(
        actionButton('Empezar de cero', () => {
          confirmingReset = true;
          render();
        }),
      );
    }
    return actions;
  };

  function render(): void {
    overlay.hidden = playing;
    const action = touch ? 'Toca' : 'Haz clic';
    const lines = started
      ? [line('strong', 'Pausa'), line('span', `${action} para seguir`)]
      : [line('strong', title), line('span', `${action} para empezar`)];
    const play = document.createElement('div');
    play.className = 'overlay-actions';
    play.append(
      actionButton(started ? 'Seguir' : 'Jugar', start, 'primary'),
      actionButton('Registro', options.onOpenRegistry),
    );
    lines.push(play);
    const loops = options.loops();
    if (loops > 0) {
      lines.push(line('span', `Ciclos vividos: ${loops}`, 'overlay-loops'), resetActions());
    }
    if (!options.savingWorks()) {
      lines.push(line('small', 'Este navegador no está guardando la partida.', 'overlay-warning'));
    }
    if (resetFailed) {
      lines.push(line('small', 'No se pudo borrar la partida.', 'overlay-warning'));
    }
    if (!touch) lines.push(line('small', DESKTOP_HELP));
    overlay.replaceChildren(...lines);
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
      ? [...buttons].find((b) => b.textContent === 'Cancelar')
      : buttons[0];
    target?.focus({ preventScroll: true });
  }

  const setPlaying = (value: boolean): void => {
    playing = value;
    if (value) started = true;
    confirmingReset = false;
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
    if (event.code === 'Escape') pause();
  };

  overlay.addEventListener('click', start, { signal });
  overlay.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Enter') start();
    },
    { signal },
  );
  document.addEventListener(
    'pointerlockchange',
    () => {
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
    pause,
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
