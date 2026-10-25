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
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

export const DEFAULT_WORLD: WorldId = 'umbral';

function isWorldId(value: string): value is WorldId {
  return (WORLD_IDS as readonly string[]).includes(value);
}

export function worldFromQuery(search: string): WorldId {
  const requested = new URLSearchParams(search).get('mundo')?.toLowerCase() ?? '';
  return isWorldId(requested) ? requested : DEFAULT_WORLD;
}

/** "umbral" → "Umbral". */
export function worldTitle(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
