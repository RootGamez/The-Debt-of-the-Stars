// Guardado entre ciclos. Lo único que persiste es el conocimiento (CONTEXTO_HISTORIA.md §8): el número de
// ciclos, la lista de hechos descubiertos (Fase 4), si ya se jugó el prólogo en casa (Fase 9, versión 2) y los
// finales vistos (Fase 10, versión 3), los nombres que el jugador puso a cada mundo de su bitácora (versión 4) y las
// tareas del bucle ya hechas y las fuentes abiertas (plan de la llegada, hitos B y C, versión 5).
// Lo leído de localStorage se trata como dato externo: se valida y, si está dañado o manipulado,
// se descarta y se empieza de cero con un aviso. Sin almacenamiento (modo privado) se juega igual.

export const SAVE_KEY = 'bucle-tiempo:partida';
export const SAVE_VERSION = 5;
export const MAX_LOOPS = 1_000_000;
export const MAX_FACTS = 5000;
/** Ids de hechos: "mundo.nombre" con letras, números, guiones y puntos. */
const FACT_ID = /^[a-z0-9_.-]{1,64}$/i;
/** Ids de mundos ("umbral", "laboratorio"…). */
const WORLD_ID = /^[a-z0-9_-]{1,32}$/;
/** Ids de tareas ("nave_umbral"…) y cuántas puede haber como mucho. */
const TASK_ID = /^[a-z0-9_]{1,32}$/;
export const MAX_TASKS = 64;
/** Cuántas fuentes abiertas se guardan como mucho (los ids son como los de los hechos). */
export const MAX_OPENED = 2000;
/** Los nombres de mundo se escriben a mano: sin caracteres de control (U+0000–U+001F y U+007F). */
export function isControlChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 0x20 || code === 0x7f;
}
/** Lo más largo que puede ser el nombre de un mundo (en letras). */
export const MAX_WORLD_NAME = 24;
export const MAX_WORLDS = 32;
/** Los finales que cuentan como vistos (la boca equivocada no es un final). */
export const SEEN_ENDINGS = ['A', 'B'] as const;
export type SeenEnding = (typeof SEEN_ENDINGS)[number];

export interface SaveData {
  version: typeof SAVE_VERSION;
  loopsCompleted: number;
  facts: readonly string[];
  /** Ya se cruzó el gusano: la partida empieza en Umbral, no en casa. */
  prologueDone: boolean;
  /** Los finales que ya se han visto. */
  endings: readonly SeenEnding[];
  /** Los mundos que el jugador ya nombró (su bitácora): el nombre y el ciclo en que lo encontró. */
  worlds: Readonly<Record<string, NamedWorld>>;
  /** Las tareas del bucle ya hechas (game/tasks.ts decide cuáles existen). */
  tasks: readonly string[];
  /** Las fuentes abiertas alguna vez (lo que queda por leer en cada mundo). */
  opened: readonly string[];
}

export interface NamedWorld {
  name: string;
  loop: number;
}

/** Lo mínimo de `Storage` que se usa (permite almacenamiento falso en los tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  data: SaveData;
  warning?: string;
  /** El guardado es de una versión más nueva del juego: no se debe sobrescribir. */
  readOnly: boolean;
}

export function freshSave(): SaveData {
  return {
    version: SAVE_VERSION,
    loopsCompleted: 0,
    facts: [],
    prologueDone: false,
    endings: [],
    worlds: {},
    tasks: [],
    opened: [],
  };
}

/** `localStorage` si el navegador lo permite (puede lanzar en iframes o con cookies bloqueadas). */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Versión 1 (antes del prólogo): esas partidas empezaban ya en Umbral, así que lo dan por hecho. */
function prologueOf(version: unknown, prologueDone: unknown): boolean | null {
  if (version === 1) return true;
  if (
    (version !== 2 && version !== 3 && version !== 4 && version !== SAVE_VERSION) ||
    typeof prologueDone !== 'boolean'
  )
    return null;
  return prologueDone;
}

function isSeenEnding(value: unknown): value is SeenEnding {
  return (SEEN_ENDINGS as readonly unknown[]).includes(value);
}

/** Versiones 1 y 2 (antes de los finales): ninguno visto. */
function endingsOf(version: unknown, endings: unknown): SeenEnding[] | null {
  if (version !== 3 && version !== 4 && version !== SAVE_VERSION) return [];
  if (!Array.isArray(endings) || !endings.every(isSeenEnding)) return null;
  return [...new Set(endings)];
}

