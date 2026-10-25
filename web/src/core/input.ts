// Traducción de la entrada (teclado y joystick táctil) a una intención de movimiento.
// Lógica pura: los eventos del DOM se conectan en inputController.ts.

export interface KeyState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
}

/** Movimiento deseado en el plano del jugador: x = derecha, z = adelante; longitud ≤ 1. */
export interface MoveIntent {
  x: number;
  z: number;
  run: boolean;
  jump: boolean;
}

export const EMPTY_KEYS: KeyState = Object.freeze({
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
  jump: false,
});

/** Códigos físicos de tecla (`KeyboardEvent.code`): funcionan igual con teclados AZERTY o QWERTZ. */
export const KEY_BINDINGS: Readonly<Record<string, keyof KeyState>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
};

export function applyKey(keys: KeyState, code: string, pressed: boolean): KeyState {
  const action = KEY_BINDINGS[code];
  if (!action || keys[action] === pressed) return keys;
  return { ...keys, [action]: pressed };
}

function clampLength(x: number, z: number): { x: number; z: number } {
  const length = Math.hypot(x, z);
  return length > 1 ? { x: x / length, z: z / length } : { x, z };
}

export function intentFromKeys(keys: KeyState): MoveIntent {
  const x = Number(keys.right) - Number(keys.left);
  const z = Number(keys.forward) - Number(keys.back);
  return { ...clampLength(x, z), run: keys.run, jump: keys.jump };
}

/**
 * Joystick en coordenadas de pantalla (y hacia abajo), cada eje en -1..1.
 * La zona muerta se reescala para que el movimiento empiece suave desde su borde.
 */
export function intentFromStick(
  screenX: number,
  screenY: number,
  deadZone: number,
): { x: number; z: number } {
  const length = Math.hypot(screenX, screenY);
  if (length <= deadZone) return { x: 0, z: 0 };
  const scaled = Math.min(1, (length - deadZone) / (1 - deadZone));
  return { x: (screenX / length) * scaled, z: (-screenY / length) * scaled };
}

export function mergeIntents(a: MoveIntent, b: MoveIntent): MoveIntent {
  return { ...clampLength(a.x + b.x, a.z + b.z), run: a.run || b.run, jump: a.jump || b.jump };
}
