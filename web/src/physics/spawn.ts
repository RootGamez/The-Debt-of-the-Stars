// Coloca al jugador en un punto de aparición (SPAWN_): los pies sobre el suelo justo debajo de la
// marca, de pie respecto al planeta y mirando hacia donde mira la marca.
import { Quaternion, Vector3, type Object3D } from 'three';
import type { RaycastWorld } from './collisionWorld';
import { WorldDataError } from '../worlds/markers';
import { alignUp } from './surfaceFrame';

/** Desde cuánto por encima de la marca se busca el suelo y hasta qué profundidad. */
const PROBE_ABOVE = 2;
const PROBE_DEPTH = 50;

/** Punto de llegada de cada ciclo (CONTEXTO_PLANETAS.md, Umbral: La Boca). */
export const ARRIVAL_SPAWN = 'SPAWN_LaBoca';

/** Elige el punto de aparición: La Boca si existe; si no, el primero por nombre. */
export function chooseSpawn(spawns: ReadonlyMap<string, Object3D>): [string, Object3D] | undefined {
  const arrival = spawns.get(ARRIVAL_SPAWN);
  if (arrival) return [ARRIVAL_SPAWN, arrival];
  const [first] = [...spawns.keys()].sort();
  const marker = first === undefined ? undefined : spawns.get(first);
  return first === undefined || !marker ? undefined : [first, marker];
}

export interface SpawnPoint {
  feet: Vector3;
  body: Quaternion;
}

export function spawnOnGround(
  marker: Object3D,
  world: RaycastWorld,
  planetCenter: Vector3,
): SpawnPoint {
  const position = marker.getWorldPosition(new Vector3());
  const up = position.clone().sub(planetCenter).normalize();
  const body = marker.getWorldQuaternion(new Quaternion());
  alignUp(body, up, 1);

  const origin = position.clone().addScaledVector(up, PROBE_ABOVE);
  const down = up.clone().negate();
  const distance = world.raycast(origin, down, PROBE_DEPTH);
  if (distance === null) {
    throw new WorldDataError(
      `${marker.name}: no hay suelo en ${PROBE_DEPTH} m bajo la marca (revisa blender/marcas)`,
    );
  }
  return { feet: origin.addScaledVector(down, distance), body };
}
