// Carga los mundos reales para las pruebas que dependen del tamaño o de las marcas: desde la Fase 11 todos se
// construyen por código.
import { loadWorld, type LoadedWorld } from '../../src/worlds/loadWorld';
import type { WorldInfo } from '../../src/worlds/markers';

/** El mundo real `world` (en una promesa, para las pruebas que lo esperan). */
export function loadBuiltWorld(world: string): Promise<LoadedWorld> {
  return Promise.resolve(loadWorld(world));
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
