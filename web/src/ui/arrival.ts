// El despertar tras el gusano (Fase 9E): el sistema ajeno se carga de nuevo con la página detrás del fundido a
// blanco. Para que el salto no se note, antes de recargar se apunta en la sesión de la pestaña que se viene del
// gusano; al cargar, la pantalla sigue en blanco mientras llega el mundo y luego se aclara despacio.
import type { KeyValueStore } from '../core/save';

const KEY = 'bucle-tiempo:gusano';
/** Lo que tarda en aclararse el blanco, ya cargado el mundo (s). */
export const ARRIVAL_FADE_SECONDS = 2.5;

export function sessionStore(): KeyValueStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Antes de recargar: la próxima carga de esta pestaña viene del gusano. */
export function markCrossing(store: KeyValueStore | null): void {
  try {
    store?.setItem(KEY, '1');
  } catch {
    // Sin sesión (modo privado estricto): se despierta sin el blanco, nada más.
  }
}

/** Al cargar: ¿se viene del gusano? Solo una vez (una recarga después ya no). */
export function takeCrossing(store: KeyValueStore | null): boolean {
  try {
    const crossed = store?.getItem(KEY) != null;
    store?.removeItem(KEY);
    return crossed;
  } catch {
    return false;
  }
}

export interface ArrivalLayer {
  /** Ya está el mundo: el blanco se aclara y se va. */
  clear(): void;
}

/** El blanco del gusano, encima de todo desde el primer momento de la carga. */
export function createArrivalLayer(): ArrivalLayer {
  const layer = document.createElement('div');
  layer.className = 'llegada';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.transitionDuration = `${ARRIVAL_FADE_SECONDS}s`;
  document.body.append(layer);
  return {
    clear() {
      layer.addEventListener(
        'transitionend',
        () => {
          layer.remove();
        },
        { once: true },
      );
      // Un fotograma después, para que la transición arranque desde el blanco pintado.
      requestAnimationFrame(() => {
        layer.classList.add('llegada-fuera');
      });
    },
  };
}
