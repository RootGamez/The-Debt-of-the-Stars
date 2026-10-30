// Los textos de las tarjetas de final (Fase 10E), en finales.json. Son de Anthony: hasta que los escriba, borradores
// con "[texto pendiente]". Se validan al cargar, como el resto de los datos.
import raw from './finales.json';
import type { Ending } from '../game/epilogue';
import { WorldDataError } from '../worlds/markers';

export interface EndingCard {
  title: string;
  text: readonly string[];
  /** Texto provisional (aún no es el de Anthony). */
  draft: boolean;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((t) => typeof t === 'string');
}

function readCard(ending: Ending, value: unknown): EndingCard {
  if (typeof value !== 'object' || value === null) {
    throw new WorldDataError(`finales.json: falta el final "${ending}"`);
  }
  const { titulo, texto, borrador } = value as Record<string, unknown>;
  if (typeof titulo !== 'string' || titulo === '' || !isTextList(texto)) {
    throw new WorldDataError(`finales.json: el final "${ending}" necesita "titulo" y "texto"`);
  }
  return { title: titulo, text: texto, draft: borrador === true };
}

/** Una tarjeta por final; lanza si falta alguno o está mal formado. */
export function readEndingCards(data: unknown): Readonly<Record<Ending, EndingCard>> {
  if (typeof data !== 'object' || data === null) {
    throw new WorldDataError('finales.json: no es un objeto');
  }
  const cards = data as Record<string, unknown>;
  return {
    A: readCard('A', cards.A),
    B: readCard('B', cards.B),
    tarde: readCard('tarde', cards.tarde),
  };
}

export function loadEndingCards(): Readonly<Record<Ending, EndingCard>> {
  return readEndingCards(raw);
}
