// Coloca al jugador en un punto de aparición (SPAWN_): los pies sobre el suelo justo debajo de la
// marca, de pie respecto al planeta y mirando hacia donde mira la marca.
import { Quaternion, Vector3, type Object3D } from 'three';
import type { RaycastWorld } from './collisionWorld';
import { alignUp } from './surfaceFrame';

/** Desde cuánto por encima de la marca se busca el suelo y hasta qué profundidad. */
const PROBE_ABOVE = 2;
const PROBE_DEPTH = 50;

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
  const feet = distance === null ? position : origin.addScaledVector(down, distance);
  return { feet, body };
}
