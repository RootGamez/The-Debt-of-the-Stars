// Adónde lleva cada cruce (Fases 9 y 10). La página se recarga detrás del fundido sin dejar en el historial la
// pantalla cubierta, y la próxima carga de la pestaña sabe de qué color nace (ui/arrival.ts).
import type { DeathCause } from '../core/loopDirector';
import { markCrossing, sessionStore } from '../ui/arrival';
import { arrivalHref, epilogueHref, homecomingHref, replayHref } from '../worlds/worldSelection';
import type { Ending } from './epilogue';

/** Al Archivo de las Puertas, con la llegada en negro (por el horizonte, o de vuelta tras llegar tarde a casa). */
export function toArchive(): void {
  markCrossing(sessionStore(), 'negro');
  window.location.replace(epilogueHref(window.location.href));
}

/** "Volver a jugar" tras un final: la partida sigue en Umbral (`saved`: el guardado recuerda el prólogo hecho). */
export function replay(saved: boolean): void {
  markCrossing(sessionStore());
  window.location.replace(replayHref(window.location.href, saved));
}

/**
 * Cruzado el gusano, el sistema ajeno (`wasSaved`: si se guardó el prólogo); cruzado el horizonte estable, el
 * Archivo; cruzada una boca de casa, Hogar con su final (sin final, que no debería pasar, de vuelta al Archivo).
 */
export function followCrossing(
  cause: DeathCause | undefined,
  ending: Ending | undefined,
  wasSaved: boolean,
): void {
  switch (cause) {
    case 'horizonte':
      toArchive();
      return;
    case 'boca':
      if (!ending) {
        toArchive();
        return;
      }
      markCrossing(sessionStore());
      window.location.replace(homecomingHref(window.location.href, ending));
      return;
    case 'gusano':
      markCrossing(sessionStore());
      window.location.replace(arrivalHref(window.location.href, wasSaved));
      return;
    default:
      throw new Error(`Cruce sin ruta: ${String(cause)}`);
  }
}
