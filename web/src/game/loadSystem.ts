// Carga lo que hace falta para jugar en un mundo: todos los mundos de su sistema (el ajeno, el de casa del
// prólogo o el Archivo de las Puertas del epílogo) o, si no está en ninguno, solo ese. Cada mundo se prepara (gravedad, colisiones, aparición) ANTES de
// colgarlo de la escena, para que sus posiciones sean las del modelo.
import homeData from '../data/sistema-hogar.json';
import gatesData from '../data/sistema-puertas.json';
import systemData from '../data/sistema.json';
import { parseSystem, type SystemSpec } from '../system/systemData';
import { loadWorld } from '../worlds/loadWorld';
import { createWorldRuntime, type WorldRuntime } from '../worlds/worldRuntime';
import { WORLD_IDS } from '../worlds/worldSelection';

export interface LoadedSystem {
  /** `undefined` = el mundo elegido no forma parte de ningún sistema. */
  spec: SystemSpec | undefined;
  startWorld: string;
  runtimes: ReadonlyMap<string, WorldRuntime>;
}

/** El sistema donde está un mundo: el ajeno, el de casa o el Archivo (`undefined` si no está en ninguno). */
export function systemOf(world: string): SystemSpec | undefined {
  return [systemData, homeData, gatesData]
    .map((raw) => parseSystem(raw, WORLD_IDS))
    .find((system) => system.bodyOf(world));
}

export async function loadSystem(startWorld: string): Promise<LoadedSystem> {
  const spec = systemOf(startWorld);
  const ids = spec ? spec.bodies.map((body) => body.world) : [startWorld];
  const worlds = await Promise.all(ids.map((id) => loadWorld(id)));
  const runtimes = new Map(worlds.map((world) => [world.info.id, createWorldRuntime(world)]));
  return { spec, startWorld, runtimes };
}
