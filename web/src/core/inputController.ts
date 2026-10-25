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

export const IDLE_INTENT: MoveIntent = Object.freeze({ x: 0, z: 0, run: false, jump: false });

export class InputController {
  private keys: KeyState = EMPTY_KEYS;
  private touch: MoveIntent = IDLE_INTENT;
  private lookX = 0;
  private lookY = 0;
  private readonly abort = new AbortController();
  /** Si devuelve true, arrastrar con el botón izquierdo también mira (juego sin pointer lock). */
  dragLookEnabled: () => boolean = () => false;

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
    this.touch = IDLE_INTENT;
    this.consumeLook();
  }

  dispose(): void {
    this.abort.abort();
  }

  private onKey(event: KeyboardEvent, pressed: boolean): void {
    if (!(event.code in KEY_BINDINGS)) return;
    if (this.pointerLocked || this.dragLookEnabled()) event.preventDefault(); // sin desplazar la página
    this.keys = applyKey(this.keys, event.code, pressed);
  }

  private onMouseMove(event: MouseEvent): void {
    const dragging = this.dragLookEnabled() && (event.buttons & 1) === 1;
    if (this.pointerLocked || dragging) this.addLook(event.movementX, event.movementY);
  }
}
