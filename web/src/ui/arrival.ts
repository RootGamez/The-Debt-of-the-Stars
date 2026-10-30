// El despertar tras el gusano (Fase 9E): el sistema ajeno se carga de nuevo con la página detrás del fundido a
// blanco. Para que el salto no se note, antes de recargar se apunta en la sesión de la pestaña que se viene del
// gusano; al cargar, la pantalla sigue en blanco mientras llega el mundo y luego se aclara despacio. El primer
// blanco lo pone un guion en línea de `index.html` (antes de que llegue este código), con la misma clave.
import type { KeyValueStore } from '../core/save';

/** La clave de la sesión; `index.html` la lee también. */
export const ARRIVAL_KEY = 'bucle-tiempo:gusano';
/** La clase que `index.html` pone en `<html>` para nacer en blanco. */
export const ARRIVING_CLASS = 'llegando';
/** Lo que tarda en aclararse el blanco, ya cargado el mundo (s). */
export const ARRIVAL_FADE_SECONDS = 2.5;
/** Margen tras el fundido para quitar la capa aunque no llegue el final de la transición (s). */
const REMOVE_MARGIN_SECONDS = 0.5;

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
    store?.setItem(ARRIVAL_KEY, '1');
  } catch {
    // Sin sesión (modo privado estricto): se despierta sin el blanco, nada más.
  }
}

/** Al cargar: ¿se viene del gusano? Solo una vez (una recarga después ya no). */
export function takeCrossing(store: KeyValueStore | null): boolean {
  try {
    const crossed = store?.getItem(ARRIVAL_KEY) != null;
    store?.removeItem(ARRIVAL_KEY);
    return crossed;
  } catch {
    return false;
  }
}

/** Quita el blanco de nacimiento de `index.html` (lo releva la capa, o hay que leer un aviso de error). */
export function endArrivingPaint(): void {
  document.documentElement.classList.remove(ARRIVING_CLASS);
}

export interface ArrivalLayer {
  /** Ya está el mundo: el blanco se aclara y se va. */
  clear(): void;
}

/** El blanco del gusano, encima de todo, desde que arranca el juego hasta que esté el mundo. */
export function createArrivalLayer(): ArrivalLayer {
  const layer = document.createElement('div');
  layer.className = 'llegada';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.transitionDuration = `${ARRIVAL_FADE_SECONDS}s`;
  document.body.append(layer);
  endArrivingPaint();
  const remove = (): void => {
    layer.remove();
  };
  return {
    clear() {
      layer.addEventListener('transitionend', remove, { once: true });
      // Por si la transición no corre (estilos que las apagan): se quita igual al terminar su tiempo.
      window.setTimeout(remove, (ARRIVAL_FADE_SECONDS + REMOVE_MARGIN_SECONDS) * 1000);
      // Un fotograma después, para que la transición arranque desde el blanco pintado.
      requestAnimationFrame(() => {
        layer.classList.add('llegada-fuera');
      });
    },
  };
}
