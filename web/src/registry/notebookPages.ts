// El Registro como cuaderno (plan del HUD, hito E): de la vista del Registro (registryView.ts) y la bitácora de
// mundos (worlds/worldLog.ts) a las páginas del libro. Tapa, guarda, «Lo que sé», una o más páginas por pregunta
// (una pregunta larga sigue en la siguiente), el índice de mundos, una página por mundo y la contratapa. Las
// páginas van de dos en dos (cada hoja tiene anverso y reverso). Pura: el panel solo pinta lo que sale de aquí.
// Cuánto cabe en una página depende de la pantalla y de la letra (`PageFit`, de bookLayout.ts): cada cosa se mide
// en renglones y, lo que no cabe, sigue en la página siguiente. Ninguna lista se queda fuera de la hoja.
import type { TaskItem } from '../game/tasks';
import type { WorldPage } from '../worlds/worldLog';
import type { DeductionPiece, DeductionView, RegistryView, ThreadView } from './registryView';
import { DESIGN_FIT, type PageFit } from './bookLayout';

/** Separación entre dos entradas de una lista y entre dos bloques de la página, en renglones. */
const ENTRY_GAP = 0.4;
const BLOCK_GAP = 0.45;
/** Un título se escribe más grande (1,35) y más apretado; el lápiz de las cuentas, más pequeño. */
const TITLE_SIZE = 1.35;
const TITLE_LEADING = 1.05 / 1.15;
const SMALL_SIZE = 0.82;
/** La raya a lápiz sobre cada pregunta, con su aire. */
const THREAD_RULE = 0.7;

export type NotebookEntry =
  | {
      kind: 'fact';
      id: string;
      line: string;
      related: readonly string[];
      /** Dibujo pegado junto al hecho. */
      sketch?: string;
      /** Anotado desde la última vez que se abrió el cuaderno: se escribe delante del jugador. */
      fresh: boolean;
    }
  | { kind: 'rumor'; id: string; question: string; fresh: boolean };

export type NotebookPage =
  | { kind: 'cover' }
  | { kind: 'flyleaf' }
  | { kind: 'known'; conclusions: readonly string[]; totalFacts: number; part: number }
  /** Una conclusión empezada: lo que sé, lo que falta (con su orientación) y, completa, qué puedo hacer. */
  | { kind: 'deduction'; deduction: DeductionView; pieces: readonly DeductionPiece[]; part: number }
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
  | {
      kind: 'worlds';
      worlds: readonly { id: string; name: string; page: number; complete?: boolean }[];
      part: number;
    }
  | {
      kind: 'world';
      world: WorldPage;
      facts: WorldPage['facts'];
      part: number;
      /** El mundo se nombró desde la última vez: su nombre se escribe al llegar a la página. */
      fresh: boolean;
    }
  /** El prólogo: las tareas con su casilla (solo en casa, antes del primer ciclo). */
  | { kind: 'tasks'; items: readonly TaskItem[]; part: number; done: number; total: number }
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

/** Renglones que ocupa un texto escrito con letra `size` veces la normal (los renglones también crecen). */
export function linesOf(text: string, fit: PageFit, size = 1, indent = 0): number {
  const perLine = Math.max(4, (fit.chars - indent) / size);
  return Math.max(1, Math.ceil(text.length / perLine)) * size;
}

/** Un título: negrita y repartido en renglones parejos, así que cunde algo menos. */
function titleLines(text: string, fit: PageFit, continued = false): number {
  const written = continued ? `${text} (sigue)` : text;
  return linesOf(written, { ...fit, chars: fit.chars * 0.97 }, TITLE_SIZE) * TITLE_LEADING;
}

/** Lo que ocupa una entrada de una pregunta, en renglones (sin la separación con la siguiente). */
export function weightOf(entry: NotebookEntry, fit: PageFit = DESIGN_FIT): number {
  if (entry.kind === 'rumor') return linesOf(`? ${entry.question}`, fit);
  let lines = linesOf(entry.line, fit, 1, 2);
  if (entry.sketch !== undefined) lines += fit.sketchLines;
  if (entry.related.length > 0) {
    lines += 0.9 + ENTRY_GAP; // el rótulo «Ver también»
    for (const line of entry.related) lines += linesOf(line, fit, 0.85, 4) + ENTRY_GAP * 0.85;
  }
  return lines;
}

