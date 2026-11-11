// Controles táctiles: joystick que aparece donde se toca en la mitad izquierda, arrastre en la mitad
// derecha para mirar, botón de salto y botón de pausa. Solo se crean en pantallas táctiles.
// Los botones salen del componente común (ui/touch/touchButton.ts).
import type { ShipAction } from '../game/shipFlight';
import { intentFromStick, type MoveIntent } from '../core/input';
import type { InputController } from '../core/inputController';
import { MOUSE_LOOK_SENSITIVITY, TOUCH_LOOK_SENSITIVITY } from '../data/movement';
import { EMPTY_FLIGHT_KEYS, type FlightKeys } from '../ship/shipInput';
import { t } from '../i18n';
import { canFullscreen, toggleFullscreen } from './fullscreen';
import { createTouchButton, type TouchButton } from './touch/touchButton';

const STICK_RADIUS = 56; // px
const DEAD_ZONE = 0.15;
/** InputController acumula píxeles que main.ts multiplica por la sensibilidad del ratón. */
const LOOK_SCALE = TOUCH_LOOK_SENSITIVITY / MOUSE_LOOK_SENSITIVITY;

export interface TouchControls {
  /** Suelta el joystick, la mirada y el salto (al pausar o perder el foco). */
  reset(): void;
  /** Muestra u oculta los botones (se ocultan en la pausa). */
  setVisible(visible: boolean): void;
  /** Actualiza qué controles de nave están disponibles. */
  update(): void;
  dispose(): void;
}

export interface TouchOptions {
  isPlaying: () => boolean;
  isPiloting: () => boolean;
  onShipAction: (action: ShipAction) => void;
  onPause: () => void;
}

function div(className: string, parent: HTMLElement): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  parent.append(element);
  return element;
}

export function createTouchControls(
  canvas: HTMLCanvasElement,
  input: InputController,
  { isPlaying, isPiloting, onShipAction, onPause }: TouchOptions,
): TouchControls {
  const layer = div('touch', document.body);
  const base = div('touch-stick', layer);
  const knob = div('touch-knob', base);
  const shipPanel = div('touch-ship-controls', layer);
  shipPanel.setAttribute('aria-label', t('Controles de la nave'));
  base.hidden = true;

  let stickId: number | null = null;
  let lookId: number | null = null;
  const origin = { x: 0, y: 0 };
  const lastLook = { x: 0, y: 0 };
  let jumping = false;
  let stick = { x: 0, z: 0 };
  let flightTouch: FlightKeys = EMPTY_FLIGHT_KEYS;

  const publishFlight = (): void => {
    input.setTouchFlightKeys({
      ...flightTouch,
      forward: flightTouch.forward || (isPiloting() && stick.z > 0.2),
      back: flightTouch.back || (isPiloting() && stick.z < -0.2),
      left: flightTouch.left || (isPiloting() && stick.x < -0.2),
      right: flightTouch.right || (isPiloting() && stick.x > 0.2),
    });
  };

  const publish = (): void => {
    const intent: MoveIntent = { ...stick, run: false, jump: jumping };
    input.setTouchIntent(intent);
    publishFlight();
  };

  const setJump = (value: boolean): void => {
    jumping = value;
    publish();
  };

  const setFlightKey = (key: keyof FlightKeys, value: boolean): void => {
    flightTouch = { ...flightTouch, [key]: value };
    publishFlight();
  };

  // Los botones: acciones del juego al tocar (o mientras se mantienen); los del sistema, al soltar sobre ellos.
  const jump = createTouchButton({
    id: 'jump',
    parent: layer,
    mode: 'hold',
    className: 'touch-jump',
    label: t('Saltar'),
    onPress: () => {
      setJump(true);
    },
    onRelease: () => {
      setJump(false);
    },
  });
  const pause = createTouchButton({
    id: 'pause',
    parent: layer,
    trigger: 'up',
    className: 'touch-pause',
    label: t('Pausa'),
    ariaLabel: t('Pausar el juego'),
    onPress: onPause,
  });
  // Como la H del teclado: quita la lista de tareas, los relojes y demás papeles para ver (o grabar) solo el mundo.
  const hud = createTouchButton({
    id: 'hud',
    parent: layer,
    mode: 'toggle',
    className: 'touch-hud',
    icon: 'eye',
    ariaLabel: t('Ocultar o mostrar la interfaz'),
    onToggle: (hidden) => {
      document.body.classList.toggle('interfaz-oculta', hidden);
      hud.el.classList.toggle('touch-hud-off', hidden);
    },
  });
  hud.el.title = t('Ocultar o mostrar la interfaz');
  const screen = createTouchButton({
    id: 'fullscreen',
    parent: layer,
    trigger: 'up',
    className: 'touch-screen',
    icon: 'fullscreen',
    ariaLabel: t('Pantalla completa'),
    visible: canFullscreen(document),
    onPress: () => {
      void toggleFullscreen(document);
    },
  });
  screen.el.title = t('Pantalla completa');

  const shipAction = (id: string, label: string, action: ShipAction): TouchButton =>
    createTouchButton({
      id,
      parent: shipPanel,
      className: 'touch-ship-action',
      label,
      onPress: () => {
        onShipAction(action);
      },
    });
  const board = shipAction('board', t('Nave'), 'board');
  const target = shipAction('target', t('Objetivo'), 'target');
  const stabilize = shipAction('stabilize', t('Estab.'), 'stabilize');
  const flightKey = (
    id: string,
    key: 'up' | 'down' | 'match',
    spec: { icon: 'up' | 'down'; ariaLabel: string } | { label: string },
  ): TouchButton =>
    createTouchButton({
      id,
      parent: shipPanel,
      mode: 'hold',
      className: 'touch-ship-action touch-ship-flight',
      ...spec,
      onPress: () => {
        setFlightKey(key, true);
      },
      onRelease: () => {
        setFlightKey(key, false);
      },
    });
  const up = flightKey('up', 'up', { icon: 'up', ariaLabel: t('Subir la nave') });
  const down = flightKey('down', 'down', { icon: 'down', ariaLabel: t('Bajar la nave') });
  const match = flightKey('match', 'match', { label: t('Frenar') });
  const buttons: readonly TouchButton[] = [
    jump,
    pause,
    hud,
    screen,
    board,
    target,
    stabilize,
    up,
    down,
    match,
  ];

  const reset = (): void => {
    for (const button of buttons) button.release();
    stickId = null;
    lookId = null;
    stick = { x: 0, z: 0 };
    jumping = false;
    flightTouch = EMPTY_FLIGHT_KEYS;
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

  let shownPiloting: boolean | undefined;
  /** Solo toca el DOM cuando cambia el modo (se llama cada fotograma). */
  const syncShipControls = (): void => {
    const piloting = isPiloting();
    if (piloting === shownPiloting) return;
    shownPiloting = piloting;
    shipPanel.classList.toggle('piloting', piloting);
    jump.setVisible(!piloting);
    // Los de vuelo solo existen pilotando; al dejar de pilotar sueltan lo que sostuvieran (la nave no empuja sola).
    for (const flight of [up, down, match]) flight.setVisible(piloting);
    board.setLabel(piloting ? t('Levantarse') : t('Nave'));
  };

  return {
    reset,
    setVisible(visible) {
      layer.hidden = !visible;
      if (!visible) reset();
      else syncShipControls();
    },
    update: syncShipControls,
    dispose() {
      abort.abort();
      for (const button of buttons) button.dispose();
      layer.remove();
    },
  };
}
