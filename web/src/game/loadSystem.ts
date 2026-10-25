// Carga lo que hace falta para jugar en un mundo: si pertenece al sistema ajeno, todos sus mundos; si no
// (Hogar, Luna), solo ese. Cada mundo se prepara (gravedad, colisiones, aparición) ANTES de colgarlo de
// la escena, para que sus posiciones sean las del modelo.
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

export async function loadSystem(startWorld: string): Promise<LoadedSystem> {
  const system = parseSystem(systemData, WORLD_IDS);
  const spec = system.bodyOf(startWorld) ? system : undefined;
  const ids = spec ? spec.bodies.map((body) => body.world) : [startWorld];
  const worlds = await Promise.all(ids.map((id) => loadWorld(id)));
  const runtimes = new Map(worlds.map((world) => [world.info.id, createWorldRuntime(world)]));
  return { spec, startWorld, runtimes };
}
