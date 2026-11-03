// Carga los mundos reales para las pruebas que dependen del tamaño o de las marcas: construidos por código
// (Fase 11) o, los que aún no se han migrado, desde su .glb de public/models.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildWorld, parseWorld, type LoadedWorld } from '../../src/worlds/loadWorld';

export async function loadBuiltWorld(world: string): Promise<LoadedWorld> {
  const built = buildWorld(world);
  if (built) return built;
  const bytes = readFileSync(
    fileURLToPath(new URL(`../../public/models/${world}.glb`, import.meta.url)),
  );
  return parseWorld(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    world,
  );
}
