// La vuelta a casa en el juego (Fase 10E): la Directora cierra el viaje. Con el final A, antes de la tarjeta, un corte
// a negro a la plaza del Instituto (desde dentro la Luna queda detrás del techo) y, mientras se aclara, la vista sube
// despacio hacia la Luna, aún sin su fragmento. La tarjeta guarda el final visto (A, B) y ofrece volver a jugar o, si
// se llegó tarde, volver al Archivo. Lo que no toca la escena está en homecoming.ts (con tests).
import type { SeenEnding } from '../core/save';
import { loadEndingCards } from '../data/endings';
import { showEndingCard } from '../ui/endingCard';
import type { Ending } from './epilogue';
import { createHomecomingPlay, isFinal, type HomecomingPlay } from './homecoming';
import { t } from '../i18n';

/** Lo que dura el giro hacia la Luna en el final A (s) y qué parte de lo que falta se gira por segundo. */
export const TURN_SECONDS = 3.5;
const TURN_RATE = 1.6;

export type HomecomingPhase = 'playing' | 'turning' | 'card';

export interface HomecomingRigOptions {
  ending: Ending;
  /** Al cerrar el viaje: fuera la lectura, el ratón suelto y la pausa inhabilitada (no hay vuelta al juego). */
  freeze(): void;
  /** Final A: corte a negro a la plaza, que se aclara despacio. */
  stepOutside(): void;
  /** Gira la vista hacia la Luna una parte (0–1) de lo que falta. */
  turnToMoon(share: number): void;
  /** Con movimiento reducido, la vista se pone de golpe mirando a la Luna. */
  reducedMotion: boolean;
  /** Guarda el final como visto; false si no se pudo. */
  markSeen(ending: SeenEnding): boolean;
  replay: () => void;
  backToArchive: () => void;
}

export interface HomecomingRig {
  readonly play: HomecomingPlay;
  readonly phase: HomecomingPhase;
  /** El viaje está cerrado: ni andar ni mirar. */
  readonly blocking: boolean;
  /** Una vez por fotograma, con el tiempo real (el giro sigue aunque el juego ya no). */
  update(dt: number): void;
}

export function createHomecomingRig(options: HomecomingRigOptions): HomecomingRig {
  const { ending } = options;
  const card = loadEndingCards()[ending];
  let phase: HomecomingPhase = 'playing';
  let turned = 0;

  function show(): void {
    phase = 'card';
    const saved = !isFinal(ending) || options.markSeen(ending);
    showEndingCard(
      card,
      isFinal(ending)
        ? [{ label: t('Volver a jugar'), run: options.replay }]
        : [{ label: t('Volver al Archivo'), run: options.backToArchive }],
      saved ? undefined : t('No se ha podido guardar el final.'),
    );
  }

  const play = createHomecomingPlay(ending, () => {
    options.freeze();
    if (ending !== 'A') {
      show();
      return;
    }
    phase = 'turning';
    options.stepOutside();
  });

  return {
    play,
    get phase() {
      return phase;
    },
    get blocking() {
      return phase !== 'playing';
    },
    update(dt) {
      if (phase !== 'turning' || !(dt > 0)) return;
      turned += dt;
      options.turnToMoon(options.reducedMotion ? 1 : Math.min(1, TURN_RATE * dt));
      if (turned >= TURN_SECONDS) show();
    },
  };
}
