// Un mundo cargado y listo para pisarlo: su pozo de gravedad, sus colisiones y su punto de aparición, todo
// en el marco del propio mundo (centro en el origen). Hay que crearlo ANTES de colgar el mundo de su pivote
// en la escena, para que las posiciones salgan del modelo sin ninguna transformación encima.
import type { MotorEnvironment } from '../physics/characterMotor';
import { createBvhWorld, type BvhWorld } from '../physics/bvhWorld';
import { wellForWorld, type GravityWell } from '../physics/gravity';
import { chooseSpawn, spawnOnGround, type SpawnPoint } from '../physics/spawn';
import type { LoadedWorld } from './loadWorld';
import { WorldDataError } from './markers';

export interface WorldRuntime {
  id: string;
  world: LoadedWorld;
  well: GravityWell;
  collision: BvhWorld;
  spawn: SpawnPoint;
}

export function createWorldRuntime(world: LoadedWorld): WorldRuntime {
  const well = wellForWorld(world.info);
  const collision = createBvhWorld(world.markers.colliders);
  const spawnMarker = chooseSpawn(world.markers.spawns);
  if (!spawnMarker) throw new WorldDataError(`${world.info.id} no tiene ningún SPAWN_`);
  return {
    id: world.info.id,
    world,
    well,
    collision,
    spawn: spawnOnGround(spawnMarker[1], collision, well.center),
  };
}

/** Lo que el motor del personaje necesita para moverse por ese mundo. */
export function environmentOf(runtime: WorldRuntime): MotorEnvironment {
  return { wells: [runtime.well], world: runtime.collision };
}
