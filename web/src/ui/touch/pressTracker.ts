// Quién sostiene un botón táctil y cuándo actúa. Es la lógica del botón sin tocar el DOM (se prueba en Node);
// `touchButton.ts` solo le pasa los eventos de puntero.

export type PressMode = 'tap' | 'hold' | 'toggle';
/** Cuándo actúa un botón de toque: nada más tocar (acciones del juego) o al soltar dentro (los del sistema). */
export type PressTrigger = 'down' | 'up';

/** Identificador de puntero del teclado y los lectores de pantalla: ningún dedo lo usa. */
export const KEYBOARD_POINTER = -1;

export interface PressOptions {
  mode: PressMode;
  /** Solo para `tap`; por defecto `down`. */
  trigger?: PressTrigger;
  /** Al pulsar (`hold`: empieza la acción; `tap`: la hace). */
  onPress?: () => void;
  /** Al soltar un `hold` (también si se cancela o el botón se oculta). */
  onRelease?: () => void;
  /** Al alternar un `toggle`. */
  onToggle?: (on: boolean) => void;
}

export interface ReleaseInfo {
  /** El navegador canceló el gesto (p. ej. se lo quedó el sistema). */
  cancelled?: boolean;
  /** El dedo se soltó sobre el botón; por defecto sí. */
  inside?: boolean;
}

export interface PressTracker {
  /** Un dedo toca el botón; `false` si lo rechaza (deshabilitado o ya lo sostiene otro dedo). */
  down(pointerId: number): boolean;
  /** Suelta el dedo; `true` si un toque que actúa al soltar acaba de actuar. */
  up(pointerId: number, info?: ReleaseInfo): boolean;
  /** Suelta lo que haya sostenido sin hacer la acción (el botón se oculta, se deshabilita o se destruye). */
  cancelAll(): void;
  /** Activación sin dedo (teclado, lector de pantalla): pulsa y suelta de una vez. */
  activate(): void;
  setDisabled(disabled: boolean): void;
  /** Cambia el estado de un `toggle` desde fuera, sin llamar a `onToggle`. */
  setOn(on: boolean): void;
  readonly held: boolean;
  readonly on: boolean;
  readonly disabled: boolean;
}

export function createPressTracker(options: PressOptions): PressTracker {
  const { mode, trigger = 'down', onPress, onRelease, onToggle } = options;
  let holder: number | null = null;
  let isOn = false;
  let isDisabled = false;

  const cancelAll = (): void => {
    if (holder === null) return;
    holder = null;
    if (mode === 'hold') onRelease?.();
  };

  const tracker: PressTracker = {
    down(pointerId) {
      if (isDisabled || holder !== null) return false;
      holder = pointerId;
      if (mode === 'hold' || (mode === 'tap' && trigger === 'down')) {
        onPress?.();
      } else if (mode === 'toggle') {
        isOn = !isOn;
        onToggle?.(isOn);
      }
      return true;
    },
    up(pointerId, info = {}) {
      if (holder !== pointerId) return false;
      holder = null;
      if (mode === 'hold') {
        onRelease?.();
      } else if (mode === 'tap' && trigger === 'up' && !info.cancelled && info.inside !== false) {
        onPress?.();
        return true;
      }
      return false;
    },
    cancelAll,
    activate() {
      if (holder !== null) return;
      if (tracker.down(KEYBOARD_POINTER)) tracker.up(KEYBOARD_POINTER, { inside: true });
    },
    setDisabled(disabled) {
      if (disabled) cancelAll();
      isDisabled = disabled;
    },
    setOn(on) {
      isOn = on;
    },
    get held() {
      return holder !== null;
    },
    get on() {
      return isOn;
    },
    get disabled() {
      return isDisabled;
    },
  };
  return tracker;
}
