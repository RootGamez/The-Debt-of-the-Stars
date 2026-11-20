// Graba las tomas del tráiler (`trailer/tomas.json`) fotograma a fotograma y las une con ffmpeg.
//
//   node scripts/grabar-trailer.ts [id …] [--fps 60] [--size 1920x1080] [--url http://localhost:5180]
//                                  [--headed] [--keep] [--sufijo -v]
//
// Necesita el juego servido (`npm run dev -- --port 5180`) y ffmpeg en el PATH. Sale en `trailer/salida/<id>.mp4`.
// Con `--keep` se quedan los PNG de cada fotograma en `trailer/salida/<id>/`. Con `--vistas` no se graba el vídeo:
// solo el primer fotograma, el del medio y el último, juntos en `trailer/salida/<id>-vista.jpg` (para revisar planos).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';
import { frameCount } from '../src/trailer/cameraPath.ts';
import { ffmpegArgs, parseShots, shotUrl, type RecordedShot } from '../src/trailer/shotList.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_FILE = join(ROOT, 'trailer', 'tomas.json');
const OUT_DIR = join(ROOT, 'trailer', 'salida');
const LOAD_TIMEOUT = 300_000;

interface Options {
  ids: string[];
  fps: number;
  width: number;
  height: number;
  url: string;
  headed: boolean;
  keep: boolean;
  stills: boolean;
  /** Se añade al nombre de salida (p. ej. `-v` para las tomas verticales). */
  suffix: string;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    ids: [],
    fps: 60,
    width: 1920,
    height: 1080,
    url: 'http://localhost:5180/',
    headed: false,
    keep: false,
    stills: false,
    suffix: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const next = (): string => {
      i += 1;
      const value = argv[i];
      if (value === undefined) throw new Error(`Falta el valor de ${arg}`);
      return value;
    };
    if (arg === '--fps') options.fps = Number(next());
    else if (arg === '--size') {
      const [w, h] = next().split('x').map(Number);
      options.width = w ?? options.width;
      options.height = h ?? options.height;
    } else if (arg === '--url') options.url = next();
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--vistas') options.stills = true;
    else if (arg === '--sufijo') options.suffix = next();
    else if (arg.startsWith('--')) throw new Error(`Opción desconocida: ${arg}`);
    else options.ids.push(arg);
  }
  if (!(options.fps > 0 && options.fps <= 120)) throw new Error('--fps debe estar entre 1 y 120');
  if (!/^[a-z0-9-]*$/.test(options.suffix))
    throw new Error('--sufijo solo admite letras, números y guiones');
  if (!(options.width > 0 && options.height > 0))
    throw new Error('--size no válido (p. ej. 1920x1080)');
  return options;
}

/** Abre el juego, empieza a jugar, prepara la escena y deja la toma lista en su primer fotograma. */
async function prepare(page: Page, shot: RecordedShot, options: Options): Promise<void> {
  await page.goto(shotUrl(options.url, shot));
  await page.waitForFunction(() => window.__juego?.trailer !== undefined, null, {
    timeout: LOAD_TIMEOUT,
  });
  await page.locator('.overlay').click({ position: { x: 20, y: 20 } });
  await page.waitForFunction(() => window.__juego?.snapshot()?.playing === true, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    window.__juego?.trailer?.pauseLoop();
  });
  for (const step of shot.setup ?? []) {
    const ok = await page.evaluate(
      ({ call, args, settle, fps }) => {
        const api = window.__juego as unknown as Record<string, unknown> | undefined;
        const fn = api?.[call];
        if (typeof fn !== 'function') return `no existe __juego.${call}`;
        (fn as (...a: unknown[]) => unknown)(...(args ?? []));
        window.__juego?.trailer?.step(settle ?? 30, 1 / fps);
        return true;
      },
      { ...step, fps: options.fps },
    );
    if (ok !== true) throw new Error(`${shot.id}: ${ok}`);
  }
  const { hour } = shot;
  await page.evaluate(
    ({ hour: at, world, keys, fps }) => {
      const juego = window.__juego;
      if (at !== undefined) juego?.skipTo?.(at);
      // Unos fotogramas para que el salto de hora y la escena se asienten antes de grabar.
      juego?.trailer?.step(10, 1 / fps);
      juego?.trailer?.play({ world, keys });
    },
    { hour, world: shot.world ?? shot.start, keys: shot.keys, fps: options.fps },
  );
}

