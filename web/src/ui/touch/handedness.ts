// Mano zurda: espeja el dock (abajo a la derecha) y cambia de mitad el joystick y la mirada. Se recuerda aparte del
// progreso, como el tamaño de la interfaz.
import type { KeyValueStore } from '../../core/save';

export const HANDEDNESS_KEY = 'bucle-tiempo:mano';

export function loadLeftHanded(store: KeyValueStore | null): boolean {
  try {
    return store?.getItem(HANDEDNESS_KEY) === 'izquierda';
  } catch {
    return false;
  }
}

/** Devuelve false (sin lanzar) si no se pudo guardar. */
export function saveLeftHanded(store: KeyValueStore | null, left: boolean): boolean {
  if (!store) return false;
  try {
    store.setItem(HANDEDNESS_KEY, left ? 'izquierda' : 'derecha');
    return true;
  } catch {
    return false;
  }
}

/** ¿El toque en `x` cae en la mitad del joystick? (la izquierda, o la derecha si se es zurdo). */
export function stickSideIsLeft(x: number, width: number, leftHanded: boolean): boolean {
  return x < width / 2 !== leftHanded;
}
