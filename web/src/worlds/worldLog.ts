// La bitácora de mundos (plan del HUD, hito F): cada mundo nuevo se nombra al llegar por primera vez y su dibujo
// se pega en su página del cuaderno, junto a lo que se anotó allí. Hogar y la Luna vienen ya nombrados (son casa);
// el Laboratorio Oculto no aparece hasta encontrarlo (ningún hueco puede decir «aquí hay algo»). El nombre propio
// solo se usa en el cuaderno y en la nave: las placas y grabaciones de los Ausentes siguen diciendo «Umbral».
import { MAX_WORLD_NAME, isControlChar, type NamedWorld } from '../core/save';
import type { Clues } from '../registry/clues';
import { progressNote, worldProgress } from '../registry/worldProgress';
import { worldTitle } from './worldSelection';
import { t } from '../i18n';

export { MAX_WORLD_NAME };

/** Los mundos nombrados: id → nombre y ciclo (lo que se guarda). */
export type WorldNames = Readonly<Record<string, NamedWorld>>;

export interface LoggedWorld {
  id: string;
  /** El nombre oficial (el de los Ausentes, o el de casa). */
  name: string;
  /** Lo que el explorador apunta bajo el nombre. */
  where: string;
}

/** En el orden del cuaderno. */
export const WORLD_LOG: readonly LoggedWorld[] = [
  { id: 'hogar', name: t('Hogar'), where: t('mi sistema · sin ciclo') },
  { id: 'luna', name: t('Luna'), where: t('la luna de Hogar') },
  { id: 'umbral', name: t('Umbral'), where: t('reloj de referencia') },
  { id: 'archivo', name: t('Archivo'), where: t('masa densa · su tiempo va lento') },
  { id: 'taller', name: t('Taller'), where: t('órbita rapidísima') },
  { id: 'cicatriz', name: t('Cicatriz'), where: t('junto al Taller · luz roja') },
  { id: 'observatorio', name: t('Observatorio'), where: t('la luz llega tarde') },
  { id: 'laboratorio', name: t('Laboratorio Oculto'), where: t('dentro del Nudo') },
  { id: 'anclaje_norte', name: t('Anclaje Norte'), where: t('un polo del Cerco') },
  { id: 'anclaje_sur', name: t('Anclaje Sur'), where: t('el otro polo del Cerco') },
];

/** Casa: no se nombran, ya tienen nombre. */
const PRENAMED: ReadonlySet<string> = new Set(['hogar', 'luna']);

function logged(id: string): LoggedWorld | undefined {
  return WORLD_LOG.find((world) => world.id === id);
}

/** Lo que escribe el jugador, limpio: sin espacios de más ni caracteres de control, y como mucho 24 letras. */
export function cleanWorldName(input: string, official: string): string {
  const tidy = Array.from(input)
    .filter((char) => !isControlChar(char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (tidy === '') return official;
  return Array.from(tidy).slice(0, MAX_WORLD_NAME).join('').trim();
}

/** ¿Hay que pedir un nombre al llegar? Solo a los mundos de la bitácora que aún no lo tienen. */
export function needsNaming(names: WorldNames, id: string): boolean {
  return logged(id) !== undefined && !PRENAMED.has(id) && names[id] === undefined;
}

/** La bitácora con un mundo más (no toca la que se le da). */
export function withDiscovery(
  names: WorldNames,
  id: string,
  name: string,
  loop: number,
): WorldNames {
  return { ...names, [id]: { name, loop } };
}

export function officialName(id: string): string {
  return logged(id)?.name ?? worldTitle(id);
}

/** Lo que el explorador apunta bajo el nombre ('' fuera de la bitácora). */
export function worldWhere(id: string): string {
  return logged(id)?.where ?? '';
}

/** El nombre que se ve en el cuaderno y en el cartel de llegada. */
export function displayName(names: WorldNames, id: string): string {
  return names[id]?.name ?? officialName(id);
}

/** El nombre del objetivo de la nave: el tuyo, con el oficial entre paréntesis si es distinto. */
export function shipLabel(names: WorldNames, id: string): string {
  const own = displayName(names, id);
  const official = officialName(id);
  return own === official ? official : `${own} (${official})`;
}

export interface WorldPage {
  id: string;
  name: string;
  official: string;
  where: string;
  /** El ciclo en que se encontró (sin él: casa, de antes del primer ciclo). */
  loop: number | undefined;
  /** Lo anotado allí, en el orden de los datos. */
  facts: readonly { id: string; line: string }[];
  /** La nota a mano: si queda algo por leer allí (sin ella, allí no hay nada que leer). */
  note?: string;
  /** Ya se ha leído todo lo de allí. */
  complete?: boolean;
}

/** De qué mundo es cada hecho: el de la primera fuente que lo da. */
const factWorlds = new WeakMap<Clues, ReadonlyMap<string, string>>();
function worldOfFacts(clues: Clues): ReadonlyMap<string, string> {
  let map = factWorlds.get(clues);
  if (!map) {
    const built = new Map<string, string>();
    for (const source of clues.sources) {
      for (const fact of [...source.surface.facts, ...(source.deep?.facts ?? [])]) {
        if (!built.has(fact)) built.set(fact, source.world);
      }
    }
    factWorlds.set(clues, built);
    map = built;
  }
  return map;
}

/** Las páginas de la bitácora: casa siempre; el resto, en cuanto tiene nombre. */
export function worldPages(
  names: WorldNames,
  clues: Clues,
  known: ReadonlySet<string>,
  opened: ReadonlySet<string> = new Set(),
): WorldPage[] {
  const worlds = worldOfFacts(clues);
  const progress = worldProgress(clues, opened);
  return WORLD_LOG.filter((world) => PRENAMED.has(world.id) || names[world.id] !== undefined).map(
    (world): WorldPage => {
      const page: WorldPage = {
        id: world.id,
        name: displayName(names, world.id),
        official: world.name,
        where: world.where,
        loop: names[world.id]?.loop,
        facts: [...worlds]
          .filter(([fact, owner]) => owner === world.id && known.has(fact))
          .map(([fact]) => ({ id: fact, line: clues.facts.get(fact)?.line ?? fact })),
      };
      // Casa no lleva nota: en el bucle no se vuelve, y quedaría para siempre «aún queda algo».
      if (PRENAMED.has(world.id)) return page;
      const here = progress.get(world.id);
      const note = progressNote(here);
      if (!here || note === undefined) return page;
      return { ...page, note, complete: here.opened >= here.total };
    },
  );
}
