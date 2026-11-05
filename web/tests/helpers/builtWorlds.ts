// Carga los mundos reales para las pruebas que dependen del tamaño o de las marcas: construidos por código
// (Fase 11) o, los que aún no se han migrado, desde su .glb de public/models.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildWorld, parseWorld, type LoadedWorld } from '../../src/worlds/loadWorld';
import type { WorldInfo } from '../../src/worlds/markers';

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

const infos = new Map<string, Promise<WorldInfo>>();

/**
 * Solo los datos de la raíz de un mundo real, construido una vez por archivo de pruebas: construir los mundos por
 * código (Cicatriz tarda casi un segundo) en cada prueba agotaba el tiempo con toda la batería a la vez.
 */
export function builtWorldInfo(world: string): Promise<WorldInfo> {
  let info = infos.get(world);
  if (!info) {
    info = loadBuiltWorld(world).then((loaded) => loaded.info);
    infos.set(world, info);
  }
  return info;
}
