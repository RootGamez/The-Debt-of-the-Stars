// Los textos de las tarjetas de final (Fase 10E), en finales.json. Son de Anthony: hasta que los escriba, borradores
// de Claude (`"borrador": true`). Se validan al cargar, como el resto de los datos.
import raw from './finales.json';
import type { Ending } from '../game/epilogue';
import { WorldDataError } from '../worlds/markers';
import { t } from '../i18n';

/** Las tarjetas: una por final y la variante del malo si se llegó por una boca equivocada con el sistema salvado. */
export type EndingCardKey = Ending | 'tardeSalvado';

export interface EndingCard {
  title: string;
  text: readonly string[];
  /** Texto provisional (aún no es el de Anthony). */
  draft: boolean;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((t) => typeof t === 'string');
}

function readCard(ending: string, value: unknown): EndingCard {
  if (typeof value !== 'object' || value === null) {
    throw new WorldDataError(`finales.json: falta el final "${ending}"`);
  }
  const { titulo, texto, borrador } = value as Record<string, unknown>;
  if (typeof titulo !== 'string' || titulo === '' || !isTextList(texto)) {
    throw new WorldDataError(`finales.json: el final "${ending}" necesita "titulo" y "texto"`);
  }
  // Los textos de los finales son de Anthony y aún están pendientes: el título y el marcador se traducen.
  return { title: t(titulo), text: texto.map((p) => t(p)), draft: borrador === true };
}

/** Una tarjeta por final y variante; lanza si falta alguna o está mal formada. */
export function readEndingCards(data: unknown): Readonly<Record<EndingCardKey, EndingCard>> {
  if (typeof data !== 'object' || data === null) {
    throw new WorldDataError('finales.json: no es un objeto');
  }
  const cards = data as Record<string, unknown>;
  return {
    A: readCard('A', cards.A),
    tarde: readCard('tarde', cards.tarde),
    tardeSalvado: readCard('tardeSalvado', cards.tardeSalvado),
  };
}

/**
 * La tarjeta corta «Sin vuelta» (E5): no es un final (no está en `Ending` ni se guarda como visto); sale al fallar
 * tras cortar el bucle y la partida sigue en Umbral. Vive en el mismo archivo de datos.
 */
export function readNoReturnCard(data: unknown): EndingCard {
  if (typeof data !== 'object' || data === null) {
    throw new WorldDataError('finales.json: no es un objeto');
  }
  return readCard('sinVuelta', (data as Record<string, unknown>).sinVuelta);
}

export function loadNoReturnCard(): EndingCard {
  return readNoReturnCard(raw);
}

export function loadEndingCards(): Readonly<Record<EndingCardKey, EndingCard>> {
  return readEndingCards(raw);
}
