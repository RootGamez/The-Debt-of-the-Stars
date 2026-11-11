// El banco de samples: lee el índice de `public/audio/index.json` y descarga y decodifica los sonidos que se
// piden, solo cuando se piden (cada mundo carga los suyos). Si falta el índice o un archivo, el banco no falla:
// ese sonido simplemente no existe y el juego sigue con el sintético. Los índices los escribe
// `scripts/audio/generate.ts` (efectos generados o importados de stock); aquí solo se validan.

export interface SoundEntry {
  /** Variantes del sonido (nombres de archivo dentro de la carpeta de audio); suena una u otra. */
  files: string[];
  /** Categoría para limitar voces simultáneas (`foley`, `ship`, `cosmos`, `ui`…). */
  category: string;
  /** Ganancia propia del sonido (nivelar unos con otros sin tocar el código). */
  gain: number;
  loop: boolean;
}

export interface SoundIndex {
  version: 1;
  sounds: Record<string, SoundEntry>;
}

export interface SampleBank {
  /** Lee el índice; no lanza nunca (sin índice, el banco queda vacío). */
  init(): Promise<void>;
  entry(id: string): SoundEntry | undefined;
  /** Todos los sonidos del índice. */
  ids(): string[];
  /** Las variantes ya decodificadas, o `undefined` si el sonido no está cargado. */
  buffers(id: string): AudioBuffer[] | undefined;
  loaded(id: string): boolean;
  /** Descarga y decodifica esos sonidos si aún no están; no lanza nunca. */
  load(ids: readonly string[]): Promise<void>;
  /** Archivos que no se pudieron descargar o decodificar (no se reintentan). */
  readonly failures: readonly string[];
}

export interface SampleBankOptions {
  /** Carpeta de los archivos, con barra final (`/audio/`). */
  baseUrl: string;
  fetchFn?: typeof fetch;
  decode: (data: ArrayBuffer) => Promise<AudioBuffer>;
}

const EMPTY_INDEX: SoundIndex = { version: 1, sounds: {} };
const MAX_GAIN = 4;

/** Un nombre de archivo vale si se queda dentro de la carpeta de audio (nada de rutas ni URL). */
function isSafeFileName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    !name.includes('..') &&
    !name.includes('://') &&
    !name.startsWith('/') &&
    !name.startsWith('\\')
  );
}

function parseEntry(raw: unknown): SoundEntry | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const { files, category, gain, loop } = raw as Record<string, unknown>;
  if (!Array.isArray(files) || files.length === 0 || !files.every(isSafeFileName)) return undefined;
  const wanted = typeof gain === 'number' && Number.isFinite(gain) ? gain : 1;
  return {
    files: [...files],
    category: typeof category === 'string' && category ? category : 'default',
    gain: Math.min(MAX_GAIN, Math.max(0, wanted)),
    loop: loop === true,
  };
}

/** Valida un índice leído de fuera: lo que no se entiende se descarta. */
export function parseIndex(raw: unknown): SoundIndex {
  if (typeof raw !== 'object' || raw === null) return { ...EMPTY_INDEX, sounds: {} };
  const { sounds } = raw as Record<string, unknown>;
  if (typeof sounds !== 'object' || sounds === null || Array.isArray(sounds)) {
    return { ...EMPTY_INDEX, sounds: {} };
  }
  const valid: Record<string, SoundEntry> = {};
  for (const [id, value] of Object.entries(sounds)) {
    const entry = parseEntry(value);
    if (entry) valid[id] = entry;
  }
  return { version: 1, sounds: valid };
}

export function createSampleBank(options: SampleBankOptions): SampleBank {
  const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  let index: SoundIndex = { ...EMPTY_INDEX, sounds: {} };
  let starting: Promise<void> | undefined;
  /** Archivo → lo que se está descargando (o ya terminó); así nunca se pide dos veces. */
  const pending = new Map<string, Promise<void>>();
  const decoded = new Map<string, AudioBuffer>();
  const failed: string[] = [];

  async function readIndex(): Promise<void> {
    try {
      const response = await fetchFn(`${options.baseUrl}index.json`);
      if (response.ok) index = parseIndex(await response.json());
    } catch {
      // sin índice: el banco queda vacío y suena el sintético
    }
  }

  async function fetchFile(file: string): Promise<void> {
    try {
      const response = await fetchFn(`${options.baseUrl}${file}`);
      if (!response.ok) throw new Error(String(response.status));
      decoded.set(file, await options.decode(await response.arrayBuffer()));
    } catch {
      failed.push(file);
    }
  }

  function fileOnce(file: string): Promise<void> {
    let job = pending.get(file);
    if (!job) {
      job = fetchFile(file);
      pending.set(file, job);
    }
    return job;
  }

  function buffers(id: string): AudioBuffer[] | undefined {
    const files = index.sounds[id]?.files;
    if (!files) return undefined;
    const ready = files.flatMap((file) => {
      const buffer = decoded.get(file);
      return buffer ? [buffer] : [];
    });
    return ready.length > 0 ? ready : undefined;
  }

  return {
    init() {
      starting ??= readIndex();
      return starting;
    },
    entry: (id) => index.sounds[id],
    ids: () => Object.keys(index.sounds),
    buffers,
    loaded: (id) => buffers(id) !== undefined,
    async load(ids) {
      const files = ids.flatMap((id) => index.sounds[id]?.files ?? []);
      await Promise.all(files.map(fileOnce));
    },
    get failures() {
      return failed;
    },
  };
}
