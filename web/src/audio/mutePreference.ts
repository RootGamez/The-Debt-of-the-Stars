// Si el jugador silenció el juego (tecla M): se recuerda entre partidas, aparte del progreso.
import type { KeyValueStore } from '../core/save';

export const MUTE_KEY = 'bucle-tiempo:silencio';

export function loadMuted(store: KeyValueStore | null): boolean {
  try {
    return store?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(store: KeyValueStore | null, muted: boolean): void {
  try {
    if (muted) store?.setItem(MUTE_KEY, '1');
    else store?.removeItem(MUTE_KEY);
  } catch {
    // sin almacenamiento: la preferencia dura solo esta sesión
  }
}
