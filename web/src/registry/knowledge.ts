// Lo que el jugador sabe y lo que eso permite: qué lectura toca, qué hechos nuevos da, qué rumores y
// conclusiones hay. Funciones puras sobre un conjunto de hechos: no guardan estado ni tocan el DOM.
import type { Clues, Reading, Source } from './clues';

export type KnownFacts = ReadonlySet<string>;

export interface ReadingView {
  level: 'surface' | 'deep';
  reading: Reading;
  /** La fuente tiene una lectura profunda que aún no se puede leer (el Registro lo avisa). */
  deepPending: boolean;
}

export interface ReadResult extends ReadingView {
  newFacts: string[];
}

function isUnlocked(deep: Reading, known: KnownFacts): boolean {
  return deep.requires.every((id) => known.has(id));
}

/** La lectura más profunda que permiten los hechos que ya se saben. */
export function readingFor(source: Source, known: KnownFacts): ReadingView {
  const { deep, surface } = source;
  if (deep && isUnlocked(deep, known)) return { level: 'deep', reading: deep, deepPending: false };
  return { level: 'surface', reading: surface, deepPending: deep !== undefined };
}

/** Todos los hechos que da la lectura que toca (la profunda incluye los de la superficial). */
function factsOf(source: Source, level: 'surface' | 'deep'): string[] {
  const deepFacts = level === 'deep' ? (source.deep?.facts ?? []) : [];
  return [...new Set([...source.surface.facts, ...deepFacts])];
}

export function readSource(source: Source, known: KnownFacts): ReadResult {
  const view = readingFor(source, known);
  const newFacts = factsOf(source, view.level).filter((id) => !known.has(id));
  return { ...view, newFacts };
}

/**
 * Lo que da una grabación al entenderla entera. No depende de lo que se sepa: entenderla (dar con la
 * velocidad buena) es justo lo que la abre. El `requiere` de los datos dice qué ayuda a encontrarla.
 */
export function understoodFacts(source: Source, known: KnownFacts): string[] {
  return factsOf(source, 'deep').filter((id) => !known.has(id));
}

/** ¿Aún puede dar algo la lectura que toca ahora? (Los rombos del mundo solo marcan lo que falta.) */
export function canGiveNew(source: Source, known: KnownFacts): boolean {
  if (source.kind === 'grabacion' || source.reader)
    return understoodFacts(source, known).length > 0;
  return readSource(source, known).newFacts.length > 0;
}

function groupMet(
  group: readonly string[],
  known: KnownFacts,
  unlocked: ReadonlySet<string>,
): boolean {
  return group.some((id) => known.has(id) || unlocked.has(id));
}

/** Conclusiones desbloqueadas con los hechos que se saben (una conclusión puede requerir otras). */
export function unlockedConclusions(clues: Clues, known: KnownFacts): Set<string> {
  const unlocked = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const conclusion of clues.conclusions) {
      if (unlocked.has(conclusion.id)) continue;
      if (conclusion.requires.every((group) => groupMet(group, known, unlocked))) {
        unlocked.add(conclusion.id);
        changed = true;
      }
    }
  }
  return unlocked;
}

/** Hechos que otros hechos conocidos mencionan y que aún no se saben, en el orden de los datos. */
export function rumorsOf(clues: Clues, known: KnownFacts): string[] {
  const mentioned = new Set<string>();
  for (const id of known) {
    for (const target of clues.facts.get(id)?.mentions ?? []) {
      if (!known.has(target)) mentioned.add(target);
    }
  }
  return [...clues.facts.keys()].filter((id) => mentioned.has(id));
}

/** "Ver también": hechos conocidos enlazados con este, en cualquiera de los dos sentidos. */
export function relatedFacts(clues: Clues, known: KnownFacts, factId: string): string[] {
  const related = new Set<string>(clues.facts.get(factId)?.links ?? []);
  for (const fact of clues.facts.values()) {
    if (fact.links.includes(factId)) related.add(fact.id);
  }
  related.delete(factId);
  return [...clues.facts.keys()].filter((id) => related.has(id) && known.has(id));
}

export interface ObtainableOptions {
  excludeWorlds?: readonly string[];
  excludeSources?: readonly string[];
}

/**
 * Hechos que se pueden llegar a saber leyendo en el orden adecuado, partiendo de no saber nada.
 * Sirve para comprobar que el grafo no tiene hechos imposibles ni requisitos circulares.
 */
export function obtainableFacts(clues: Clues, options: ObtainableOptions = {}): Set<string> {
  const worlds = new Set(options.excludeWorlds);
  const excluded = new Set(options.excludeSources);
  const sources = clues.sources.filter((s) => !worlds.has(s.world) && !excluded.has(s.id));
  const known = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const source of sources) {
      for (const id of readSource(source, known).newFacts) {
        known.add(id);
        changed = true;
      }
    }
  }
  return known;
}
