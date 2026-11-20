// Las tomas del tráiler como datos (`web/trailer/tomas.json`): qué mundo se carga, a qué hora del ciclo se salta,
// qué se prepara antes (llamadas a `window.__juego`) y la ruta de la cámara. Lo lee el grabador
// (`scripts/grabar-trailer.ts`). Aquí solo hay lógica pura: validar, la URL de cada toma y los argumentos de ffmpeg.
import { validatePath, type CameraKey } from './cameraPath.ts';

/** Una llamada a `window.__juego` antes de grabar, p. ej. `{ "call": "teleportTo", "args": ["umbral.mirador"] }`. */
export interface SetupCall {
  call: string;
  args?: readonly unknown[];
  /** Fotogramas que se dejan correr después (para que la escena se asiente). */
  settle?: number;
}

export interface RecordedShot {
  /** Nombre del archivo de salida (letras, números, guiones). */
  id: string;
  /** El mundo donde empieza la partida (`?mundo=`). */
  start: string;
  /** El mundo al que va pegada la cámara (si falta, `start`). */
  world?: string;
  /** Segundo del ciclo al que se salta antes de grabar. */
  hour?: number;
  /** Cuántos segundos dura la toma. */
  seconds: number;
  setup?: readonly SetupCall[];
  keys: readonly CameraKey[];
}

const ID = /^[a-z0-9-]+$/;
const CALL = /^[a-zA-Z]+$/;

function fail(index: number, message: string): never {
  throw new Error(`Toma ${String(index)}: ${message}`);
}

function checkShot(raw: unknown, index: number): RecordedShot {
  if (typeof raw !== 'object' || raw === null) fail(index, 'no es un objeto');
  const shot = raw as Partial<RecordedShot>;
  if (typeof shot.id !== 'string' || !ID.test(shot.id)) fail(index, 'id no válido');
  if (typeof shot.start !== 'string' || shot.start === '') fail(index, 'falta el mundo de inicio');
  if (shot.world !== undefined && typeof shot.world !== 'string') fail(index, 'world no válido');
  if (typeof shot.seconds !== 'number' || !(shot.seconds > 0) || shot.seconds > 120) {
    fail(index, 'seconds debe estar entre 0 y 120');
  }
  if (shot.hour !== undefined && (typeof shot.hour !== 'number' || shot.hour < 0)) {
    fail(index, 'hour no válida');
  }
  for (const step of shot.setup ?? []) {
    if (typeof step.call !== 'string' || !CALL.test(step.call)) fail(index, 'setup.call no válido');
  }
  if (!Array.isArray(shot.keys)) fail(index, 'faltan los fotogramas clave');
  try {
    validatePath(shot.keys);
  } catch (error) {
    fail(index, (error as Error).message);
  }
  return shot as RecordedShot;
}

/** Valida la lista de tomas; lanza con la toma y el motivo. Los ids no se repiten. */
export function parseShots(json: unknown): RecordedShot[] {
  if (!Array.isArray(json)) throw new Error('Las tomas deben ser una lista');
  const shots = json.map(checkShot);
  const seen = new Set<string>();
  for (const shot of shots) {
    if (seen.has(shot.id)) throw new Error(`Toma repetida: ${shot.id}`);
    seen.add(shot.id);
  }
  return shots;
}

/** La URL del juego para una toma: depuración, tráiler, calidad alta y el mundo de inicio. */
export function shotUrl(base: string, shot: RecordedShot): string {
  const url = new URL(base);
  url.search = '';
  url.searchParams.set('debug', '');
  url.searchParams.set('trailer', '');
  url.searchParams.set('calidad', 'alta');
  url.searchParams.set('mundo', shot.start);
  return url.toString();
}

/** Los argumentos de ffmpeg para unir `dir/00000.png…` en un mp4 de alta calidad. */
export function ffmpegArgs(dir: string, fps: number, out: string): string[] {
  return [
    '-y',
    '-framerate',
    String(fps),
    '-i',
    `${dir}/%05d.png`,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '14',
    '-pix_fmt',
    'yuv420p',
    out,
  ];
}