/**
 * Parte una lista en páginas: `room(k)` son los renglones libres de la página k (la primera suele tener menos:
 * lleva el título entero, o un dibujo). Si lo primero no cabe en la primera, la primera se queda solo con su
 * cabecera y pasa a una página entera. Algo que no cabe ni en una página entera va solo en la suya.
 */
function chunk<T>(
  items: readonly T[],
  weight: (item: T) => number,
  room: (page: number) => number,
): T[][] {
  const pages: T[][] = [[]];
  let used = 0;
  for (const item of items) {
    const index = pages.length - 1;
    const page = pages[index] ?? [];
    const w = weight(item) + ENTRY_GAP;
    const fits = used + w - ENTRY_GAP <= room(index);
    const betterOnNext = page.length > 0 || (index === 0 && room(1) > room(0));
    if (!fits && betterOnNext) {
      pages.push([item]);
      used = w;
    } else {
      page.push(item);
      used += w;
    }
  }
  return pages;
}

function threadPages(view: ThreadView, fresh: FreshMarks, fit: PageFit): NotebookPage[] {
  const entries: NotebookEntry[] = [
    ...view.facts.map((fact): NotebookEntry => ({
      kind: 'fact',
      id: fact.id,
      line: fact.line,
      related: fact.related.map((r) => r.line),
      ...(fact.sketch === undefined ? {} : { sketch: fact.sketch }),
      fresh: fresh.facts.has(fact.id),
    })),
    ...view.rumors.map((rumor): NotebookEntry => ({
      kind: 'rumor',
      id: rumor.id,
      question: rumor.question,
      fresh: fresh.facts.has(rumor.id),
    })),
  ];
  const header = (part: number): number =>
    THREAD_RULE + titleLines(view.thread.question, fit, part > 0) + SMALL_SIZE + BLOCK_GAP;
  return chunk(
    entries,
    (entry) => weightOf(entry, fit),
    (part) => fit.lines - header(part),
  ).map((part, index) => ({
    kind: 'thread',
    threadId: view.thread.id,
    question: view.thread.question,
    known: view.known,
    total: view.total,
    entries: part,
    part: index,
  }));
}

function worldPagesOf(world: WorldPage, fresh: FreshMarks, fit: PageFit): NotebookPage[] {
  const name = (part: number): number => titleLines(world.name, fit, part > 0) + BLOCK_GAP;
  // La primera página lleva el dibujo, dónde está y la nota de lo que queda por leer.
  const first =
    fit.photoLines +
    BLOCK_GAP +
    name(0) +
    linesOf(world.where, fit, SMALL_SIZE) +
    SMALL_SIZE +
    BLOCK_GAP +
    (world.note === undefined ? 0 : linesOf(world.note, fit) + BLOCK_GAP);
  return chunk(
    world.facts,
    (fact) => linesOf(fact.line, fit, 1, 2),
    (part) => fit.lines - (part === 0 ? first : name(part)),
  ).map((facts, index) => ({
    kind: 'world',
    world,
    facts,
    part: index,
    fresh: index === 0 && fresh.worlds.has(world.id),
  }));
}

function knownPages(view: RegistryView, fit: PageFit): NotebookPage[] {
  const header = titleLines('Lo que sé', fit) + BLOCK_GAP + SMALL_SIZE + BLOCK_GAP;
  return chunk(
    view.conclusions.map((c) => c.title),
    (title) => linesOf(title, fit),
    () => fit.lines - header,
  ).map((conclusions, index) => ({
    kind: 'known',
    conclusions,
    totalFacts: view.totalFacts,
    part: index,
  }));
}

function deductionPages(deduction: DeductionView, fit: PageFit): NotebookPage[] {
  const title = (part: number): number =>
    titleLines(deduction.title, fit, part > 0) + BLOCK_GAP + SMALL_SIZE + BLOCK_GAP;
  // Completa, la primera página empieza por lo que ahora sé y qué puedo hacer.
  let first = title(0);
  if (deduction.unlocked && deduction.knowLine !== undefined) {
    first += linesOf(deduction.knowLine, fit) + 0.6 + BLOCK_GAP;
  }
  if (deduction.unlocked && deduction.action !== undefined) {
    first += linesOf(`Qué puedo hacer ahora: ${deduction.action}`, fit, 1, 2) + 0.5 + BLOCK_GAP;
  }
  return chunk(
    deduction.pieces,
    (piece) =>
      linesOf(`? ${piece.line}`, fit) +
      (piece.sketch === undefined ? 0 : fit.sketchLines) +
      (!piece.met && piece.lead !== undefined ? linesOf(piece.lead, fit, 0.8, 3) + 0.4 : 0),
    (part) => fit.lines - (part === 0 ? first : title(part)),
  ).map((pieces, index) => ({ kind: 'deduction', deduction, pieces, part: index }));
}

