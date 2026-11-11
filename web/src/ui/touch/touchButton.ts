// EL botón de los controles táctiles. Todos (saltar, pausa, sentarse, frenar…) salen de aquí: un `<button>` real
// con icono SVG y rótulo, que no se selecciona ni abre menús al mantenerlo pulsado, que no suelta la acción si el
// dedo resbala fuera (captura de puntero) y que aparece y desaparece con una transición corta.
// La lógica de quién lo sostiene y cuándo actúa está en pressTracker.ts (con pruebas); aquí solo el DOM.
import {
  createPressTracker,
  type PressMode,
  type PressTrigger,
  type PressTracker,
} from './pressTracker';
import { iconMarkup, type IconName } from './touchIcons';

export type TouchButtonSize = 'sm' | 'md' | 'lg';
export type TouchButtonTone = 'neutral' | 'primary' | 'flight' | 'danger';

export interface TouchButtonOptions {
  /** Nombre estable (`data-touch-id`): lo usan las pruebas y los estilos. */
  id: string;
  parent: HTMLElement;
  /** `tap` (por defecto), `hold` (mientras se mantiene) o `toggle` (activado/desactivado). */
  mode?: PressMode;
  /** Solo `tap`: `down` (por defecto) actúa al tocar; `up`, al soltar sobre el botón (pausa, menús). */
  trigger?: PressTrigger;
  icon?: IconName;
  /** Rótulo visible. Obligatorio en los contextuales; un botón solo de icono lleva `ariaLabel`. */
  label?: string;
  ariaLabel?: string;
  /** Con tamaño, el botón lleva el aspecto del sistema; sin él, solo el de las clases de `className`. */
  size?: TouchButtonSize;
  tone?: TouchButtonTone;
  /** Clases propias (los botones anteriores al sistema conservan su aspecto con ellas). */
  className?: string;
  /** Empieza a la vista (por defecto sí). */
  visible?: boolean;
  /** Vibración corta al tocar (nunca en los de mantener). */
  haptics?: boolean;
  onPress?: () => void;
  onRelease?: () => void;
  onToggle?: (on: boolean) => void;
}

