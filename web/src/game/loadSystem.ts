// Carga lo que hace falta para jugar en un mundo: todos los mundos de su sistema (el ajeno, el de casa del
// prólogo o el Archivo de las Puertas del epílogo) o, si no está en ninguno, solo ese. Cada mundo se prepara (gravedad, colisiones, aparición) ANTES de
// colgarlo de la escena, para que sus posiciones sean las del modelo. Sin las piezas `without` (el Hogar de antes).
import homeData from '../data/sistema-hogar.json';
import gatesData from '../data/sistema-puertas.json';
import systemData from '../data/sistema.json';
import { parseSystem, type SystemSpec } from '../system/systemData';
import { leaveOut } from '../worlds/leaveOut';
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

/** Los mundos que hay que construir para empezar en `startWorld`. */
function worldsToBuild(spec: SystemSpec | undefined, startWorld: string): string[] {
  return spec ? spec.bodies.map((body) => body.world) : [startWorld];
}

function buildRuntime(id: string, without: readonly string[]): WorldRuntime {
  return createWorldRuntime(leaveOut(loadWorld(id), without));
}

export function loadSystem(startWorld: string, without: readonly string[] = []): LoadedSystem {
  const spec = systemOf(startWorld);
  const runtimes = new Map(
    worldsToBuild(spec, startWorld).map((id) => {
      const runtime = buildRuntime(id, without);
      return [runtime.world.info.id, runtime] as const;
    }),
  );
  return { spec, startWorld, runtimes };
}

export interface LoadProgress {
  /** Cuántos mundos hay ya construidos y cuántos hay que construir. */
  onWorld?: (built: number, total: number) => void;
  /** Se espera antes de cada mundo: deja respirar al navegador (dibujar la pantalla de carga, oír un gesto). */
  pause?: () => Promise<void>;
}

/** Lo mismo que `loadSystem`, pero un mundo cada vez, avisando de cuántos lleva (la pantalla de carga). */
export async function loadSystemStepwise(
  startWorld: string,
  without: readonly string[] = [],
  progress: LoadProgress = {},
): Promise<LoadedSystem> {
  const spec = systemOf(startWorld);
  const ids = worldsToBuild(spec, startWorld);
  const runtimes = new Map<string, WorldRuntime>();
  progress.onWorld?.(0, ids.length);
  for (const id of ids) {
    await progress.pause?.();
    const runtime = buildRuntime(id, without);
    runtimes.set(runtime.world.info.id, runtime);
    progress.onWorld?.(runtimes.size, ids.length);
  }
  return { spec, startWorld, runtimes };
}