type WorldIndexEntry = { id: string; name: string; page: number; complete?: boolean };

export function notebookPages(
  view: RegistryView,
  worlds: readonly WorldPage[],
  fresh: FreshMarks,
  fit: PageFit = DESIGN_FIT,
): NotebookPage[] {
  const pages: NotebookPage[] = [
    { kind: 'cover' },
    { kind: 'flyleaf' },
    ...knownPages(view, fit),
    ...view.deductions.flatMap((deduction) => deductionPages(deduction, fit)),
    ...view.threads.flatMap((thread) => threadPages(thread, fresh, fit)),
  ];
  const worldPagesList = worlds.map((world) => worldPagesOf(world, fresh, fit));
  // El índice puede ocupar más de una página: se reparte antes de numerar, para saber dónde cae cada mundo.
  const indexHeader =
    titleLines('Bitácora de mundos', fit) +
    BLOCK_GAP +
    linesOf('A cada mundo que encuentro le pego su dibujo.', fit, SMALL_SIZE) +
    BLOCK_GAP;
  const indexParts = chunk(
    worlds,
    (world) => linesOf(`${world.name} · p. 000 ✓`, fit),
    () => fit.lines - indexHeader,
  );
  let next = pages.length + indexParts.length;
  const pageOf = new Map<string, number>();
  for (const [i, world] of worlds.entries()) {
    pageOf.set(world.id, next);
    next += worldPagesList[i]?.length ?? 0;
  }
  for (const [part, listed] of indexParts.entries()) {
    pages.push({
      kind: 'worlds',
      worlds: listed.map((world): WorldIndexEntry => ({
        id: world.id,
        name: world.name,
        page: pageOf.get(world.id) ?? 0,
        ...(world.complete !== undefined && { complete: world.complete }),
      })),
      part,
    });
  }
  pages.push(...worldPagesList.flat());
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
  fit: PageFit = DESIGN_FIT,
): NotebookPage[] {
  const pages: NotebookPage[] = [{ kind: 'cover' }, { kind: 'flyleaf' }];
  const done = tasks.filter((task) => task.done).length;
  const tasksHeader = (part: number): number =>
    titleLines('Tareas', fit, part > 0) + BLOCK_GAP + SMALL_SIZE + BLOCK_GAP;
  const taskParts = chunk(
    tasks,
    (task) =>
      linesOf(task.title, fit, 1, 4) + (task.current ? linesOf(task.hint, fit, 0.78, 3) + 0.1 : 0),
    (part) => fit.lines - tasksHeader(part),
  );
  for (const [part, items] of taskParts.entries()) {
    pages.push({ kind: 'tasks', items, part, done, total: tasks.length });
  }
  const learnedHeader = (part: number): number =>
    titleLines('Lo que he aprendido', fit, part > 0) + BLOCK_GAP;
  const parts = chunk(
    learned,
    (fact) => linesOf(fact.line, fit, 1, 2),
    (part) => fit.lines - learnedHeader(part),
  );
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

/** La página de las tareas donde está la de ahora (la tecla T va a esa); si no hay, la primera de tareas. */
export function currentTaskPage(pages: readonly NotebookPage[]): number {
  const current = pages.findIndex(
    (page) => page.kind === 'tasks' && page.items.some((item) => item.current),
  );
  return current >= 0 ? current : sectionPage(pages, 'tasks');
}

/**
 * De qué trata una página, sin la parte: sirve para volver al mismo sitio cuando el cuaderno se reparte de nuevo
 * (al girar el teléfono o cambiar de tamaño la ventana).
 */
export function pageTopic(page: NotebookPage | undefined): string {
  if (!page) return '';
  switch (page.kind) {
    case 'thread':
      return `thread:${page.threadId}`;
    case 'world':
      return `world:${page.world.id}`;
    case 'deduction':
      return `deduction:${page.deduction.id}`;
    default:
      return page.kind;
  }
}

/** La primera página de un tema (ver `pageTopic`); -1 si ya no está. */
export function topicPage(pages: readonly NotebookPage[], topic: string): number {
  return pages.findIndex((page) => pageTopic(page) === topic);
}
