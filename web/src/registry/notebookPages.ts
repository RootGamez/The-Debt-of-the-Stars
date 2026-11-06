// El Registro como cuaderno (plan del HUD, hito E): de la vista del Registro (registryView.ts) y la bitácora de
// mundos (worlds/worldLog.ts) a las páginas del libro. Tapa, guarda, «Lo que sé», una o más páginas por pregunta
// (una pregunta larga sigue en la siguiente), el índice de mundos, una página por mundo y la contratapa. Las
// páginas van de dos en dos (cada hoja tiene anverso y reverso). Pura: el panel solo pinta lo que sale de aquí.
import type { TaskItem } from '../game/tasks';
import type { WorldPage } from '../worlds/worldLog';
import type { RegistryView, ThreadView } from './registryView';

/** Lo más que cabe en una página: entradas, o su peso (un hecho con «ver también» ocupa más). */
export const PAGE_CAPACITY = 6;
/** En la primera página de un mundo, el dibujo ocupa casi la mitad. */
const WORLD_FIRST_CAPACITY = 3;
/** Una línea más larga que esto ocupa dos renglones a mano. */
const LONG_LINE = 70;

export type NotebookEntry =
  | {
      kind: 'fact';
      id: string;
      line: string;
      related: readonly string[];
      /** Anotado desde la última vez que se abrió el cuaderno: se escribe delante del jugador. */
      fresh: boolean;
    }
  | { kind: 'rumor'; id: string; question: string; fresh: boolean };

export type NotebookPage =
  | { kind: 'cover' }
  | { kind: 'flyleaf' }
  | { kind: 'known'; conclusions: readonly string[]; totalFacts: number }
  | {
      kind: 'thread';
      threadId: string;
      question: string;
      known: number;
      total: number;
      entries: readonly NotebookEntry[];
      /** 0 = la primera página de la pregunta; 1, 2… = las que la continúan. */
      part: number;
    }
  | { kind: 'worlds'; worlds: readonly { id: string; name: string; page: number }[] }
  | {
      kind: 'world';
      world: WorldPage;
      facts: WorldPage['facts'];
      part: number;
      /** El mundo se nombró desde la última vez: su nombre se escribe al llegar a la página. */
      fresh: boolean;
    }
  /** El prólogo: las tareas con su casilla (solo en casa, antes del primer ciclo). */
  | { kind: 'tasks'; items: readonly TaskItem[] }
  /** El prólogo: lo que se ha aprendido hasta ahora, en el orden en que se aprendió. */
  | { kind: 'learned'; facts: readonly LearnedFact[]; part: number; total: number }
  | { kind: 'blank' }
  | { kind: 'back' };

export interface LearnedFact {
  id: string;
  line: string;
  /** Anotado desde la última vez que se abrió el cuaderno. */
  fresh: boolean;
}

export interface FreshMarks {
  facts: ReadonlySet<string>;
  worlds: ReadonlySet<string>;
}

function weightOf(entry: NotebookEntry): number {
  if (entry.kind === 'rumor') return 1;
  return 1 + entry.related.length * 0.5 + (entry.line.length > LONG_LINE ? 0.5 : 0);
}

/** Parte una lista en trozos que caben en una página; la primera puede tener menos sitio. */
function chunk<T>(items: readonly T[], weight: (item: T) => number, first: number): T[][] {
  const pages: T[][] = [[]];
  let used = 0;
  for (const item of items) {
    const room = pages.length === 1 ? first : PAGE_CAPACITY;
    const page = pages[pages.length - 1] ?? [];
    const w = weight(item);
    if (page.length > 0 && (used + w > room || page.length >= room)) {
      pages.push([item]);
      used = w;
    } else {
      page.push(item);
      used += w;
    }
  }
  return pages;
}

