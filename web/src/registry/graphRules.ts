// Las reglas del grafo de pistas (CONTEXTO_PISTAS.md §7) como comprobaciones. Cada una devuelve la lista
// de fallos en español (vacía si se cumple); los tests las ejecutan sobre los datos reales en cada
// `npm test`, así un cambio en el grafo que rompa una regla no pasa desapercibido.
import type { Clues, Source } from './clues';
import { obtainableFacts, unlockedConclusions } from './knowledge';

/** Todos los hechos que una fuente puede dar (superficial y profunda). */
function factsOfSource(source: Source): string[] {
  return [...source.surface.facts, ...(source.deep?.facts ?? [])];
}

function sourcesGiving(clues: Clues, factIds: readonly string[]): Source[] {
  return clues.sources.filter((s) => factsOfSource(s).some((f) => factIds.includes(f)));
}

/** Regla 1: cada hecho esencial tiene ≥ 2 fuentes y cada conclusión se apoya en ≥ 2 mundos. */
export function checkRedundancy(clues: Clues): string[] {
  const failures: string[] = [];
  for (const conclusion of clues.conclusions) {
    const factGroups = conclusion.requires.filter((group) =>
      group.every((id) => clues.facts.has(id)),
    );
    const worlds = new Set<string>();
    for (const group of factGroups) {
      const sources = sourcesGiving(clues, group);
      sources.forEach((s) => worlds.add(s.world));
      if (sources.length < 2) {
        failures.push(
          `${conclusion.id}: «${group.join(' | ')}» tiene ${sources.length} fuente(s); hacen falta al menos 2`,
        );
      }
    }
    if (factGroups.length > 0 && worlds.size < 2) {
      failures.push(
        `${conclusion.id}: sus fuentes están en ${worlds.size} mundo(s); hacen falta al menos 2 mundos`,
      );
    }
  }
  return failures;
}

export interface SkippableWorlds {
  /** Mundos opcionales (Observatorio). */
  optional: readonly string[];
  /** Mundos del prólogo (Instituto y Luna). */
  prologue: readonly string[];
}

/** Regla 2: ninguna conclusión depende solo del mundo opcional ni solo del prólogo. */
export function checkSkippableWorlds(
  clues: Clues,
  { optional, prologue }: SkippableWorlds,
): string[] {
  const all = unlockedConclusions(clues, obtainableFacts(clues));
  const failures: string[] = [];
  const cases: [string, readonly string[]][] = [
    [optional.join(', '), optional],
    [`el prólogo (${prologue.join(', ')})`, prologue],
  ];
  for (const [label, worlds] of cases) {
    const without = unlockedConclusions(clues, obtainableFacts(clues, { excludeWorlds: worlds }));
    for (const id of all) {
      if (!without.has(id)) failures.push(`${id} depende solo de ${label}`);
    }
  }
  return failures;
}

/** Regla 3: cada mundo aporta una pieza de "dónde" (H5) y una de "por qué" (H3 o H4). */
export function checkWorldContributions(clues: Clues, worlds: readonly string[]): string[] {
  const failures: string[] = [];
  for (const world of worlds) {
    const threads = new Set<string>();
    for (const source of clues.sources.filter((s) => s.world === world)) {
      for (const id of factsOfSource(source))
        clues.facts.get(id)?.threads.forEach((t) => threads.add(t));
    }
    if (!threads.has('H5')) failures.push(`${world}: falta una pieza de "dónde" (hilo H5)`);
    if (!threads.has('H3') && !threads.has('H4'))
      failures.push(`${world}: falta una pieza de "por qué" (hilo H3 o H4)`);
  }
  return failures;
}

/** Regla 4: todo hecho y toda conclusión se pueden alcanzar (sin esperas circulares). */
export function checkReachability(clues: Clues): string[] {
  const obtainable = obtainableFacts(clues);
  const unlocked = unlockedConclusions(clues, obtainable);
  return [
    ...[...clues.facts.keys()]
      .filter((id) => !obtainable.has(id))
      .map((id) => `hecho imposible de conseguir: ${id}`),
    ...clues.conclusions
      .filter((c) => !unlocked.has(c.id))
      .map((c) => `conclusión imposible de desbloquear: ${c.id}`),
  ];
}

export interface WorldMarkers {
  /** `clue_id` de las marcas `INT_` del mundo. */
  clueIds: readonly string[];
  /** Nombres de evento de las marcas `TRIG_` del mundo. */
  events: readonly string[];
}

/** Regla 5: las fuentes de un mundo y sus marcas de Blender se corresponden. */
export function checkMarkers(clues: Clues, world: string, markers: WorldMarkers): string[] {
  const failures: string[] = [];
  for (const id of markers.clueIds) {
    const source = clues.sourceById.get(id);
    if (!source) failures.push(`la marca INT con clue_id "${id}" no existe en el grafo`);
    else if (source.world !== world)
      failures.push(`la marca "${id}" está en ${world} pero la fuente es de ${source.world}`);
  }
  for (const source of clues.sources.filter((s) => s.world === world)) {
    if (source.kind === 'evento') {
      if (!source.eventName || !markers.events.includes(source.eventName)) {
        failures.push(
          `falta la marca TRIG con el evento "${source.eventName}" (fuente ${source.id})`,
        );
      }
    } else if (!markers.clueIds.includes(source.id)) {
      failures.push(`la fuente ${source.id} no tiene marca INT en ${world}`);
    }
  }
  return failures;
}

/** Regla 6: cada fuente da algo y las del prólogo tienen lectura profunda. */
export function checkReadings(clues: Clues, prologueWorlds: readonly string[]): string[] {
  const failures: string[] = [];
  for (const source of clues.sources) {
    if (factsOfSource(source).length === 0) failures.push(`${source.id}: no da ningún hecho`);
    if (prologueWorlds.includes(source.world) && !source.deep) {
      failures.push(`${source.id}: las fuentes del prólogo necesitan lectura profunda`);
    }
  }
  return failures;
}

/** Regla 7: lo que hace falta para llegar al Laboratorio no está dentro del Laboratorio. */
export function checkLabCloses(clues: Clues, conclusionId: string, labWorld: string): string[] {
  const obtainable = obtainableFacts(clues, { excludeWorlds: [labWorld] });
  return unlockedConclusions(clues, obtainable).has(conclusionId)
    ? []
    : [`${conclusionId} no se puede desbloquear sin las fuentes de ${labWorld}`];
}
