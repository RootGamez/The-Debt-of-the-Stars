// La vuelta a casa en el juego (Fase 10E): la Directora cierra el viaje malo y la Maestra el bueno. Con el final A, la
// llegada es una escena (F4, game/homeEarlierRig.ts): el Albatros II se posa en el nido, la Maestra lee tu cuaderno y,
// al acabar, en negro al Mirador de Umbral (F3): la escena de los dos sentados (game/miradorRig.ts), que acaba en la
// tarjeta. Mientras dura la escena el viaje ya está cerrado (`scene`). La tarjeta guarda el final visto (A o tarde) y
// ofrece volver a jugar y, si se llegó tarde, también volver al Archivo. Lo que no toca la escena está en
// homecoming.ts (con tests).
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
import { t } from '../i18n';

export type HomecomingPhase = 'playing' | 'scene' | 'mirador' | 'card';

export interface HomecomingRigOptions {
  ending: Ending;
  /** Cómo se llegó (solo cambia la tarjeta del final malo); por defecto, por el Archivo. */
  via?: HomeVia;
  /** Al cerrar el viaje: fuera la lectura, el ratón suelto y la pausa inhabilitada (no hay vuelta al juego). */
  freeze(): void;
  /** Guarda el final como visto; false si no se pudo. */
  markSeen(ending: SeenEnding): boolean;
  replay: () => void;
  backToArchive: () => void;
  /**
   * Final A (F3): en vez de la tarjeta, la escena de los dos en el Mirador de Umbral (otra carga, que acaba en la
   * tarjeta). Solo si se pudo guardar el final: la escena lo pide. Sin ella, la tarjeta aquí.
   */
  toMirador?: () => void;
}

export interface HomecomingRig {
  readonly play: HomecomingPlay;
  readonly phase: HomecomingPhase;
  /** El viaje está cerrado: ni andar ni mirar. */
  readonly blocking: boolean;
  /** Final A (F4): empieza la escena del nido; el juego deja de escuchar. */
  begin(): void;
  /**
   * Cierra el viaje: con A, al Mirador (o la tarjeta, si no se pudo guardar); llegando tarde, la tarjeta (F5: al
   * acabar la escena del colapso). Solo una vez.
   */
  finish(): void;
}

export function createHomecomingRig(options: HomecomingRigOptions): HomecomingRig {
  const { ending } = options;
  const card = loadEndingCards()[endingCardKey(ending, options.via ?? 'archivo')];
  let phase: HomecomingPhase = 'playing';

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

  function finish(): void {
    if (phase === 'mirador' || phase === 'card') return;
    if (phase === 'playing') options.freeze();
    if (ending === 'A' && options.toMirador && options.markSeen(ending)) {
      phase = 'mirador';
      options.toMirador();
      return;
    }
    show();
  }

  // Hablar con quien cierra el viaje: llegando tarde es el respaldo de la escena del colapso; con A, el de la del nido.
  const play = createHomecomingPlay(ending, finish);

  return {
    play,
    get phase() {
      return phase;
    },
    get blocking() {
      return phase !== 'playing';
    },
    begin() {
      if (ending !== 'A' || phase !== 'playing') return;
      phase = 'scene';
      options.freeze();
    },
    finish,
  };
}
