// Exporta cada blender/<mundo>.blend a public/models/<mundo>.glb y lo comprime con meshopt.
// Uso: npm run modelos            (todos los .blend)
//      npm run modelos -- umbral  (solo los indicados)
// Blender: variable BLENDER_PATH, la ruta por defecto de Blender 5.2 en Windows o `blender` en el PATH.
// Trabaja en una carpeta temporal: si algo falla, el .glb anterior queda intacto.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLENDER_DIR = resolve(WEB, '..', 'blender');
const OUT_DIR = join(WEB, 'public', 'models');
const EXPORT_SCRIPT = join(BLENDER_DIR, 'scripts', 'exportar_glb.py');
const GLTF_TRANSFORM = join(WEB, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const DEFAULT_BLENDER = 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw new Error(`No se pudo ejecutar ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`Falló: ${command} ${args.join(' ')} (código ${result.status})`);
  }
}

function findBlender() {
  if (process.env.BLENDER_PATH) return process.env.BLENDER_PATH;
  return existsSync(DEFAULT_BLENDER) ? DEFAULT_BLENDER : 'blender';
}

function worldsToExport(requested) {
  const available = readdirSync(BLENDER_DIR)
    .filter((f) => f.endsWith('.blend'))
    .map((f) => f.slice(0, -'.blend'.length));
  if (requested.length === 0) return available;
  const missing = requested.filter((w) => !available.includes(w));
  if (missing.length > 0) {
    throw new Error(`No existe blender/<mundo>.blend para: ${missing.join(', ')}`);
  }
  return requested;
}

function exportWorld(blender, world, workDir) {
  const raw = join(workDir, `${world}.glb`);
  const compressed = join(workDir, `${world}.meshopt.glb`);
  run(blender, [
    '-b',
    join(BLENDER_DIR, `${world}.blend`),
    '--python-exit-code', // Blender en -b sale con 0 aunque el script falle si no se indica
    '1',
    '--python',
    EXPORT_SCRIPT,
    '--',
    world,
    workDir,
  ]);
  if (!existsSync(raw)) throw new Error(`Blender no generó ${raw}`);
  // Solo comprimir: "optimize" aplana la escena y borra los nodos vacíos (las marcas).
  run(process.execPath, [GLTF_TRANSFORM, 'meshopt', raw, compressed]);
  const target = join(OUT_DIR, `${world}.glb`);
  copyFileSync(compressed, target);
  const kb = (file) => (statSync(file).size / 1024).toFixed(0);
  console.log(`${world}.glb: ${kb(raw)} KB -> ${kb(target)} KB`);
}

function main() {
  const blender = findBlender();
  const worlds = worldsToExport(process.argv.slice(2));
  const workDir = mkdtempSync(join(tmpdir(), 'modelos-'));
  try {
    for (const world of worlds) {
      console.log(`\n== ${world} ==`);
      exportWorld(blender, world, workDir);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
