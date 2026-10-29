// Conecta los eventos del navegador con la lógica pura de input.ts: teclado, ratón con pointer lock
// y la intención táctil que inyecta touchControls.ts.
import {
  applyKey,
  EMPTY_KEYS,
  intentFromKeys,
  KEY_BINDINGS,
  mergeIntents,
  type KeyState,
  type MoveIntent,
} from './input';

import { EMPTY_FLIGHT_KEYS, type FlightKeys } from '../ship/shipInput';

export const IDLE_INTENT: MoveIntent = Object.freeze({ x: 0, z: 0, run: false, jump: false });

const FLIGHT_KEY_CODES = new Set([
  'KeyW',
  'KeyS',
  'KeyA',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ControlLeft',
  'ControlRight',
  'KeyC',
  'KeyQ',
  'KeyE',
  'KeyX',
  'KeyZ',
  'KeyT',
  'KeyF',
]);

export class InputController {
  private keys: KeyState = EMPTY_KEYS;
  private readonly rawKeys = new Set<string>();
  private touch: MoveIntent = IDLE_INTENT;
  private touchFlight: FlightKeys = EMPTY_FLIGHT_KEYS;
  private lookX = 0;
  private lookY = 0;
  private readonly abort = new AbortController();
  /** Si devuelve true, arrastrar con el botón izquierdo también mira (juego sin pointer lock). */
  dragLookEnabled: () => boolean = () => false;
  /** Callback para acciones discretas de la nave (F, T, Z). */
  onActionKey?: (action: 'board' | 'target' | 'stabilize') => void;

  constructor(private readonly target: HTMLElement) {
    const { signal } = this.abort;
    const reset = (): void => {
      this.reset();
    };
    window.addEventListener(
      'keydown',
      (e) => {
        this.onKey(e, true);
      },
      { signal },
    );
    window.addEventListener(
      'keyup',
      (e) => {
        this.onKey(e, false);
      },
      { signal },
    );
    window.addEventListener('blur', reset, { signal });
    document.addEventListener('visibilitychange', reset, { signal });
    document.addEventListener(
      'mousemove',
      (e) => {
        this.onMouseMove(e);
      },
      { signal },
    );
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.target;
  }

  /** Intención combinada de teclado y táctil. */
  intent(): MoveIntent {
    return mergeIntents(intentFromKeys(this.keys), this.touch);
  }

  /** Teclas de vuelo continuo para la simulación de la nave. */
  flightKeys(): FlightKeys {
    const touch = this.touchFlight;
    return {
      forward: touch.forward || this.rawKeys.has('KeyW') || this.rawKeys.has('ArrowUp'),
      back: touch.back || this.rawKeys.has('KeyS') || this.rawKeys.has('ArrowDown'),
      left: touch.left || this.rawKeys.has('KeyA') || this.rawKeys.has('ArrowLeft'),
      right: touch.right || this.rawKeys.has('KeyD') || this.rawKeys.has('ArrowRight'),
      up: touch.up || this.rawKeys.has('Space'),
      down:
        touch.down ||
        this.rawKeys.has('ControlLeft') ||
        this.rawKeys.has('ControlRight') ||
        this.rawKeys.has('KeyC'),
      rollLeft: touch.rollLeft || this.rawKeys.has('KeyQ'),
      rollRight: touch.rollRight || this.rawKeys.has('KeyE'),
      match: touch.match || this.rawKeys.has('KeyX'),
    };
  }

  setTouchFlightKeys(keys: FlightKeys): void {
    this.touchFlight = keys;
  }

  setTouchIntent(intent: MoveIntent): void {
    this.touch = intent;
  }

  /** Suma movimiento de mirada en píxeles (ratón o arrastre táctil). */
  addLook(dx: number, dy: number): void {
    this.lookX += dx;
    this.lookY += dy;
  }

  /** Devuelve la mirada acumulada desde la última llamada y la pone a cero. */
  consumeLook(): { x: number; y: number } {
    const look = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return look;
  }

  reset(): void {
    this.keys = EMPTY_KEYS;
    this.rawKeys.clear();
    this.touch = IDLE_INTENT;
    this.touchFlight = EMPTY_FLIGHT_KEYS;
    this.consumeLook();
  }

  dispose(): void {
    this.abort.abort();
  }

  private onKey(event: KeyboardEvent, pressed: boolean): void {
    if (pressed) {
      this.rawKeys.add(event.code);
      if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.code === 'KeyF') this.onActionKey?.('board');
        else if (event.code === 'KeyT') this.onActionKey?.('target');
        else if (event.code === 'KeyZ') this.onActionKey?.('stabilize');
      }
    } else {
      this.rawKeys.delete(event.code);
    }

    const bound = FLIGHT_KEY_CODES.has(event.code) || event.code in KEY_BINDINGS;
    // Las flechas sobre un control (la rueda del reproductor) son para el control, no para la página.
    const onControl = event.target instanceof HTMLInputElement;
    if (bound && !onControl && (this.pointerLocked || this.dragLookEnabled())) {
      event.preventDefault(); // sin desplazar la página
    }

    if (event.code in KEY_BINDINGS) {
      this.keys = applyKey(this.keys, event.code, pressed);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const dragging = this.dragLookEnabled() && (event.buttons & 1) === 1;
    if (this.pointerLocked || dragging) this.addLook(event.movementX, event.movementY);
  }
}
