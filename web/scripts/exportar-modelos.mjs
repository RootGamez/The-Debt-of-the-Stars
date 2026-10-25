// Exporta cada blender/<mundo>.blend a public/models/<mundo>.glb y lo comprime con meshopt.
// Uso: npm run modelos            (todos los .blend)
//      npm run modelos -- umbral  (solo los indicados)
// Blender: variable BLENDER_PATH o la ruta por defecto de Blender 5.2 en Windows.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
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
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Falló: ${command} ${args.join(' ')} (código ${result.status})`);
  }
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

function main() {
  const blender = process.env.BLENDER_PATH ?? DEFAULT_BLENDER;
  if (!existsSync(blender)) {
    throw new Error(`No encuentro Blender en ${blender}. Define BLENDER_PATH.`);
  }
  for (const world of worldsToExport(process.argv.slice(2))) {
    const glb = join(OUT_DIR, `${world}.glb`);
    console.log(`\n== ${world} ==`);
    run(blender, [
      '-b',
      join(BLENDER_DIR, `${world}.blend`),
      '--python',
      EXPORT_SCRIPT,
      '--',
      world,
      OUT_DIR,
    ]);
    const before = statSync(glb).size;
    // Solo comprimir: "optimize" aplana la escena y borra los nodos vacíos (las marcas SPAWN_/INT_/TRIG_).
    run(process.execPath, [GLTF_TRANSFORM, 'meshopt', glb, glb]);
    const after = statSync(glb).size;
    console.log(
      `${world}.glb: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
