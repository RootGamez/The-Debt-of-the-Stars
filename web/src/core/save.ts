// Guardado entre ciclos. Lo único que persiste es el conocimiento (CONTEXTO_HISTORIA.md §8): el número de
// ciclos, la lista de hechos descubiertos (Fase 4) y si ya se jugó el prólogo en casa (Fase 9, versión 2).
// Lo leído de localStorage se trata como dato externo: se valida y, si está dañado o manipulado,
// se descarta y se empieza de cero con un aviso. Sin almacenamiento (modo privado) se juega igual.

export const SAVE_KEY = 'bucle-tiempo:partida';
export const SAVE_VERSION = 2;
export const MAX_LOOPS = 1_000_000;
export const MAX_FACTS = 5000;
/** Ids de hechos: "mundo.nombre" con letras, números, guiones y puntos. */
const FACT_ID = /^[a-z0-9_.-]{1,64}$/i;

export interface SaveData {
  version: typeof SAVE_VERSION;
  loopsCompleted: number;
  facts: readonly string[];
  /** Ya se cruzó el gusano: la partida empieza en Umbral, no en casa. */
  prologueDone: boolean;
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
  return { version: SAVE_VERSION, loopsCompleted: 0, facts: [], prologueDone: false };
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
  if (version !== SAVE_VERSION || typeof prologueDone !== 'boolean') return null;
  return prologueDone;
}

function validate(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { version, loopsCompleted, facts, prologueDone } = raw as Record<string, unknown>;
  const prologue = prologueOf(version, prologueDone);
  if (prologue === null) return null;
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
 * Guarda el progreso fusionándolo con lo que ya hay guardado: unión de hechos, el mayor número de ciclos y
 * el prólogo hecho si lo estaba en cualquiera de los dos. Así dos pestañas abiertas a la vez no se pisan, y el director del ciclo (que solo conoce los
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
  return writeSave(store, { ...data, loopsCompleted, facts, prologueDone });
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

/**
 * ¿Otra pestaña ha borrado la partida? (evento `storage`). Hay que recargar: si no, esta pestaña
 * volvería a escribir lo que tiene en memoria y "Empezar de cero" no serviría de nada.
 */
export function isSaveErased(event: { key: string | null; newValue: string | null }): boolean {
  return (event.key === null || event.key === SAVE_KEY) && event.newValue === null;
}
