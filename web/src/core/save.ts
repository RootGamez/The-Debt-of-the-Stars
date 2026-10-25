// Guardado entre ciclos. Lo único que persiste es el conocimiento (CONTEXTO_HISTORIA.md §8): por
// ahora el número de ciclos y la lista de hechos descubiertos (se llena en la Fase 4).
// Lo leído de localStorage se trata como dato externo: se valida y, si está dañado o manipulado,
// se descarta y se empieza de cero con un aviso. Sin almacenamiento (modo privado) se juega igual.

export const SAVE_KEY = 'bucle-tiempo:partida';
export const SAVE_VERSION = 1;
export const MAX_LOOPS = 1_000_000;
export const MAX_FACTS = 5000;
/** Ids de hechos: "mundo.nombre" con letras, números, guiones y puntos. */
const FACT_ID = /^[a-z0-9_.-]{1,64}$/i;

export interface SaveData {
  version: typeof SAVE_VERSION;
  loopsCompleted: number;
  facts: readonly string[];
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
  return { version: SAVE_VERSION, loopsCompleted: 0, facts: [] };
}

/** `localStorage` si el navegador lo permite (puede lanzar en iframes o con cookies bloqueadas). */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function validate(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { version, loopsCompleted, facts } = raw as Record<string, unknown>;
  if (version !== SAVE_VERSION) return null;
  if (!Number.isInteger(loopsCompleted)) return null;
  const loops = loopsCompleted as number;
  if (loops < 0 || loops > MAX_LOOPS) return null;
  if (!Array.isArray(facts) || facts.length > MAX_FACTS) return null;
  if (!facts.every((f): f is string => typeof f === 'string' && FACT_ID.test(f))) return null;
  return { version: SAVE_VERSION, loopsCompleted: loops, facts: [...new Set(facts)] };
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
 * Guarda el progreso fusionándolo con lo que ya hay guardado: unión de hechos y el mayor número de
 * ciclos. Así dos pestañas abiertas a la vez no se pisan, y el director del ciclo (que solo conoce los
 * ciclos) no borra los hechos que escribió la lectura. Una partida de una versión más nueva no se toca.
 */
export function saveProgress(store: KeyValueStore | null, data: SaveData): boolean {
  if (!store) return false;
  const stored = loadSave(store);
  if (stored.readOnly) return false;
  const facts = [...new Set([...stored.data.facts, ...data.facts])].slice(0, MAX_FACTS);
  const loopsCompleted = Math.max(stored.data.loopsCompleted, data.loopsCompleted);
  return writeSave(store, { ...data, loopsCompleted, facts });
}