function isNamedWorld(value: unknown): value is NamedWorld {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { name, loop } = value as Record<string, unknown>;
  if (typeof name !== 'string' || Array.from(name).some(isControlChar)) return false;
  const letters = Array.from(name).length;
  if (letters < 1 || letters > MAX_WORLD_NAME) return false;
  return Number.isInteger(loop) && (loop as number) >= 0 && (loop as number) <= MAX_LOOPS;
}

/** Versiones 1 a 3 (antes de la bitácora): ningún mundo nombrado. */
function worldsOf(version: unknown, worlds: unknown): Record<string, NamedWorld> | null {
  if (version !== 4 && version !== SAVE_VERSION) return {};
  if (typeof worlds !== 'object' || worlds === null || Array.isArray(worlds)) return null;
  const entries = Object.entries(worlds);
  if (entries.length > MAX_WORLDS) return null;
  const valid: Record<string, NamedWorld> = {};
  for (const [id, world] of entries) {
    if (!WORLD_ID.test(id) || !isNamedWorld(world)) return null;
    valid[id] = { name: world.name, loop: world.loop };
  }
  return valid;
}

/** Versiones 1 a 4 (antes de las tareas del bucle): ninguna hecha. */
function tasksOf(version: unknown, tasks: unknown): string[] | null {
  if (version !== SAVE_VERSION) return [];
  if (!Array.isArray(tasks) || tasks.length > MAX_TASKS) return null;
  if (!tasks.every((id): id is string => typeof id === 'string' && TASK_ID.test(id))) return null;
  return [...new Set(tasks)];
}

/** Antes de la versión 5, o una 5 de antes del hito C: nada abierto. */
function openedOf(version: unknown, opened: unknown): string[] | null {
  if (version !== SAVE_VERSION || opened === undefined) return [];
  if (!Array.isArray(opened) || opened.length > MAX_OPENED) return null;
  if (!opened.every((id): id is string => typeof id === 'string' && FACT_ID.test(id))) return null;
  return [...new Set(opened)];
}

function validate(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { version, loopsCompleted, facts, prologueDone, endings, worlds, tasks, opened } =
    raw as Record<string, unknown>;
  const prologue = prologueOf(version, prologueDone);
  const seen = endingsOf(version, endings);
  const named = worldsOf(version, worlds);
  const done = tasksOf(version, tasks);
  const read = openedOf(version, opened);
  if (prologue === null || seen === null || named === null || done === null || read === null)
    return null;
  if (!Number.isInteger(loopsCompleted)) return null;
  const loops = loopsCompleted as number;
  if (loops < 0 || loops > MAX_LOOPS) return null;
  if (!Array.isArray(facts) || facts.length > MAX_FACTS) return null;
  if (!facts.every((f): f is string => typeof f === 'string' && FACT_ID.test(f))) return null;
  return {
    version: SAVE_VERSION,
    loopsCompleted: loops,
    facts: [...new Set(facts)],
    prologueDone: prologue,
    endings: seen,
    worlds: named,
    tasks: done,
    opened: read,
  };
}

function fresh(warning?: string, readOnly = false): LoadResult {
  return warning === undefined
    ? { data: freshSave(), readOnly }
    : { data: freshSave(), warning, readOnly };
}

function isNewerVersion(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const { version } = raw as Record<string, unknown>;
  return typeof version === 'number' && Number.isInteger(version) && version > SAVE_VERSION;
}

export function loadSave(store: KeyValueStore | null): LoadResult {
  if (!store) return fresh('Almacenamiento no disponible: se juega sin guardar.');
  let text: string | null;
  try {
    text = store.getItem(SAVE_KEY);
  } catch (error) {
    return fresh(`No se pudo leer el guardado: ${String(error)}`);
  }
  if (text === null) return fresh();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fresh('El guardado estaba dañado; se empieza de cero.');
  }
  if (isNewerVersion(parsed)) {
    // Abrir una versión antigua del juego no debe destruir la partida de una más nueva.
    return fresh('El guardado es de una versión más nueva del juego: se juega sin guardar.', true);
  }
  const data = validate(parsed);
  return data ? { data, readOnly: false } : fresh('El guardado no es válido; se empieza de cero.');
}

