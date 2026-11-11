// Genera sonidos con ElevenLabs (efectos de texto a sonido) según `audio-src/generate-manifest.json`, con un libro de
// cuentas (`audio-src/ledger.json`) que se detiene solo al llegar al presupuesto. Lo ya generado no se vuelve a
// pagar: cada archivo en bruto queda en `audio-src/generated/` y de ahí se procesan los de `public/audio/`.
//
// La clave se lee de `web/.env.local` (variable `eleven-labs-api-key` o `ELEVENLABS_API_KEY`) y nunca se imprime.
//
// Uso (desde web/):
//   node scripts/audio/generate.ts --dry                       solo muestra el plan y su coste estimado
//   node scripts/audio/generate.ts --only loop.reset --limit 1 --max 150
//   node scripts/audio/generate.ts --max 1800                  genera lo que falte con ese tope para esta tanda
//   node scripts/audio/generate.ts --process-only              no llama a la API: solo reprocesa lo que hay
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_CREDITS_PER_SECOND,
  budgetLeft,
  mergeIndex,
  planJobs,
  recordSpend,
  type GenerateManifest,
  type IndexEntry,
  type Ledger,
  type SoundIndex,
} from './generatePlan.ts';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(webRoot, 'audio-src');
const RAW_DIR = join(SRC_DIR, 'generated');
const OUT_DIR = join(webRoot, 'public', 'audio');
const MANIFEST_FILE = join(SRC_DIR, 'generate-manifest.json');
const LEDGER_FILE = join(SRC_DIR, 'ledger.json');
const API = 'https://api.elevenlabs.io/v1';
const DEFAULT_BUDGET = 15000;
const DEFAULT_BATCH_CAP = 2000;
const MP3_BITRATE = '96k';
const MUSIC_BITRATE = '128k';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}
const flag = (name: string): boolean => process.argv.includes(name);

/** La clave de ElevenLabs, de `web/.env.local` o del entorno. Nunca se imprime. */
function readKey(): string {
  const fromEnv = process.env['ELEVENLABS_API_KEY'];
  if (fromEnv) return fromEnv;
  const file = join(webRoot, '.env.local');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^\s*(eleven-labs-api-key|ELEVENLABS_API_KEY)\s*=\s*(.*)$/.exec(line);
      const value = match?.[2]?.trim().replace(/^['"]|['"]$/g, '');
      if (value) return value;
    }
  }
  throw new Error('No encuentro la clave de ElevenLabs (eleven-labs-api-key en web/.env.local).');
}

function loadLedger(): Ledger {
  if (!existsSync(LEDGER_FILE)) return { budget: DEFAULT_BUDGET, spent: 0, entries: [] };
  return JSON.parse(readFileSync(LEDGER_FILE, 'utf8')) as Ledger;
}

function saveLedger(ledger: Ledger): void {
  writeFileSync(LEDGER_FILE, `${JSON.stringify(ledger, null, 2)}\n`);
}

/** Créditos usados hasta ahora en la cuenta (gratis de consultar); sirve para medir lo que cuesta cada llamada. */
async function creditsUsed(key: string): Promise<number | undefined> {
  const response = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': key } });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { character_count?: number };
  return body.character_count;
}

