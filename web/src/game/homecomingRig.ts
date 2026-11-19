// La vuelta a casa en el juego (Fase 10E): la Directora cierra el viaje malo y la Maestra el bueno. Con el final A, la
// Maestra lee tu cuaderno (game/endingTalk.ts, F4) y, antes de la tarjeta, un corte a negro a la plaza del Instituto (desde dentro la Luna queda detrás del techo) y, mientras se aclara, la vista sube
// despacio hacia la Luna, aún sin su fragmento. Después (F3), en negro al Mirador de Umbral: la escena de los dos
// sentados (game/miradorRig.ts), que acaba en la tarjeta. La tarjeta guarda el final visto (A o tarde) y ofrece volver
// a jugar y, si se llegó tarde, también volver al Archivo. Lo que no toca la escena está en homecoming.ts (con tests).
import type { SeenEnding } from '../core/save';
import { loadEndingCards } from '../data/endings';
import { showEndingCard } from '../ui/endingCard';
import type { Ending } from './epilogue';
import {
  createHomecomingPlay,
  endingCardKey,
  type HomecomingPlay,
  type HomeVia,
} from './homecoming';
import { talkLines } from './endingTalk';
import { t } from '../i18n';

/** Lo que dura el giro hacia la Luna en el final A (s) y qué parte de lo que falta se gira por segundo. */
export const TURN_SECONDS = 3.5;
const TURN_RATE = 1.6;

export type HomecomingPhase = 'playing' | 'talking' | 'turning' | 'mirador' | 'card';

export interface HomecomingRigOptions {
  ending: Ending;
  /** Cómo se llegó (solo cambia la tarjeta del final malo); por defecto, por el Archivo. */
  via?: HomeVia;
  /** Al cerrar el viaje: fuera la lectura, el ratón suelto y la pausa inhabilitada (no hay vuelta al juego). */
  freeze(): void;
  /** Los hechos que sabes (el Registro): la Maestra lee solo los temas que has aprendido. */
  known(): ReadonlySet<string>;
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
  /**
   * Final A (F3): tras el giro, en vez de la tarjeta, la escena de los dos en el Mirador de Umbral (otra carga, que
   * acaba en la tarjeta). Solo si se pudo guardar el final: la escena lo pide. Sin ella, la tarjeta aquí.
   */
  toMirador?: () => void;
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
  const card = loadEndingCards()[endingCardKey(ending, options.via ?? 'archivo')];
  let phase: HomecomingPhase = 'playing';
  let turned = 0;

  function show(): void {
    phase = 'card';
    const saved = options.markSeen(ending);
    const replayChoice = { label: t('Volver a jugar'), run: options.replay };
    showEndingCard(
      card,
      ending === 'A'
        ? [replayChoice]
        : [replayChoice, { label: t('Volver al Archivo'), run: options.backToArchive }],
      saved ? undefined : t('No se ha podido guardar el final.'),
    );
  }

  const play = createHomecomingPlay(ending, () => {
    options.freeze();
    if (ending !== 'A') {
      show();
      return;
    }
    phase = 'talking';
    const scene = showEndingCard(
      { title: t('La Maestra'), text: talkLines(options.known()), draft: true },
      [
        {
          label: t('Seguir'),
          run: () => {
            scene.remove();
            phase = 'turning';
            options.stepOutside();
          },
        },
      ],
    );
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
      if (turned < TURN_SECONDS) return;
      if (options.toMirador && options.markSeen(ending)) {
        phase = 'mirador';
        options.toMirador();
        return;
      }
      show();
    },
  };
}
