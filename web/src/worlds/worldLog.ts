// La bitácora de mundos (plan del HUD, hito F): al llegar por primera vez a un mundo nuevo sale su carta (el dibujo,
// el nombre y una línea que lo describe) y el dibujo se pega en su página del cuaderno, junto a lo que se anotó allí.
// Los mundos ya no se nombran a mano: se llaman siempre por su nombre. Hogar y la Luna vienen ya en la bitácora (son
// casa); el Laboratorio Oculto no aparece hasta encontrarlo (ningún hueco puede decir «aquí hay algo»).
import type { NamedWorld } from '../core/save';
import type { Clues } from '../registry/clues';
import { progressNote, worldProgress } from '../registry/worldProgress';
import { worldTitle } from './worldSelection';
import { t } from '../i18n';

/** Los mundos encontrados: id → nombre y ciclo (lo que se guarda; el nombre ya es siempre el oficial). */
export type WorldNames = Readonly<Record<string, NamedWorld>>;

export interface LoggedWorld {
  id: string;
  /** El nombre oficial (el de los Ausentes, o el de casa). */
  name: string;
  /** Lo que el explorador apunta bajo el nombre. */
  where: string;
  /** La descripción breve de la carta de llegada. */
  about: string;
}

/** En el orden del cuaderno. */
export const WORLD_LOG: readonly LoggedWorld[] = [
  {
    id: 'hogar',
    name: t('Hogar'),
    where: t('mi sistema · sin ciclo'),
    about: t('Mi casa: la aldea de los Ool y la cúpula del Instituto.'),
  },
  {
    id: 'luna',
    name: t('Luna'),
    where: t('la luna de Hogar'),
    about: t('Gris y callada. Aquí cayó el fragmento con el borde que brilla.'),
  },
  {
    id: 'umbral',
    name: t('Umbral'),
    where: t('reloj de referencia'),
    about: t('Un atardecer que no acaba y La Boca abierta. Aquí desperté.'),
  },
  {
    id: 'archivo',
    name: t('Archivo'),
    where: t('masa densa · su tiempo va lento'),
    about: t('Un mundo de agua con torres y una galería seca bajo el mar. Su tiempo va lento.'),
  },
  {
    id: 'taller',
    name: t('Taller'),
    where: t('órbita rapidísima'),
    about: t(
      'Un gigante de gas sin suelo y cinco islas de roca encima. Caer a las nubes es morir.',
    ),
  },
  {
    id: 'cicatriz',
    name: t('Cicatriz'),
    where: t('junto al Taller · luz roja'),
    about: t('Hueco y mordido por cortes redondos. En su centro duerme la máquina.'),
  },
  {
    id: 'observatorio',
    name: t('Observatorio'),
    where: t('la luz llega tarde'),
    about: t('Un asteroide lejano con una cúpula y un gran telescopio que mira a la Brasa.'),
  },
  {
    id: 'laboratorio',
    name: t('Laboratorio Oculto'),
    where: t('dentro del Nudo'),
    about: t('Dentro del Nudo todo está del revés. Alguien trabajó aquí a escondidas.'),
  },
  {
    id: 'anclaje_norte',
    name: t('Anclaje Norte'),
    where: t('un polo del Cerco'),
    about: t('Un polo del Cerco: dos anillos a medio hacer alrededor de la Brasa.'),
  },
  {
    id: 'anclaje_sur',
    name: t('Anclaje Sur'),
    where: t('el otro polo del Cerco'),
    about: t('El otro polo del Cerco: dos anillos a medio hacer alrededor de la Brasa.'),
  },
];

/** Casa: está en la bitácora desde el principio. */
const PRENAMED: ReadonlySet<string> = new Set(['hogar', 'luna']);

function logged(id: string): LoggedWorld | undefined {
  return WORLD_LOG.find((world) => world.id === id);
}

/** ¿Sale la carta de mundo nuevo al llegar? Solo en los mundos de la bitácora que aún no se han encontrado. */
export function isNewWorld(names: WorldNames, id: string): boolean {
  return logged(id) !== undefined && !PRENAMED.has(id) && names[id] === undefined;
}

/** La bitácora con un mundo más, con su nombre oficial (no toca la que se le da). */
export function withDiscovery(names: WorldNames, id: string, loop: number): WorldNames {
  return { ...names, [id]: { name: officialName(id), loop } };
}

export function officialName(id: string): string {
  return logged(id)?.name ?? worldTitle(id);
}

/** Lo que el explorador apunta bajo el nombre ('' fuera de la bitácora). */
export function worldWhere(id: string): string {
  return logged(id)?.where ?? '';
}

/** La descripción breve de la carta ('' fuera de la bitácora). */
export function worldAbout(id: string): string {
  return logged(id)?.about ?? '';
}

export interface WorldPage {
  id: string;
  name: string;
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

/** Las páginas de la bitácora: casa siempre; el resto, en cuanto se ha encontrado. */
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
        name: world.name,
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