async function generateOne(
  key: string,
  model: string,
  job: {
    kind: 'sfx' | 'music';
    prompt: string;
    duration: number;
    loop: boolean;
    promptInfluence: number | undefined;
  },
): Promise<Buffer> {
  const music = job.kind === 'music';
  const response = await fetch(
    `${API}/${music ? 'music' : 'sound-generation'}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(
        music
          ? {
              prompt: job.prompt,
              music_length_ms: Math.round(job.duration * 1000),
              force_instrumental: true,
            }
          : {
              text: job.prompt,
              duration_seconds: job.duration,
              loop: job.loop,
              model_id: model,
              ...(job.promptInfluence === undefined
                ? {}
                : { prompt_influence: job.promptInfluence }),
            },
      ),
    },
  );
  if (!response.ok) {
    throw new Error(
      `ElevenLabs respondió ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Pasa los archivos en bruto a `public/audio/` (mono, mp3) y mezcla sus sonidos en el índice. */
function processRaw(manifest: GenerateManifest): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const produced: Record<string, IndexEntry> = {};
  for (const [id, spec] of Object.entries(manifest.sounds)) {
    const files: string[] = [];
    for (let variant = 1; variant <= spec.variants; variant++) {
      const name = `${id.replace(/[^a-zA-Z0-9]+/g, '_')}_${variant}.mp3`;
      const input = join(RAW_DIR, name);
      if (!existsSync(input) || statSync(input).size === 0) continue;
      // La música se queda en estéreo; los efectos pasan a mono.
      const args = [
        '-y',
        '-v',
        'error',
        '-i',
        input,
        '-ac',
        spec.kind === 'music' ? '2' : '1',
        '-ar',
        '44100',
      ];
      if (spec.lowpass !== undefined) args.push('-af', `lowpass=f=${spec.lowpass}`);
      args.push('-b:a', spec.kind === 'music' ? MUSIC_BITRATE : MP3_BITRATE, join(OUT_DIR, name));
      const run = spawnSync('ffmpeg', args, { encoding: 'utf8' });
      if (run.status !== 0) throw new Error(`ffmpeg falló con ${name}: ${run.stderr}`);
      files.push(name);
    }
    if (files.length > 0) {
      produced[id] = {
        files,
        category: spec.category,
        gain: spec.gain ?? 1,
        loop: spec.loop ?? false,
      };
    }
  }
  const indexFile = join(OUT_DIR, 'index.json');
  const existing = existsSync(indexFile)
    ? (JSON.parse(readFileSync(indexFile, 'utf8')) as SoundIndex)
    : undefined;
  const merged = mergeIndex(existing, Object.keys(manifest.sounds), produced);
  writeFileSync(indexFile, `${JSON.stringify(merged, null, 2)}\n`);
  process.stdout.write(`Procesados ${Object.keys(produced).length} sonidos generados.\n`);
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as GenerateManifest;
  mkdirSync(RAW_DIR, { recursive: true });
  if (flag('--process-only')) {
    processRaw(manifest);
    return;
  }

  let ledger = loadLedger();
  const rate = ledger.creditsPerSecond ?? DEFAULT_CREDITS_PER_SECOND;
  const have = new Set(readdirSync(RAW_DIR));
  const only = argument('--only')?.split(',');
  const limitText = argument('--limit');
  const { jobs, estimate } = planJobs(manifest, have, rate, {
    ...(only ? { only } : {}),
    ...(limitText ? { limit: Number(limitText) } : {}),
  });
  const batchCap = Number(argument('--max') ?? DEFAULT_BATCH_CAP);

  process.stdout.write(
    `Plan: ${jobs.length} generaciones, ~${estimate} créditos (a ${rate} por segundo). ` +
      `Gastado ${ledger.spent} de ${ledger.budget}; tope de esta tanda ${batchCap}.\n`,
  );
  for (const job of jobs)
    process.stdout.write(`  ${job.file}  ${job.duration}s  ~${job.credits}\n`);
  if (flag('--dry') || jobs.length === 0) return;

  const key = readKey();
  let batch = 0;
  for (const job of jobs) {
    if (job.credits > budgetLeft(ledger) || batch + job.credits > batchCap) {
      process.stdout.write(`Me detengo: ${job.file} (~${job.credits}) pasaría del tope.\n`);
      break;
    }
    const before = await creditsUsed(key);
    const audio = await generateOne(key, manifest.model, job);
    writeFileSync(join(RAW_DIR, job.file), audio);
    const after = await creditsUsed(key);
    // Si el contador de la cuenta no se mueve (se actualiza con retraso o no cuenta efectos), se apunta la
    // estimación: el tope sigue protegiendo aunque no se pueda medir.
    const measured = before !== undefined && after !== undefined ? after - before : 0;
    const real = measured > 0 ? measured : job.credits;
    ledger = recordSpend(ledger, {
      id: job.id,
      file: job.file,
      credits: real,
      at: new Date().toISOString(),
    });
    if (measured > 0) ledger = { ...ledger, creditsPerSecond: measured / job.duration };
    saveLedger(ledger);
    batch += real;
    process.stdout.write(
      `OK ${job.file}: ${measured > 0 ? `${real} créditos medidos` : `~${real} créditos (estimación: el contador de la cuenta tarda en reflejarlos)`}; apuntado ${ledger.spent}/${ledger.budget}
`,
    );
  }
  processRaw(manifest);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