/** Guarda; devuelve false (sin lanzar) si no se pudo. */
export function writeSave(store: KeyValueStore | null, data: SaveData): boolean {
  if (!store) return false;
  try {
    const loopsCompleted = Math.min(MAX_LOOPS, Math.max(0, Math.floor(data.loopsCompleted)));
    store.setItem(SAVE_KEY, JSON.stringify({ ...data, loopsCompleted, facts: [...data.facts] }));
    return true;
  } catch {
    return false;
  }
}

/** Borra la partida; devuelve false si el almacenamiento no lo permitió. */
export function clearSave(store: KeyValueStore | null): boolean {
  if (!store) return true; // sin almacenamiento no hay nada guardado
  try {
    store.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda el progreso fusionándolo con lo que ya hay guardado: unión de hechos y de mundos nombrados, el mayor
 * número de ciclos y el prólogo hecho si lo estaba en cualquiera de los dos. Así dos pestañas abiertas a la vez no se pisan, y el director del ciclo (que solo conoce los
 * ciclos) no borra los hechos que escribió la lectura. Una partida de una versión más nueva no se toca.
 */
export function saveProgress(store: KeyValueStore | null, data: SaveData): boolean {
  if (!store) return false;
  const stored = loadSave(store);
  if (stored.readOnly) return false;
  // Los hechos nuevos van primero: si lo guardado estuviera lleno (de ids desconocidos), recortar
  // el final sacrifica lo viejo y no el progreso de ahora.
  const facts = [...new Set([...data.facts, ...stored.data.facts])].slice(0, MAX_FACTS);
  const loopsCompleted = Math.max(stored.data.loopsCompleted, data.loopsCompleted);
  const prologueDone = data.prologueDone || stored.data.prologueDone;
  const endings = [...new Set([...stored.data.endings, ...data.endings])];
  const worlds = { ...stored.data.worlds, ...data.worlds };
  const tasks = [...new Set([...stored.data.tasks, ...data.tasks])].slice(0, MAX_TASKS);
  const opened = [...new Set([...data.opened, ...stored.data.opened])].slice(0, MAX_OPENED);
  return writeSave(store, {
    ...data,
    loopsCompleted,
    facts,
    prologueDone,
    endings,
    worlds,
    tasks,
    opened,
  });
}

/**
 * Al cruzar el gusano: guarda que el prólogo está hecho, con lo demás que ya había. Devuelve false si no se pudo
 * (sin almacenamiento, o una partida de una versión más nueva que no se toca).
 */
export function markPrologueDone(
  store: KeyValueStore | null,
  loaded: LoadResult,
  loopsCompleted: number,
): boolean {
  if (loaded.readOnly) return false;
  return saveProgress(store, { ...loaded.data, loopsCompleted, prologueDone: true });
}

/** Al ver un final: lo guarda como visto, con lo demás que ya había. false si no se pudo. */
export function markEndingSeen(
  store: KeyValueStore | null,
  loaded: LoadResult,
  ending: SeenEnding,
): boolean {
  if (loaded.readOnly) return false;
  return saveProgress(store, { ...loaded.data, endings: [ending] });
}

/** Al nombrar un mundo nuevo: lo pega en la bitácora guardada, con lo demás que ya había. false si no se pudo. */
export function markWorldNamed(
  store: KeyValueStore | null,
  loaded: LoadResult,
  world: string,
  name: string,
  loop: number,
): boolean {
  if (loaded.readOnly) return false;
  return saveProgress(store, { ...loaded.data, worlds: { [world]: { name, loop } } });
}

/** Al hacer tareas del bucle: las apunta en lo guardado, con lo demás que ya había. false si no se pudo. */
export function markTasksDone(
  store: KeyValueStore | null,
  loaded: LoadResult,
  tasks: readonly string[],
): boolean {
  if (loaded.readOnly) return false;
  return saveProgress(store, { ...loaded.data, tasks });
}

/** Al abrir fuentes nuevas: las apunta en lo guardado, con lo demás que ya había. false si no se pudo. */
export function markSourcesOpened(
  store: KeyValueStore | null,
  loaded: LoadResult,
  opened: readonly string[],
): boolean {
  if (loaded.readOnly) return false;
  return saveProgress(store, { ...loaded.data, opened });
}

/**
 * ¿Otra pestaña ha borrado la partida? (evento `storage`). Hay que recargar: si no, esta pestaña
 * volvería a escribir lo que tiene en memoria y "Empezar de cero" no serviría de nada.
 */
export function isSaveErased(event: { key: string | null; newValue: string | null }): boolean {
  return (event.key === null || event.key === SAVE_KEY) && event.newValue === null;
}