export interface TouchButton {
  readonly el: HTMLButtonElement;
  readonly held: boolean;
  readonly visible: boolean;
  /** Lo muestra u oculta con transición; al ocultarse suelta lo que sostuviera. */
  setVisible(visible: boolean): void;
  /** Suelta lo que sostuviera sin hacer la acción (pausa, pérdida del foco). */
  release(): void;
  setLabel(label: string): void;
  setIcon(icon: IconName): void;
  /** Marca un `toggle` como activado (aria-pressed) sin llamar a `onToggle`. */
  setActive(active: boolean): void;
  setDisabled(disabled: boolean): void;
  dispose(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Lo que dura la salida (ms); debe coincidir con `touchBtnOut` en touch.css. */
const LEAVE_MS = 120;
const HAPTIC_MS = 10;
/** Cuánto se espera el clic que sigue a un toque (ms) antes de dejar de descartarlo. */
const SWALLOW_MS = 400;

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function iconElement(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'touch-btn-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = iconMarkup(name); // texto SVG fijo de touchIcons.ts
  return svg;
}

/**
 * Tras actuar al soltar, el navegador aún manda el clic del toque a lo que haya debajo del dedo. Si la acción abrió
 * algo encima (la pausa), ese clic caería en ello y lo cerraría al instante: se descarta el siguiente clic.
 */
function swallowNextClick(): void {
  const stop = (event: Event): void => {
    event.stopPropagation();
    event.preventDefault();
    cleanup();
  };
  const timer = window.setTimeout(() => {
    cleanup();
  }, SWALLOW_MS);
  function cleanup(): void {
    window.clearTimeout(timer);
    window.removeEventListener('click', stop, true);
    window.removeEventListener('pointerdown', cleanup, true);
  }
  window.addEventListener('click', stop, true);
  // Un toque nuevo antes de que llegue el clic: ese clic ya no vendrá, no se le quita al toque nuevo.
  window.addEventListener('pointerdown', cleanup, true);
}

function isInside(el: HTMLElement, event: PointerEvent): boolean {
  const box = el.getBoundingClientRect();
  return (
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  );
}

export function createTouchButton(options: TouchButtonOptions): TouchButton {
  const { id, parent, mode = 'tap', icon, label, ariaLabel, size, tone, className } = options;
  if (label === undefined && ariaLabel === undefined) {
    throw new Error(`El botón táctil "${id}" necesita un rótulo o un aria-label`);
  }

  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.touchId = id;
  el.dataset.mode = mode;
  el.className = [
    'touch-btn',
    size && `touch-btn--${size}`,
    tone && `touch-btn--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  if (ariaLabel !== undefined) el.setAttribute('aria-label', ariaLabel);
  if (mode === 'toggle') el.setAttribute('aria-pressed', 'false');

  let iconNode: SVGSVGElement | undefined;
  let labelNode: HTMLSpanElement | undefined;
  const setIcon = (name: IconName): void => {
    const next = iconElement(name);
    if (iconNode) iconNode.replaceWith(next);
    else el.prepend(next);
    iconNode = next;
  };
  const setLabel = (text: string): void => {
    if (!labelNode) {
      labelNode = document.createElement('span');
      labelNode.className = 'touch-btn-label';
      el.append(labelNode);
    }
    if (labelNode.textContent !== text) labelNode.textContent = text;
  };
  if (icon) setIcon(icon);
  if (label !== undefined) setLabel(label);

  /** Un toque que actúa al soltar (`trigger: 'up'`) acaba de actuar: ver `swallowNextClick`. */
  const tracker: PressTracker = createPressTracker({
    mode,
    trigger: options.trigger,
    onPress: options.onPress,
    onRelease: options.onRelease,
    onToggle: (on) => {
      el.setAttribute('aria-pressed', String(on));
      el.classList.toggle('is-active', on);
      options.onToggle?.(on);
    },
  });
  const sync = (): void => {
    el.classList.toggle('is-pressed', tracker.held);
  };

  const abort = new AbortController();
  const { signal } = abort;
  el.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault(); // ni foco, ni selección, ni clic fantasma
      if (!tracker.down(event.pointerId)) return;
      try {
        el.setPointerCapture(event.pointerId); // el dedo puede resbalar fuera sin soltar la acción
      } catch {
        // Sin captura (el puntero ya terminó): se suelta por pointerup/pointercancel igualmente.
      }
      if (options.haptics && mode !== 'hold' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(HAPTIC_MS);
      }
      sync();
    },
    { signal },
  );
  const finish = (event: PointerEvent, cancelled: boolean): void => {
    const acted = tracker.up(event.pointerId, { cancelled, inside: isInside(el, event) });
    if (acted) swallowNextClick();
    sync();
  };
  el.addEventListener(
    'pointerup',
    (event) => {
      finish(event, false);
    },
    { signal },
  );
  el.addEventListener(
    'pointercancel',
    (event) => {
      finish(event, true);
    },
    { signal },
  );
  el.addEventListener(
    'lostpointercapture',
    (event) => {
      finish(event, true);
    },
    { signal },
  );
  // Teclado y lectores de pantalla: llegan como clic sin posición (`detail` 0); los dedos ya se atendieron arriba.
  el.addEventListener(
    'click',
    (event) => {
      if (event.detail === 0) tracker.activate();
    },
    { signal },
  );
  el.addEventListener(
    'animationend',
    (event) => {
      if (event.animationName === 'touchBtnIn') el.classList.remove('is-entering');
    },
    { signal },
  );
  el.addEventListener(
    'contextmenu',
    (event) => {
      event.preventDefault();
    },
    { signal },
  );

  let shown = options.visible ?? true;
  el.hidden = !shown;
  let leaveTimer: number | undefined;
  parent.append(el);

  return {
    el,
    get held() {
      return tracker.held;
    },
    get visible() {
      return shown;
    },
    setVisible(visible) {
      if (visible === shown) return;
      shown = visible;
      window.clearTimeout(leaveTimer);
      if (visible) {
        el.classList.remove('is-leaving');
        el.hidden = false;
        el.classList.add('is-entering');
        return;
      }
      tracker.cancelAll();
      sync();
      if (reducedMotion()) {
        el.hidden = true;
        return;
      }
      el.classList.add('is-leaving');
      leaveTimer = window.setTimeout(() => {
        el.classList.remove('is-leaving');
        el.hidden = true;
      }, LEAVE_MS);
    },
    release() {
      tracker.cancelAll();
      sync();
    },
    setLabel,
    setIcon,
    setActive(active) {
      tracker.setOn(active);
      el.setAttribute('aria-pressed', String(active));
      el.classList.toggle('is-active', active);
    },
    setDisabled(disabled) {
      tracker.setDisabled(disabled);
      el.disabled = disabled;
      sync();
    },
    dispose() {
      window.clearTimeout(leaveTimer);
      tracker.cancelAll();
      abort.abort();
      el.remove();
    },
  };
}
