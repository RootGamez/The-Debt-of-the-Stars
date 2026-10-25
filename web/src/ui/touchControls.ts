// Controles táctiles: joystick que aparece donde se toca en la mitad izquierda, arrastre en la mitad
// derecha para mirar, botón de salto y botón de pausa. Solo se crean en pantallas táctiles.
import { intentFromStick, type MoveIntent } from '../core/input';
import type { InputController } from '../core/inputController';
import { MOUSE_LOOK_SENSITIVITY, TOUCH_LOOK_SENSITIVITY } from '../data/movement';

const STICK_RADIUS = 56; // px
const DEAD_ZONE = 0.15;
/** InputController acumula píxeles que main.ts multiplica por la sensibilidad del ratón. */
const LOOK_SCALE = TOUCH_LOOK_SENSITIVITY / MOUSE_LOOK_SENSITIVITY;

export interface TouchControls {
  /** Suelta el joystick, la mirada y el salto (al pausar o perder el foco). */
  reset(): void;
  /** Muestra u oculta los botones (se ocultan en la pausa). */
  setVisible(visible: boolean): void;
  dispose(): void;
}

export interface TouchOptions {
  isPlaying: () => boolean;
  onPause: () => void;
}

function div(className: string, parent: HTMLElement): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  parent.append(element);
  return element;
}

function button(className: string, label: string, parent: HTMLElement): HTMLButtonElement {
  const element = document.createElement('button');
  element.className = className;
  element.type = 'button';
  element.textContent = label;
  parent.append(element);
  return element;
}

export function createTouchControls(
  canvas: HTMLCanvasElement,
  input: InputController,
  { isPlaying, onPause }: TouchOptions,
): TouchControls {
  const layer = div('touch', document.body);
  const base = div('touch-stick', layer);
  const knob = div('touch-knob', base);
  const jump = button('touch-jump', 'Saltar', layer);
  const pause = button('touch-pause', 'Pausa', layer);
  pause.setAttribute('aria-label', 'Pausar el juego');
  base.hidden = true;

  let stickId: number | null = null;
  let lookId: number | null = null;
  const origin = { x: 0, y: 0 };
  const lastLook = { x: 0, y: 0 };
  let jumping = false;
  let stick = { x: 0, z: 0 };

  const publish = (): void => {
    const intent: MoveIntent = { ...stick, run: false, jump: jumping };
    input.setTouchIntent(intent);
  };

  const reset = (): void => {
    stickId = null;
    lookId = null;
    stick = { x: 0, z: 0 };
    jumping = false;
    base.hidden = true;
    publish();
  };

  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' || !isPlaying()) return;
    const leftHalf = e.clientX < window.innerWidth / 2;
    if (leftHalf && stickId === null) {
      stickId = e.pointerId;
      origin.x = e.clientX;
      origin.y = e.clientY;
      base.style.transform = `translate(${origin.x - STICK_RADIUS}px, ${origin.y - STICK_RADIUS}px)`;
      knob.style.transform = '';
      base.hidden = false;
    } else if (!leftHalf && lookId === null) {
      lookId = e.pointerId;
      lastLook.x = e.clientX;
      lastLook.y = e.clientY;
    }
  };

  const onMove = (e: PointerEvent): void => {
    if (e.pointerId === stickId) {
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      const length = Math.hypot(dx, dy);
      const k = length > STICK_RADIUS ? STICK_RADIUS / length : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      stick = intentFromStick(dx / STICK_RADIUS, dy / STICK_RADIUS, DEAD_ZONE);
      publish();
    } else if (e.pointerId === lookId) {
      input.addLook((e.clientX - lastLook.x) * LOOK_SCALE, (e.clientY - lastLook.y) * LOOK_SCALE);
      lastLook.x = e.clientX;
      lastLook.y = e.clientY;
    }
  };

  const onUp = (e: PointerEvent): void => {
    if (e.pointerId === stickId) {
      stickId = null;
      stick = { x: 0, z: 0 };
      base.hidden = true;
      publish();
    } else if (e.pointerId === lookId) {
      lookId = null;
    }
  };

  const setJump = (value: boolean): void => {
    jumping = value;
    publish();
  };

  const abort = new AbortController();
  const { signal } = abort;
  canvas.addEventListener('pointerdown', onDown, { signal });
  // Una pulsación larga no debe abrir el menú contextual del navegador.
  canvas.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { signal },
  );
  window.addEventListener('pointermove', onMove, { signal });
  window.addEventListener('pointerup', onUp, { signal });
  window.addEventListener('pointercancel', onUp, { signal });
  jump.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault();
      setJump(true);
    },
    { signal },
  );
  for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    jump.addEventListener(
      type,
      () => {
        setJump(false);
      },
      { signal },
    );
  }
  pause.addEventListener('click', onPause, { signal });

  return {
    reset,
    setVisible(visible) {
      layer.hidden = !visible;
      if (!visible) reset();
    },
    dispose() {
      abort.abort();
      layer.remove();
    },
  };
}
