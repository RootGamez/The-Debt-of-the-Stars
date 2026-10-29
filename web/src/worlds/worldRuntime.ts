// Un mundo cargado y listo para pisarlo: su pozo de gravedad, sus colisiones y su punto de aparición, todo
// en el marco del propio mundo (centro en el origen). Hay que crearlo ANTES de colgar el mundo de su pivote
// en la escena, para que las posiciones salgan del modelo sin ninguna transformación encima.
import { Quaternion, Vector3 } from 'three';
import type { MotorEnvironment } from '../physics/characterMotor';
import { createBvhWorld, type BvhWorld } from '../physics/bvhWorld';
import { surfaceUp, wellForWorld, type GravityWell } from '../physics/gravity';
import { chooseSpawn, spawnOnGround, type SpawnPoint } from '../physics/spawn';
import type { Gate } from './gates';
import type { LoadedWorld } from './loadWorld';
import { WorldDataError } from './markers';

export interface WorldRuntime {
  id: string;
  world: LoadedWorld;
  well: GravityWell;
  collision: BvhWorld;
  spawn: SpawnPoint;
  /** Anillos de Puertas plegadas (vacío en casi todos los mundos). */
  gates: Gate[];
}

export function createWorldRuntime(world: LoadedWorld): WorldRuntime {
  if (world.scene.parent) {
    throw new WorldDataError(
      `${world.info.id}: ya está colgado de un pivote; prepara el mundo antes de añadirlo a la escena`,
    );
  }
  const well = wellForWorld(world.info);
  const collision = createBvhWorld(world.markers.colliders);
  const spawnMarker = chooseSpawn(world.markers.spawns);
  if (!spawnMarker) throw new WorldDataError(`${world.info.id} no tiene ningún SPAWN_`);
  return {
    id: world.info.id,
    world,
    well,
    collision,
    spawn: spawnOnGround(spawnMarker[1], collision, well),
    gates: readGates(world, well),
  };
}

/** Los anillos PASO_ en el marco del propio mundo: pie, arriba del suelo y hacia dónde miran. */
function readGates(world: LoadedWorld, well: GravityWell): Gate[] {
  return world.markers.gates.map(({ name, object, target }) => {
    const position = object.getWorldPosition(new Vector3());
    const rotation = object.getWorldQuaternion(new Quaternion());
    const up = surfaceUp(position, well);
    // La marca mira hacia su -Z (como la cámara); se quita lo que tenga de inclinación.
    const forward = new Vector3(0, 0, -1).applyQuaternion(rotation);
    forward.addScaledVector(up, -forward.dot(up)).normalize();
    return { name, position, up, forward, target };
  });
}

/** Lo que el motor del personaje necesita para moverse por ese mundo. */
export function environmentOf(runtime: WorldRuntime): MotorEnvironment {
  return { wells: [runtime.well], world: runtime.collision };
}
