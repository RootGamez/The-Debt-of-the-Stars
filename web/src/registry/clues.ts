// Modelo del grafo de pistas (CONTEXTO_PISTAS.md) y su validación. Los datos vienen de
// src/data/pistas/*.json con claves en español; aquí se convierten a tipos con nombres en inglés.
// Como cualquier dato externo, se validan al cargar y se falla con un mensaje claro y el id afectado.
import { WorldDataError } from '../worlds/markers';

/** `charla`: alguien que habla (Fase 9); puede no dar ningún hecho (vecinos de la aldea). */
export const SOURCE_KINDS = [
  'texto',
  'grabacion',
  'objeto',
  'observacion',
  'evento',
  'charla',
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
/**
 * Lectores de puzle (reading/puzzles.ts): el cuaderno de Umbral y las cartas del Archivo (Fase 7); los diarios de
 * los gemelos, la consola de la Cabina y la pizarra del Laboratorio (Fase 10A); las ruedas de la cuna del núcleo
 * (Fase 10C, las pone el juego: miran el Contrapeso en vivo); las bocas de casa del Archivo de las Puertas (Fase 10D,
 * también las pone el juego: según lo que se ha entendido, dejan cruzar).
 */
export const PUZZLE_READERS = [
  'cuaderno',
  'cartas',
  'gemelos',
  'cabina',
  'pizarra',
  'ruedas',
  'bocas',
  'pista',
] as const;
export type PuzzleReader = (typeof PUZZLE_READERS)[number];

const ID = /^[a-z0-9_.-]{1,64}$/i;
const CONCLUSION_ID = /^K[0-9A-Z]{1,3}$/;
const MAX_PARAGRAPHS = 60;
const MAX_PARAGRAPH_LENGTH = 2000;

export interface Thread {
  id: string;
  question: string;
  answer: string;
}

export interface Fact {
  id: string;
  threads: string[];
  /** Una línea para el Registro. */
  line: string;
  /** Hechos que este deja "en rumor" (el Registro los muestra como pregunta). */
  mentions: string[];
  /** Hechos relacionados ("ver también"). */
  links: string[];
  /** Pregunta que se muestra mientras el hecho es solo un rumor. */
  rumor: string | undefined;
}

/** Una lectura de una fuente; la profunda exige haber aprendido antes `requires`. */
export interface Reading {
  text: string[];
  facts: string[];
  requires: string[];
}

export interface Source {
  id: string;
  world: string;
  kind: SourceKind;
  title: string;
  /** Texto provisional que Anthony reescribirá. */
  draft: boolean;
  /**
   * De ambiente (`"ambiente": true`, Fase 11G): algo que se lee por curiosidad (las notas de Hogar para quien se
   * aleja). No da hechos ni tiene lectura profunda: no pesa en el grafo.
   */
  ambient: boolean;
  /** Evento de la cronología durante el cual la fuente se puede leer (luz de la ranura, secuencia…). */
  when: string | undefined;
  /** Nombre del evento (`TRIG_`) que se presencia, para las fuentes de tipo "evento". */
  eventName: string | undefined;
  /**
   * Solo las grabaciones: ritmo del reloj con que se grabaron (0,20 = donde el tiempo iba cinco veces
   * más lento). Se entienden reproducidas a la velocidad que deshace ese reloj (reading/recording.ts).
   */
  recordedRate: number | undefined;
  /** Lector de puzle (`lector` en los datos): lo que da la fuente se anota al resolverlo. */
  reader: PuzzleReader | undefined;
  surface: Reading;
  deep: Reading | undefined;
}

/** Cada grupo se cumple con cualquiera de sus ids (hecho o conclusión); todos los grupos hacen falta. */
export type Requirement = readonly string[];

export interface Conclusion {
  id: string;
  title: string;
  thread: string;
  requires: Requirement[];
}

export interface Clues {
  threads: Thread[];
  facts: Map<string, Fact>;
  conclusions: Conclusion[];
  sources: Source[];
  sourceById: Map<string, Source>;
  conclusionById: Map<string, Conclusion>;
}

export interface ClueContext {
  worlds: readonly string[];
  /** Ids de eventos de la cronología y nombres de marcas TRIG_. */
  events: readonly string[];
}

type Rec = Record<string, unknown>;

function fail(message: string): never {
  throw new WorldDataError(`pistas: ${message}`);
}

function isRec(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function list(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail(`${where} debe ser una lista`);
  return value;
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    fail(`${where} debe ser un texto no vacío`);
  return value;
}

function ids(value: unknown, where: string): string[] {
  return list(value ?? [], where).map((v) => {
    const id = text(v, where);
    if (!ID.test(id)) fail(`${where}: id no válido "${id}"`);
    return id;
  });
}

function record(value: unknown, where: string): Rec {
  if (!isRec(value)) fail(`${where} debe ser un objeto`);
  return value;
}

function uniqueId(seen: Set<string>, id: string, kind: string): void {
  if (!ID.test(id)) fail(`${kind} con id no válido "${id}"`);
  if (seen.has(id)) fail(`${kind} repetido: ${id}`);
  seen.add(id);
}

function parseThreads(raw: unknown): Thread[] {
  const seen = new Set<string>();
  return list(raw, 'hilos').map((item) => {
    const r = record(item, 'hilo');
    const id = text(r.id, 'hilo.id');
    uniqueId(seen, id, 'hilo');
    return {
      id,
      question: text(r.pregunta, `${id}.pregunta`),
      answer: text(r.respuesta, `${id}.respuesta`),
    };
  });
}

function parseFacts(raw: unknown, threadIds: ReadonlySet<string>): Map<string, Fact> {
  const facts = new Map<string, Fact>();
  for (const item of list(raw, 'hechos')) {
    const r = record(item, 'hecho');
    const id = text(r.id, 'hecho.id');
    uniqueId(new Set(facts.keys()), id, 'hecho');
    const threads = ids(r.hilos, `${id}.hilos`);
    if (threads.length === 0) fail(`${id} necesita al menos un hilo`);
    for (const t of threads) if (!threadIds.has(t)) fail(`${id}: hilo desconocido ${t}`);
    facts.set(id, {
      id,
      threads,
      line: text(r.frase, `${id}.frase`),
      mentions: ids(r.menciona, `${id}.menciona`),
      links: ids(r.enlaces, `${id}.enlaces`),
      rumor: r.rumor === undefined ? undefined : text(r.rumor, `${id}.rumor`),
    });
  }
  return facts;
}

function checkFactReferences(facts: Map<string, Fact>): void {
  const mentioned = new Set<string>();
  for (const fact of facts.values()) {
    for (const target of [...fact.mentions, ...fact.links]) {
      if (!facts.has(target)) fail(`${fact.id} apunta a un hecho desconocido: ${target}`);
    }
    fact.mentions.forEach((m) => mentioned.add(m));
  }
  for (const id of mentioned) {
    if (!facts.get(id)?.rumor) fail(`${id} se menciona como rumor y necesita el texto "rumor"`);
  }
}

function parseRequirement(raw: unknown, where: string): Requirement {
  const group = typeof raw === 'string' ? [raw] : ids(raw, where);
  if (group.length === 0) fail(`${where}: un grupo de alternativas no puede estar vacío`);
  return group.map((id) => text(id, where));
}

function parseConclusions(
  raw: unknown,
  threadIds: ReadonlySet<string>,
  facts: Map<string, Fact>,
): Conclusion[] {
  const items = list(raw, 'conclusiones').map((item) => record(item, 'conclusión'));
  const names = new Set<string>();
  const parsed = items.map((r) => {
    const id = text(r.id, 'conclusión.id');
    if (!CONCLUSION_ID.test(id)) fail(`conclusión con id no válido "${id}" (K1, K3, KC…)`);
    if (facts.has(id) || names.has(id)) fail(`conclusión repetida o igual a un hecho: ${id}`);
    names.add(id);
    const thread = text(r.hilo, `${id}.hilo`);
    if (!threadIds.has(thread)) fail(`${id}: hilo desconocido ${thread}`);
    const requires = list(r.requiere, `${id}.requiere`).map((g) =>
      parseRequirement(g, `${id}.requiere`),
    );
    if (requires.length === 0) fail(`${id} necesita al menos un requisito`);
    return { id, title: text(r.titulo, `${id}.titulo`), thread, requires };
  });
  for (const c of parsed) {
    for (const target of c.requires.flat()) {
      if (!facts.has(target) && !names.has(target))
        fail(`${c.id} requiere algo desconocido: ${target}`);
    }
  }
  checkConclusionCycles(parsed);
  return parsed;
}

function checkConclusionCycles(conclusions: readonly Conclusion[]): void {
  const byId = new Map(conclusions.map((c) => [c.id, c]));
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting')
      fail(`las conclusiones se requieren en círculo: ${[...path, id].join(' → ')}`);
    state.set(id, 'visiting');
    for (const target of byId.get(id)?.requires.flat() ?? []) {
      if (byId.has(target)) visit(target, [...path, id]);
    }
    state.set(id, 'done');
  };
  conclusions.forEach((c) => {
    visit(c.id, []);
  });
}

function parseReading(
  raw: unknown,
  where: string,
  facts: Map<string, Fact>,
  deep: boolean,
): Reading {
  const r = record(raw, where);
  const paragraphs = list(r.texto, `${where}.texto`);
  if (paragraphs.length === 0 || paragraphs.length > MAX_PARAGRAPHS) {
    fail(`${where}.texto debe tener entre 1 y ${MAX_PARAGRAPHS} párrafos`);
  }
  const body = paragraphs.map((p) => {
    const value = text(p, `${where}.texto`);
    if (value.length > MAX_PARAGRAPH_LENGTH)
      fail(`${where}: un párrafo supera ${MAX_PARAGRAPH_LENGTH} caracteres`);
    return value;
  });
  const given = ids(r.hechos, `${where}.hechos`);
  const requires = deep ? ids(r.requiere, `${where}.requiere`) : [];
  if (deep && requires.length === 0) fail(`${where}: la lectura profunda necesita "requiere"`);
  for (const id of [...given, ...requires])
    if (!facts.has(id)) fail(`${where}: hecho desconocido ${id}`);
  return { text: body, facts: given, requires };
}

const KINDS: readonly string[] = SOURCE_KINDS;
/** Ritmos de reloj razonables para una grabación (el más rápido del sistema anda cerca de 1,2). */
const MAX_RECORDED_RATE = 10;

const READERS: readonly string[] = PUZZLE_READERS;

function parseReader(raw: unknown, id: string): PuzzleReader | undefined {
  if (raw === undefined) return undefined;
  const reader = text(raw, `${id}.lector`);
  if (!READERS.includes(reader))
    fail(`${id}: lector desconocido "${reader}" (${PUZZLE_READERS.join(', ')})`);
  return reader as PuzzleReader;
}

function parseRecordedRate(raw: unknown, id: string, kind: string): number | undefined {
  if (kind !== 'grabacion') {
    if (raw !== undefined) fail(`${id}: solo las grabaciones llevan "reloj"`);
    return undefined;
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0 || raw > MAX_RECORDED_RATE) {
    fail(`${id}: las grabaciones necesitan "reloj", un ritmo entre 0 y ${MAX_RECORDED_RATE}`);
  }
  return raw;
}

function parseSource(item: unknown, facts: Map<string, Fact>, context: ClueContext): Source {
  const r = record(item, 'fuente');
  const id = text(r.id, 'fuente.id');
  if (!ID.test(id)) fail(`fuente con id no válido "${id}"`);
  const world = text(r.mundo, `${id}.mundo`);
  if (!context.worlds.includes(world)) fail(`${id}: mundo desconocido "${world}"`);
  const kind = text(r.tipo, `${id}.tipo`);
  if (!KINDS.includes(kind)) fail(`${id}: tipo desconocido "${kind}" (${SOURCE_KINDS.join(', ')})`);
  const eventName = r.evento === undefined ? undefined : text(r.evento, `${id}.evento`);
  if (kind === 'evento' && eventName === undefined)
    fail(`${id}: las fuentes de tipo evento necesitan "evento"`);
  const when = r.cuando === undefined ? undefined : text(r.cuando, `${id}.cuando`);
  for (const name of [eventName, when]) {
    if (name !== undefined && !context.events.includes(name))
      fail(`${id}: evento desconocido "${name}"`);
  }
  if (r.superficial === undefined) fail(`${id} necesita la lectura "superficial"`);
  const ambient = r.ambiente === true;
  const surface = parseReading(r.superficial, `${id}.superficial`, facts, false);
  if (ambient && (surface.facts.length > 0 || r.profunda !== undefined)) {
    fail(`${id}: las fuentes de ambiente no dan hechos ni tienen lectura profunda`);
  }
  return {
    id,
    world,
    kind: kind as SourceKind,
    title: text(r.titulo, `${id}.titulo`),
    draft: r.borrador === true,
    ambient,
    when,
    eventName,
    recordedRate: parseRecordedRate(r.reloj, id, kind),
    reader: parseReader(r.lector, id),
    surface,
    deep:
      r.profunda === undefined
        ? undefined
        : parseReading(r.profunda, `${id}.profunda`, facts, true),
  };
}

function parseSources(raw: unknown, facts: Map<string, Fact>, context: ClueContext): Source[] {
  const seen = new Set<string>();
  const events = new Map<string, string>();
  return list(raw, 'fuentes').map((item) => {
    const source = parseSource(item, facts, context);
    uniqueId(seen, source.id, 'fuente');
    if (source.kind === 'evento' && source.eventName !== undefined) {
      const other = events.get(source.eventName);
      if (other) fail(`${source.id} y ${other} usan el mismo evento "${source.eventName}"`);
      events.set(source.eventName, source.id);
    }
    return source;
  });
}

export function parseClues(raw: unknown, context: ClueContext): Clues {
  if (!isRec(raw)) fail('el archivo de pistas no es un objeto');
  const threads = parseThreads(raw.hilos);
  const threadIds = new Set(threads.map((t) => t.id));
  const facts = parseFacts(raw.hechos, threadIds);
  checkFactReferences(facts);
  const conclusions = parseConclusions(raw.conclusiones, threadIds, facts);
  const sources = parseSources(raw.fuentes, facts, context);
  return {
    threads,
    facts,
    conclusions,
    sources,
    sourceById: new Map(sources.map((s) => [s.id, s])),
    conclusionById: new Map(conclusions.map((c) => [c.id, c])),
  };
}
