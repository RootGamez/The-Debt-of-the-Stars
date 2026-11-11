// Controles táctiles: joystick que aparece donde se toca en la mitad izquierda, arrastre en la mitad derecha para
// mirar, y los botones. Los botones salen del componente común (ui/touch/touchButton.ts) y solo está a la vista el
// que sirve ahora (ui/touch/touchContext.ts): saltar a pie, nadar, sentarse frente al asiento, volar, posarse…
// Distribución (plan-mobile, §4): abajo a la derecha el dock (acción principal y, encima, las contextuales),
// arriba a la derecha pausa y «Más». Solo se crean en pantallas táctiles.
import type { ShipAction } from '../game/shipFlight';
import { intentFromStick, type MoveIntent } from '../core/input';
import type { InputController } from '../core/inputController';
import { MOUSE_LOOK_SENSITIVITY, TOUCH_LOOK_SENSITIVITY } from '../data/movement';
import { EMPTY_FLIGHT_KEYS, type FlightKeys } from '../ship/shipInput';
import { t } from '../i18n';
import { canFullscreen, toggleFullscreen } from './fullscreen';
import { createTouchButton, type TouchButton } from './touch/touchButton';
import type { IconName } from './touch/touchIcons';
import {
  resolveTouchActions,
  type StationKind,
  type TouchActionId,
  type TouchContext,
} from './touch/touchContext';

const STICK_RADIUS = 56; // px
const DEAD_ZONE = 0.15;
/** InputController acumula píxeles que main.ts multiplica por la sensibilidad del ratón. */
const LOOK_SCALE = TOUCH_LOOK_SENSITIVITY / MOUSE_LOOK_SENSITIVITY;

export interface TouchControls {
  /** Suelta el joystick, la mirada y todos los botones (al pausar o perder el foco). */
  reset(): void;
  /** Muestra u oculta los botones (se ocultan en la pausa). */
  setVisible(visible: boolean): void;
  /** Una vez por fotograma: muestra solo los botones que sirven ahora. */
  update(): void;
  /** Dónde van los avisos contextuales de otros sistemas (el «Leer» de las fuentes). */
  readonly contextSlot: HTMLElement;
  dispose(): void;
}

export interface TouchOptions {
  isPlaying: () => boolean;
  /** Lo que pasa ahora en el juego (ver `TouchContext`). */
  context: () => TouchContext;
  onShipAction: (action: ShipAction) => void;
  onPause: () => void;
}

const STATION_LABELS: Record<StationKind, { icon: IconName; label: () => string }> = {
  asiento: { icon: 'seat', label: () => t('Sentarse') },
  registro: { icon: 'book', label: () => t('Registro') },
  mapa: { icon: 'map', label: () => t('Mapa') },
};

function div(className: string, parent: HTMLElement): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  parent.append(element);
  return element;
}

