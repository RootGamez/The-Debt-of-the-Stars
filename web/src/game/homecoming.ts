// La vuelta a casa (Fase 10E; plan de los finales): cruzada una boca del Archivo de las Puertas (o La Boca de Umbral),
// `?mundo=hogar&final=A|tarde`. Con A (el bueno, F4) se llega tres días después de despegar al Hogar que dejaste: la
// Luna tiene una mordida nueva junto al fragmento (la variante `mordida`, worlds/procedural/lunaBite.ts) y la llegada
// es una escena (game/homeEarlierRig.ts): el Albatros II se posa en el nido, donde espera la Maestra, que lee tu
// cuaderno. Con "tarde" (el malo, F5), el Hogar de diez años después (worlds/procedural/hogarLater*.ts); `via=boca`
// dice que se llegó por La Boca, a pie por la Puerta Mayor y sin la nave (y no por una boca equivocada del Archivo,
// con ella), y eso cambia la tarjeta. Con "tarde" lo cierra la escena del colapso (game/homeLaterRig.ts): la Directora
// ya no está y su charla queda solo como respaldo; con A, hablar con la Maestra es el respaldo de la escena. Aspecto y
// escenas, 🟡.
import { SEEN_ENDINGS, type SeenEnding } from '../core/save';
import type { SourceActions } from '../reading/readingUi';
import type { EndingCardKey } from '../data/endings';
import { ENDING_PARAM, PROLOGUE_WORLD, VIA_PARAM } from '../worlds/worldSelection';
import { LATER_VARIANT } from '../worlds/procedural/hogarLaterShape';
import { BITE_VARIANT } from '../worlds/procedural/lunaBite';
import type { WorldVariants } from './loadSystem';
import type { Ending } from './epilogue';
import { WORMHOLE } from './prologue';

export const ENDINGS: readonly Ending[] = ['A', 'tarde'];
/** Con quien se cierra el viaje malo. */
export const DIRECTOR = 'instituto.directora';
/** Con quien se cierra el bueno (🟡 D14): la Maestra lee tu cuaderno; la Directora no sale. */
export const MAESTRA = 'instituto.maestra';

/** Con quien se habla para cerrar el viaje de este final. */
export function speakerFor(ending: Ending): string {
  return ending === 'A' ? MAESTRA : DIRECTOR;
}
/** El final de la dirección, solo en Hogar y solo si es uno de los dos (la dirección no es de fiar). */
export function endingFromQuery(search: string): Ending | undefined {
  const params = new URLSearchParams(search);
  if (params.get('mundo')?.toLowerCase() !== PROLOGUE_WORLD) return undefined;
  const value = params.get(ENDING_PARAM);
  return ENDINGS.find((ending) => ending === value);
}

/** Los dos finales (el bueno y llegar tarde) se guardan como vistos. */
export function isFinal(ending: Ending): ending is SeenEnding {
  return (SEEN_ENDINGS as readonly Ending[]).includes(ending);
}

/** Cómo se llegó al final malo: por La Boca de Umbral o por una boca equivocada del Archivo de las Puertas. */
export type HomeVia = 'boca' | 'archivo';

/** El camino de la dirección (`?via=`), solo en Hogar; sin él, o con algo raro, el del Archivo. */
export function viaFromQuery(search: string): HomeVia {
  const params = new URLSearchParams(search);
  if (params.get('mundo')?.toLowerCase() !== PROLOGUE_WORLD) return 'archivo';
  return params.get(VIA_PARAM) === 'boca' ? 'boca' : 'archivo';
}

/**
 * La tarjeta del final. El malo por La Boca es «Llegas tarde»; por una boca equivocada del Archivo hay que haber
 * cruzado el horizonte (el sistema estaba salvado): «Salvaste un sistema que no era el tuyo».
 */
export function endingCardKey(ending: Ending, via: HomeVia): EndingCardKey {
  if (ending !== 'tarde') return ending;
  return via === 'archivo' ? 'tardeSalvado' : 'tarde';
}

export interface HomeLook {
  /** Piezas que no están. */
  without: readonly string[];
  /** La escala de los Ool. */
  oolScale: number;
  /** Qué mundos se construyen en otra versión (la Luna mordida del bueno; llegando tarde, el Hogar de diez años después). */
  variants: WorldVariants;
  /** Si el Albatros II está en casa: por La Boca se llega a pie y la nave se quedó en el sistema ajeno. */
  ship: boolean;
}

/** Cómo es Hogar al llegar: el que dejaste, con la Luna mordida, con el final bueno; el de diez años después, tarde. */
export function homeLook(ending: Ending, via: HomeVia = 'archivo'): HomeLook {
  return ending === 'A'
    ? { without: [], oolScale: 1, variants: { luna: BITE_VARIANT }, ship: true }
    : { without: [], oolScale: 1, variants: { hogar: LATER_VARIANT }, ship: via !== 'boca' };
}

export interface HomecomingPlay {
  /** Ya se habló con la Directora: el viaje está cerrado. */
  readonly ended: boolean;
  readonly actions: SourceActions;
}

/** Quien cierra el viaje ofrece "hablar" (una vez); con el final bueno, el fragmento ya no te lleva a ninguna parte. */
export function createHomecomingPlay(ending: Ending, onEnd: () => void): HomecomingPlay {
  let ended = false;
  const early = ending === 'A';
  const speaker = speakerFor(ending);
  return {
    get ended() {
      return ended;
    },
    actions: {
      gone: (id) => early && id === WORMHOLE.source,
      verb: (id) => (id === speaker && !ended ? 'hablar' : undefined),
      run: (id) => {
        if (id !== speaker || ended) return;
        ended = true;
        onEnd();
      },
    },
  };
}
