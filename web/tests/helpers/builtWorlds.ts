// Carga los .glb reales de public/models para las pruebas que dependen del tamaño o de las marcas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseWorld, type LoadedWorld } from '../../src/worlds/loadWorld';

export async function loadBuiltWorld(world: string): Promise<LoadedWorld> {
  const bytes = readFileSync(
    fileURLToPath(new URL(`../../public/models/${world}.glb`, import.meta.url)),
  );
  return parseWorld(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    world,
  );
}
