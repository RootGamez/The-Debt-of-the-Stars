// La vuelta a casa (Fase 10E): cruzada una boca del Archivo de las Puertas, `?mundo=hogar&final=A|B|tarde`. Con A y
// B se llega antes de la prueba mayor: el Hogar de antes, sin los fragmentos de las vitrinas ni el de la Luna (aún no
// han llegado) y con los Ool algo más jóvenes. Con "tarde", el Hogar de siempre, pasada la prueba. Hablar con la
// Directora cierra el viaje con la tarjeta del final (ui/endingCard.ts). El aspecto y las escenas son 🟡.
import type { SeenEnding } from '../core/save';
import type { SourceActions } from '../reading/readingUi';
import { ENDING_PARAM, PROLOGUE_WORLD } from '../worlds/worldSelection';
import type { Ending } from './epilogue';
import { WORMHOLE } from './prologue';

export const ENDINGS: readonly Ending[] = ['A', 'B', 'tarde'];
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

/** El final de la dirección, solo en Hogar y solo si es uno de los tres (la dirección no es de fiar). */
export function endingFromQuery(search: string): Ending | undefined {
  const params = new URLSearchParams(search);
  if (params.get('mundo') !== PROLOGUE_WORLD) return undefined;
  const value = params.get(ENDING_PARAM);
  return ENDINGS.find((ending) => ending === value);
}

/** A y B son finales (se guardan como vistos); llegar tarde no lo es: se vuelve al Archivo. */
export function isFinal(ending: Ending): ending is SeenEnding {
  return ending !== 'tarde';
}

export interface HomeLook {
  /** Piezas que no están. */
  without: readonly string[];
  /** La escala de los Ool. */
  oolScale: number;
}

/** Cómo es Hogar al llegar: el de antes con A y B; el de siempre si se llega tarde. */
export function homeLook(ending: Ending): HomeLook {
  return isFinal(ending)
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
  const early = isFinal(ending);
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
