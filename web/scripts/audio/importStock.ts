// Importa sonidos de paquetes libres (Kenney, CC0) a `public/audio/`: lee `audio-src/stock-map.json`, busca los
// archivos en las carpetas de cada paquete, los pasa a mp3 mono con ffmpeg y escribe el `index.json` que lee el
// motor y el registro de créditos (`audio-src/stock-credits.json`).
//
// Uso (desde web/): node scripts/audio/importStock.ts --src <carpeta con impact/ rpg/ interface/ scifi/>
// Cada subcarpeta es un paquete ya descomprimido (los .ogg pueden estar dentro de otra carpeta).
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeIndex, type SoundIndex } from './generatePlan.ts';
import {
  buildCredits,
  buildIndex,
  resolveStockMap,
  type CreditLine,
  type StockMap,
} from './stockMap.ts';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(webRoot, 'public', 'audio');
/** Se escribe aquí y solo al terminar bien se cambia por la carpeta de verdad: un fallo no la deja a medias. */
const TMP_DIR = `${OUT_DIR}.tmp`;
const MAP_FILE = join(webRoot, 'audio-src', 'stock-map.json');
const CREDITS_FILE = join(webRoot, 'audio-src', 'stock-credits.json');
const MP3_BITRATE = '96k';
const TRIM_FADE = 0.06;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

/** Todos los .ogg de una carpeta (a cualquier profundidad): nombre sin extensión → ruta. */
function listOgg(folder: string): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (extname(name).toLowerCase() === '.ogg') {
        const key = basename(name, extname(name));
        if (found.has(key)) throw new Error(`Dos archivos se llaman «${key}» en ${folder}`);
        found.set(key, path);
      }
    }
  };
  walk(folder);
  return found;
}

function convert(
  input: string,
  output: string,
  trim: number | undefined,
  lowpass: number | undefined,
): void {
  const args = ['-y', '-v', 'error', '-i', input, '-ac', '1', '-ar', '44100'];
  const filters: string[] = [];
  if (lowpass !== undefined) filters.push(`lowpass=f=${lowpass}`);
  if (trim !== undefined) {
    args.push('-t', String(trim));
    filters.push(`afade=t=out:st=${Math.max(0, trim - TRIM_FADE)}:d=${TRIM_FADE}`);
  }
  if (filters.length > 0) args.push('-af', filters.join(','));
  args.push('-b:a', MP3_BITRATE, output);
  const run = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`ffmpeg falló con ${input}: ${run.stderr}`);
}

function main(): void {
  const src = argument('--src');
  if (!src) throw new Error('Falta --src <carpeta con los paquetes descomprimidos>');
  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8')) as StockMap;

  const folders: Record<string, Map<string, string>> = {};
  for (const pack of Object.keys(map.packs)) folders[pack] = listOgg(join(resolve(src), pack));
  const available = Object.fromEntries(
    Object.entries(folders).map(([pack, files]) => [pack, [...files.keys()]]),
  );

  const { sounds, problems } = resolveStockMap(map, available);
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`PROBLEMA ${problem}\n`);
    throw new Error('El mapa de stock tiene problemas; no se importa nada.');
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });
  let bytes = 0;
  let count = 0;
  for (const sound of Object.values(sounds)) {
    for (const file of sound.files) {
      const input = folders[file.pack]?.get(file.source);
      if (!input) throw new Error(`No encuentro ${file.pack}:${file.source}`);
      const output = join(TMP_DIR, file.out);
      convert(input, output, sound.trim, sound.lowpass);
      bytes += statSync(output).size;
      count++;
    }
  }
  // Solo se cambia lo que puso el stock: sus archivos de la vez anterior y sus entradas del índice. Lo que
  // generó ElevenLabs (u otro productor) en la misma carpeta se queda como está.
  mkdirSync(OUT_DIR, { recursive: true });
  const previous = existsSync(CREDITS_FILE)
    ? (JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) as CreditLine[])
    : [];
  for (const line of previous) rmSync(join(OUT_DIR, line.file), { force: true });
  for (const name of readdirSync(TMP_DIR)) renameSync(join(TMP_DIR, name), join(OUT_DIR, name));
  rmSync(TMP_DIR, { recursive: true, force: true });
  const indexFile = join(OUT_DIR, 'index.json');
  const existing = existsSync(indexFile)
    ? (JSON.parse(readFileSync(indexFile, 'utf8')) as SoundIndex)
    : undefined;
  const merged = mergeIndex(
    existing,
    [...new Set(previous.map((line) => line.sound))],
    buildIndex(sounds).sounds,
  );
  writeFileSync(
    indexFile,
    `${JSON.stringify(merged, null, 2)}
`,
  );
  writeFileSync(CREDITS_FILE, `${JSON.stringify(buildCredits(sounds, map.packs), null, 2)}\n`);
  process.stdout.write(
    `${Object.keys(sounds).length} sonidos, ${count} archivos, ${(bytes / 1024).toFixed(0)} KB en ${OUT_DIR}\n`,
  );
}

main();