function threadPages(view: ThreadView, fresh: FreshMarks): NotebookPage[] {
  const entries: NotebookEntry[] = [
    ...view.facts.map((fact): NotebookEntry => ({
      kind: 'fact',
      id: fact.id,
      line: fact.line,
      related: fact.related.map((r) => r.line),
      fresh: fresh.facts.has(fact.id),
    })),
    ...view.rumors.map((rumor): NotebookEntry => ({
      kind: 'rumor',
      id: rumor.id,
      question: rumor.question,
      fresh: fresh.facts.has(rumor.id),
    })),
  ];
  return chunk(entries, weightOf, PAGE_CAPACITY).map((part, index) => ({
    kind: 'thread',
    threadId: view.thread.id,
    question: view.thread.question,
    known: view.known,
    total: view.total,
    entries: part,
    part: index,
  }));
}

function worldPagesOf(world: WorldPage, fresh: FreshMarks): NotebookPage[] {
  return chunk(world.facts, () => 1, WORLD_FIRST_CAPACITY).map((facts, index) => ({
    kind: 'world',
    world,
    facts,
    part: index,
    fresh: index === 0 && fresh.worlds.has(world.id),
  }));
}

export function notebookPages(
  view: RegistryView,
  worlds: readonly WorldPage[],
  fresh: FreshMarks,
): NotebookPage[] {
  const pages: NotebookPage[] = [
    { kind: 'cover' },
    { kind: 'flyleaf' },
    {
      kind: 'known',
      conclusions: view.conclusions.map((c) => c.title),
      totalFacts: view.totalFacts,
    },
    ...view.threads.flatMap((thread) => threadPages(thread, fresh)),
  ];
  const indexAt = pages.length;
  const worldPagesList = worlds.map((world) => worldPagesOf(world, fresh));
  const index: { id: string; name: string; page: number }[] = [];
  let next = indexAt + 1;
  for (const [i, world] of worlds.entries()) {
    index.push({ id: world.id, name: world.name, page: next });
    next += worldPagesList[i]?.length ?? 0;
  }
  pages.push({ kind: 'worlds', worlds: index }, ...worldPagesList.flat());
  // La contratapa es el reverso de la última hoja: el total tiene que ser par.
  if (pages.length % 2 === 0) pages.push({ kind: 'blank' });
  pages.push({ kind: 'back' });
  return pages;
}

/**
 * Qué doble página se ve con la página `page` delante. 0 = el libro cerrado (la tapa); la doble página `s` muestra
 * las páginas 2s − 1 (izquierda) y 2s (derecha).
 */
export function spreadOf(page: number): number {
  return Math.ceil(page / 2);
}

/**
 * El cuaderno del prólogo: solo lo que se sabe de verdad. Sin las preguntas sobre los Ausentes ni lo que falta por
 * saber (eso se va llenando al salir de casa); la tapa, la guarda, las tareas y lo aprendido en casa, en orden.
 */
export function prologuePages(
  tasks: readonly TaskItem[],
  learned: readonly LearnedFact[],
): NotebookPage[] {
  const pages: NotebookPage[] = [
    { kind: 'cover' },
    { kind: 'flyleaf' },
    { kind: 'tasks', items: tasks },
  ];
  const lineWeight = (fact: LearnedFact): number => (fact.line.length > LONG_LINE ? 1.5 : 1);
  const parts = chunk(learned, lineWeight, PAGE_CAPACITY);
  for (const [index, facts] of parts.entries()) {
    pages.push({ kind: 'learned', facts, part: index, total: learned.length });
  }
  // La contratapa es el reverso de la última hoja: el total tiene que ser par.
  if (pages.length % 2 === 0) pages.push({ kind: 'blank' });
  pages.push({ kind: 'back' });
  return pages;
}

/** La primera página de una sección (las pestañas del canto): 0 si no la hay. */
export function sectionPage(
  pages: readonly NotebookPage[],
  kind: 'thread' | 'worlds' | 'tasks' | 'learned',
): number {
  return Math.max(
    0,
    pages.findIndex((page) => page.kind === kind),
  );
}