/** El primer fotograma, el del medio y el último, en una sola imagen. */
async function stills(page: Page, shot: RecordedShot, options: Options, frames: string) {
  const total = frameCount(shot.seconds, options.fps);
  const picks = [0, Math.floor(total / 2), total - 1];
  let done = 0;
  const inputs: string[] = [];
  for (const [n, pick] of picks.entries()) {
    const url = await page.evaluate(
      ({ steps, fps }) => {
        const trailer = window.__juego?.trailer;
        trailer?.step(steps, 1 / fps);
        return trailer?.capture('image/png') ?? '';
      },
      { steps: pick - done + 1, fps: options.fps },
    );
    done = pick + 1;
    const file = join(frames, `${String(n)}.png`);
    writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    inputs.push('-i', file);
  }
  const out = join(OUT_DIR, `${shot.id}${options.suffix}-vista.jpg`);
  const args = ['-v', 'error', '-y', ...inputs, '-filter_complex', 'hstack=3,scale=1920:-1', out];
  if (spawnSync('ffmpeg', args, { stdio: 'inherit' }).status !== 0) {
    throw new Error(`${shot.id}: ffmpeg falló al juntar la vista`);
  }
  rmSync(frames, { recursive: true, force: true });
  return out;
}

async function record(page: Page, shot: RecordedShot, options: Options): Promise<string> {
  const frames = join(OUT_DIR, `${shot.id}${options.suffix}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  await prepare(page, shot, options);
  if (options.stills) return stills(page, shot, options, frames);
  const total = frameCount(shot.seconds, options.fps);
  for (let i = 0; i < total; i += 1) {
    const url = await page.evaluate((fps) => {
      const trailer = window.__juego?.trailer;
      trailer?.step(1, 1 / fps);
      return trailer?.capture('image/png') ?? '';
    }, options.fps);
    const base64 = url.slice(url.indexOf(',') + 1);
    if (base64 === '') throw new Error(`${shot.id}: el fotograma ${String(i)} salió vacío`);
    writeFileSync(join(frames, `${String(i).padStart(5, '0')}.png`), Buffer.from(base64, 'base64'));
    if (i % options.fps === 0)
      process.stdout.write(`\r  ${shot.id}: ${String(i)}/${String(total)}`);
  }
  process.stdout.write(`\r  ${shot.id}: ${String(total)}/${String(total)} fotogramas\n`);
  const out = join(OUT_DIR, `${shot.id}${options.suffix}.mp4`);
  const ffmpeg = spawnSync('ffmpeg', ffmpegArgs(frames, options.fps, out), { stdio: 'inherit' });
  if (ffmpeg.status !== 0) throw new Error(`${shot.id}: ffmpeg falló (${String(ffmpeg.status)})`);
  if (!options.keep) rmSync(frames, { recursive: true, force: true });
  return out;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const all = parseShots(JSON.parse(readFileSync(SHOTS_FILE, 'utf8')));
  const shots = options.ids.length === 0 ? all : all.filter((s) => options.ids.includes(s.id));
  const missing = options.ids.filter((id) => !all.some((s) => s.id === id));
  if (missing.length > 0) throw new Error(`No existen las tomas: ${missing.join(', ')}`);
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: !options.headed,
    // La GPU real: sin esto Chromium sin ventana dibuja por software (lento y con otra calidad).
    args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'],
  });
  try {
    for (const shot of shots) {
      const page = await browser.newPage({
        viewport: { width: options.width, height: options.height },
        deviceScaleFactor: 1,
        locale: 'es-ES',
      });
      page.on('pageerror', (error) => {
        console.error(`  [${shot.id}] error en la página: ${error.message}`);
      });
      process.stdout.write(
        `Toma ${shot.id} (${String(shot.seconds)} s a ${String(options.fps)} fps)\n`,
      );
      process.stdout.write(`  → ${await record(page, shot, options)}\n`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
