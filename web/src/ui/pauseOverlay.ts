// Pantalla de inicio y pausa. En PC captura el ratón (pointer lock) al hacer clic; Esc lo libera y
// vuelve a mostrar la pausa. En pantallas táctiles basta con tocar para empezar.

export interface PauseOverlay {
  readonly playing: boolean;
  /** Jugando sin pointer lock (el navegador no lo concedió): mirar arrastrando el ratón. */
  readonly dragLook: boolean;
  dispose(): void;
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

const DESKTOP_HELP =
  'WASD moverse · ratón mirar · Espacio saltar · Shift correr · Esc pausa · F3 datos';

function line(tag: 'strong' | 'span' | 'small', text: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

export function createPauseOverlay(
  canvas: HTMLCanvasElement,
  title: string,
  onChange: () => void,
): PauseOverlay {
  const touch = isTouchDevice();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'button');
  overlay.tabIndex = 0;
  document.body.append(overlay);

  let playing = false;
  let started = false;
  /** Jugando sin pointer lock: se mira arrastrando. */
  let dragLook = false;
  const abort = new AbortController();
  const { signal } = abort;

  const render = (): void => {
    overlay.hidden = playing;
    const action = touch ? 'Toca' : 'Haz clic';
    const lines = started
      ? [line('strong', 'Pausa'), line('span', `${action} para seguir`)]
      : [line('strong', title), line('span', `${action} para empezar`)];
    if (!touch) lines.push(line('small', DESKTOP_HELP));
    overlay.replaceChildren(...lines);
  };

  const setPlaying = (value: boolean): void => {
    playing = value;
    if (value) started = true;
    render();
    onChange();
  };

  const start = (): void => {
    if (touch) {
      setPlaying(true);
      return;
    }
    // Si el navegador no concede el pointer lock (iframe sin permiso, automatización, o Chrome
    // justo después de Esc), se juega igual mirando con arrastre del ratón.
    canvas.requestPointerLock().catch(() => {
      dragLook = true;
      setPlaying(true);
    });
  };

  const pauseWithEscape = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && playing && dragLook) {
      dragLook = false;
      setPlaying(false);
    }
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
  window.addEventListener('keydown', pauseWithEscape, { signal });
  render();

  return {
    get playing() {
      return playing;
    },
    get dragLook() {
      return dragLook;
    },
    dispose() {
      abort.abort();
      overlay.remove();
    },
  };
}
