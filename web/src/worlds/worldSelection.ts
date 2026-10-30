// Qué mundo se carga. Por defecto Umbral (la llegada); `?mundo=<id>` permite probar los demás.
// Solo se aceptan ids conocidos: la URL nunca decide qué archivo arbitrario se descarga.

/** Mundos base de CONTEXTO_PLANETAS.md (nombres provisionales). */
export const WORLD_IDS = [
  'umbral',
  'archivo',
  'taller',
  'cicatriz',
  'observatorio',
  'laboratorio',
  'hogar',
  'luna',
  'puertas',
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

export const DEFAULT_WORLD: WorldId = 'umbral';
/** El Archivo de las Puertas, tras cruzar el horizonte estable (Fase 10D). */
export const EPILOGUE_WORLD: WorldId = 'puertas';
/** Donde empieza una partida nueva: en casa, el prólogo (Fase 9). */
export const PROLOGUE_WORLD: WorldId = 'hogar';

function isWorldId(value: string): value is WorldId {
  return (WORLD_IDS as readonly string[]).includes(value);
}

/** El mundo de `?mundo=`, o `fallback` si no hay o no es conocido. */
export function worldFromQuery(search: string, fallback: WorldId = DEFAULT_WORLD): WorldId {
  const requested = new URLSearchParams(search).get('mundo')?.toLowerCase() ?? '';
  return isWorldId(requested) ? requested : fallback;
}

/** Dónde se empieza: `?mundo=` manda; si no, en casa hasta haber cruzado el gusano y en Umbral después. */
export function startWorld(search: string, prologueDone: boolean): WorldId {
  return worldFromQuery(search, prologueDone ? DEFAULT_WORLD : PROLOGUE_WORLD);
}

/**
 * Adónde ir al cruzar el gusano: la misma dirección sin `?mundo=` (el guardado ya dice que se empieza en
 * Umbral). Si no se pudo guardar (modo privado), se pide Umbral en la dirección: si no, volvería a casa.
 */
export function arrivalHref(href: string, saved: boolean): string {
  const url = new URL(href);
  url.hash = ''; // con un fragmento, ir a la misma dirección no recargaría la página
  url.searchParams.delete('mundo');
  if (!saved) url.searchParams.set('mundo', DEFAULT_WORLD);
  return url.toString();
}

/**
 * Adónde ir al cruzar el horizonte estable: al Archivo de las Puertas. Va en la dirección (`?mundo=`), no en el
 * guardado: recargar allí sigue allí, y cerrar el juego vuelve a empezar el ciclo en Umbral.
 */
export function epilogueHref(href: string): string {
  const url = new URL(href);
  url.hash = '';
  url.searchParams.set('mundo', EPILOGUE_WORLD);
  return url.toString();
}

/** El final con el que se vuelve a casa por una boca del Archivo (`?final=`, Fase 10). */
export const ENDING_PARAM = 'final';

/** Adónde ir al cruzar una boca de casa: a Hogar, con el final que salió de la boca y de los planos. */
export function homecomingHref(href: string, ending: string): string {
  const url = new URL(href);
  url.hash = '';
  url.searchParams.set('mundo', PROLOGUE_WORLD);
  url.searchParams.set(ENDING_PARAM, ending);
  return url.toString();
}

/** "umbral" → "Umbral". */
export function worldTitle(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
