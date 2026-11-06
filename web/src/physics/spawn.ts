// Coloca al jugador en un punto de aparición (SPAWN_): los pies sobre el suelo justo debajo de la
// marca, de pie respecto al planeta y mirando hacia donde mira la marca. Dentro de la cavidad de un mundo
// hueco (el Nudo), "debajo" es hacia fuera y la cabeza apunta al centro.
import { Quaternion, Vector3, type Object3D } from 'three';
import type { RaycastWorld } from './collisionWorld';
import { WorldDataError } from '../worlds/markers';
import { surfaceUp, type GravityWell } from './gravity';
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

/** @param ground el pozo del mundo (o solo su centro, para un planeta macizo). */
export function spawnOnGround(
  marker: Object3D,
  world: RaycastWorld,
  ground: Vector3 | GravityWell,
): SpawnPoint {
  const position = marker.getWorldPosition(new Vector3());
  const up =
    ground instanceof Vector3
      ? position.clone().sub(ground).normalize()
      : surfaceUp(position, ground);
  const body = marker.getWorldQuaternion(new Quaternion());
  alignUp(body, up, 1);

  const origin = position.clone().addScaledVector(up, PROBE_ABOVE);
  const down = up.clone().negate();
  const distance = world.raycast(origin, down, PROBE_DEPTH);
  if (distance === null) {
    throw new WorldDataError(
      `${marker.name}: no hay suelo en ${PROBE_DEPTH} m bajo la marca (revisa su constructor en worlds/procedural)`,
    );
  }
  return { feet: origin.addScaledVector(down, distance), body };
}
