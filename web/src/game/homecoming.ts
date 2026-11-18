// La vuelta a casa (Fase 10E; plan de los finales): cruzada una boca del Archivo de las Puertas (o La Boca de Umbral),
// `?mundo=hogar&final=A|tarde`. Con A (el bueno) se llega tres días después de despegar: el Hogar de antes, sin los
// fragmentos de las vitrinas ni el de la Luna (aún no han llegado) y con los Ool algo más jóvenes. Con "tarde" (el
// malo), el Hogar de siempre, pasada la prueba; `via=boca` dice que se llegó por La Boca (y no por una boca equivocada
// del Archivo), y eso cambia la tarjeta. Hablar con la Directora cierra el viaje con la tarjeta del final
// (ui/endingCard.ts). El aspecto y las escenas son 🟡.
import { SEEN_ENDINGS, type SeenEnding } from '../core/save';
import type { SourceActions } from '../reading/readingUi';
import type { EndingCardKey } from '../data/endings';
import { ENDING_PARAM, PROLOGUE_WORLD } from '../worlds/worldSelection';
import type { Ending } from './epilogue';
import { WORMHOLE } from './prologue';

export const ENDINGS: readonly Ending[] = ['A', 'tarde'];
/** Con quien se cierra el viaje. */
export const DIRECTOR = 'instituto.directora';
/** Lo que en el Hogar de antes aún no ha llegado: las piedras de las vitrinas y el fragmento de la Luna. */
export const NOT_YET_ARRIVED: readonly string[] = [
  'hogar_FragmentosVitrinas',
  'luna_Fragmento',
  'luna_Fragmento_Luz',
];
/** Los Ool de antes, algo más jóvenes (más pequeños). */
export const YOUNGER_OOL = 0.85;

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
export const VIA_PARAM = 'via';

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
}

/** Cómo es Hogar al llegar: el de antes con el final bueno; el de siempre si se llega tarde. */
export function homeLook(ending: Ending): HomeLook {
  return ending === 'A'
    ? { without: NOT_YET_ARRIVED, oolScale: YOUNGER_OOL }
    : { without: [], oolScale: 1 };
}

export interface HomecomingPlay {
  /** Ya se habló con la Directora: el viaje está cerrado. */
  readonly ended: boolean;
  readonly actions: SourceActions;
}

/** La Directora ofrece "hablar", que cierra el viaje (una vez); en el Hogar de antes, el fragmento no está. */
export function createHomecomingPlay(ending: Ending, onEnd: () => void): HomecomingPlay {
  let ended = false;
  const early = ending === 'A';
  return {
    get ended() {
      return ended;
    },
    actions: {
      gone: (id) => early && id === WORMHOLE.source,
      verb: (id) => (id === DIRECTOR && !ended ? 'hablar' : undefined),
      run: (id) => {
        if (id !== DIRECTOR || ended) return;
        ended = true;
        onEnd();
      },
    },
  };
}