export function createTouchControls(
  canvas: HTMLCanvasElement,
  input: InputController,
  { isPlaying, context, onShipAction, onPause }: TouchOptions,
): TouchControls {
  const layer = div('touch', document.body);
  const base = div('touch-stick', layer);
  const knob = div('touch-knob', base);
  const more = div('touch-more', layer);
  const sheet = div('touch-more-sheet', more);
  const dock = div('touch-dock', layer);
  const contextSlot = div('touch-context', dock);
  const primary = div('touch-primary', dock);
  base.hidden = true;
  sheet.hidden = true;

  let stickId: number | null = null;
  let lookId: number | null = null;
  const origin = { x: 0, y: 0 };
  const lastLook = { x: 0, y: 0 };
  let jumping = false;
  let running = false; // Mayús: bajar nadando
  let stick = { x: 0, z: 0 };
  let flightTouch: FlightKeys = EMPTY_FLIGHT_KEYS;
  let state: TouchContext = {
    playing: false,
    piloting: false,
    landed: true,
    altitude: undefined,
    stabilize: true,
    station: undefined,
    swimming: false,
  };

  const publishFlight = (): void => {
    const piloting = state.piloting;
    input.setTouchFlightKeys({
      ...flightTouch,
      forward: flightTouch.forward || (piloting && stick.z > 0.2),
      back: flightTouch.back || (piloting && stick.z < -0.2),
      left: flightTouch.left || (piloting && stick.x < -0.2),
      right: flightTouch.right || (piloting && stick.x > 0.2),
    });
  };

  const publish = (): void => {
    const intent: MoveIntent = { ...stick, run: running, jump: jumping };
    input.setTouchIntent(intent);
    publishFlight();
  };

  const setJump = (value: boolean): void => {
    jumping = value;
    publish();
  };
  const setRun = (value: boolean): void => {
    running = value;
    publish();
  };
  const setFlightKey = (key: keyof FlightKeys, value: boolean): void => {
    flightTouch = { ...flightTouch, [key]: value };
    publishFlight();
  };

  // ---- Cinta de arriba a la derecha: pausa y «Más» (con las opciones que no se usan a cada rato) ----
  const pause = createTouchButton({
    id: 'pause',
    parent: layer,
    trigger: 'up',
    className: 'touch-pause',
    label: t('Pausa'),
    ariaLabel: t('Pausar el juego'),
    onPress: onPause,
  });
  const closeSheet = (): void => {
    if (sheet.hidden) return;
    sheet.hidden = true;
    moreButton.el.setAttribute('aria-expanded', 'false');
    window.removeEventListener('pointerdown', onOutside, true);
  };
  const onOutside = (event: PointerEvent): void => {
    if (event.target instanceof Node && more.contains(event.target)) return;
    closeSheet();
  };
  const moreButton = createTouchButton({
    id: 'more',
    parent: more,
    trigger: 'up',
    size: 'sm',
    icon: 'more',
    ariaLabel: t('Más opciones'),
    onPress: () => {
      if (sheet.hidden) {
        sheet.hidden = false;
        moreButton.el.setAttribute('aria-expanded', 'true');
        window.addEventListener('pointerdown', onOutside, true);
      } else {
        closeSheet();
      }
    },
  });
  moreButton.el.setAttribute('aria-expanded', 'false');
  moreButton.el.setAttribute('aria-controls', 'touch-more-sheet');
  sheet.id = 'touch-more-sheet';
  more.append(moreButton.el); // el botón queda antes que la hoja en el orden de lectura
  more.append(sheet);
  // Como la H del teclado: quita la lista de tareas, los relojes y demás papeles para ver (o grabar) solo el mundo.
  const hud = createTouchButton({
    id: 'hud',
    parent: sheet,
    mode: 'toggle',
    size: 'sm',
    icon: 'eye',
    label: t('Ocultar interfaz'),
    onToggle: (hidden) => {
      document.body.classList.toggle('interfaz-oculta', hidden);
      closeSheet();
    },
  });
  const screen = createTouchButton({
    id: 'fullscreen',
    parent: sheet,
    trigger: 'up',
    size: 'sm',
    icon: 'fullscreen',
    label: t('Pantalla completa'),
    visible: canFullscreen(document),
    onPress: () => {
      void toggleFullscreen(document);
      closeSheet();
    },
  });

  // ---- El dock: una fila de acción principal y otra de contextuales (el primero de cada fila, a la derecha) ----
  const ship = (action: ShipAction) => () => {
    onShipAction(action);
  };
  const holdOf = (
    press: () => void,
    release: () => void,
  ): { onPress: () => void; onRelease: () => void } => ({ onPress: press, onRelease: release });
  const jumpHold = holdOf(
    () => {
      setJump(true);
    },
    () => {
      setJump(false);
    },
  );
  const runHold = holdOf(
    () => {
      setRun(true);
    },
    () => {
      setRun(false);
    },
  );
  const flightKey = (key: keyof FlightKeys): { onPress: () => void; onRelease: () => void } =>
    holdOf(
      () => {
        setFlightKey(key, true);
      },
      () => {
        setFlightKey(key, false);
      },
    );

  const actions = new Map<TouchActionId, TouchButton>();
  const add = (
    id: TouchActionId,
    parent: HTMLElement,
    spec: Omit<Parameters<typeof createTouchButton>[0], 'id' | 'parent' | 'visible'>,
  ): TouchButton => {
    const button = createTouchButton({ id, parent, visible: false, ...spec });
    actions.set(id, button);
    return button;
  };

  add('jump', primary, {
    mode: 'hold',
    size: 'lg',
    tone: 'primary',
    icon: 'jump',
    label: t('Saltar'),
    ...jumpHold,
  });
  add('swimUp', primary, {
    mode: 'hold',
    size: 'lg',
    tone: 'primary',
    icon: 'up',
    label: t('Subir'),
    ...jumpHold,
  });
  add('raise', primary, {
    mode: 'hold',
    size: 'lg',
    tone: 'flight',
    icon: 'up',
    label: t('Subir'),
    ...flightKey('up'),
  });
  add('swimDown', primary, {
    mode: 'hold',
    size: 'md',
    icon: 'down',
    label: t('Bajar'),
    ...runHold,
  });
  const lower = add('lower', primary, {
    mode: 'hold',
    size: 'md',
    tone: 'flight',
    icon: 'down',
    label: t('Bajar'),
    ...flightKey('down'),
  });
  add('brake', primary, {
    mode: 'hold',
    size: 'md',
    tone: 'flight',
    icon: 'brake',
    label: t('Frenar'),
    ...flightKey('match'),
  });

  const station = add('station', contextSlot, {
    size: 'sm',
    tone: 'primary',
    icon: 'seat',
    label: t('Sentarse'),
    onPress: ship('board'),
  });
  add('stand', contextSlot, {
    size: 'sm',
    tone: 'primary',
    icon: 'stand',
    label: t('Levantarse'),
    onPress: ship('board'),
  });
  add('target', contextSlot, {
    size: 'sm',
    tone: 'flight',
    icon: 'target',
    label: t('Objetivo'),
    onPress: ship('target'),
  });
  const stabilize = add('stabilize', contextSlot, {
    size: 'sm',
    tone: 'flight',
    icon: 'stabilize',
    label: t('Estab.'),
    onPress: ship('stabilize'),
  });
  add('camera', contextSlot, {
    size: 'sm',
    tone: 'flight',
    icon: 'camera',
    label: t('Cámara'),
    onPress: ship('camera'),
  });
  add('rollRight', contextSlot, {
    mode: 'hold',
    size: 'sm',
    tone: 'flight',
    icon: 'rollRight',
    ariaLabel: t('Alabear a la derecha'),
    ...flightKey('rollRight'),
  });
  add('rollLeft', contextSlot, {
    mode: 'hold',
    size: 'sm',
    tone: 'flight',
    icon: 'rollLeft',
    ariaLabel: t('Alabear a la izquierda'),
    ...flightKey('rollLeft'),
  });

  const buttons: readonly TouchButton[] = [pause, moreButton, hud, screen, ...actions.values()];

  const reset = (): void => {
    for (const button of buttons) button.release();
    closeSheet();
    stickId = null;
    lookId = null;
    stick = { x: 0, z: 0 };
    jumping = false;
    running = false;
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

  let shown: string | undefined;
  /** Solo toca el DOM cuando cambia algo de lo que se ve (se llama cada fotograma). */
  const syncActions = (): void => {
    state = context();
    const plan = resolveTouchActions(state);
    const signature = [
      [...plan.visible].join(','),
      plan.stationKind ?? '',
      plan.landing,
      state.stabilize,
    ].join('|');
    if (signature === shown) return;
    shown = signature;
    for (const [id, button] of actions) button.setVisible(plan.visible.has(id));
    if (plan.stationKind) {
      const { icon, label } = STATION_LABELS[plan.stationKind];
      station.setIcon(icon);
      station.setLabel(label());
    }
    lower.setIcon(plan.landing ? 'land' : 'down');
    lower.setLabel(plan.landing ? t('Posarse') : t('Bajar'));
    stabilize.setActive(state.stabilize);
    // Cambió el modo (nadar, pilotar…): lo que se sostuviera con el pulgar no debe quedarse pulsado.
    publish();
  };

  return {
    reset,
    contextSlot,
    setVisible(visible) {
      layer.hidden = !visible;
      shown = undefined;
      if (!visible) reset();
      else syncActions();
    },
    update: syncActions,
    dispose() {
      abort.abort();
      window.removeEventListener('pointerdown', onOutside, true);
      for (const button of buttons) button.dispose();
      layer.remove();
    },
  };
}
