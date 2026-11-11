// Un objeto dejado en cualquier sitio (game/carry.ts, `dropHeld`): se cuelga del marco del mundo donde está el puzle,
// de pie sobre el punto donde se dejó y con su eje de arriba (Z, como todos los modelos de los puzles) hacia la normal
// de la superficie. Así queda bien sobre el suelo, una mesa o una cuesta.
import { Quaternion, Vector3, type Object3D } from 'three';
import type { LoosePose } from '../game/carry';

const MODEL_UP = new Vector3(0, 0, 1);
const normal = new Vector3();
const turn = new Quaternion();

/**
 * Coloca `object` colgado de `parent` en `pose`. `lift` es lo que hay del centro del objeto a su base (m): se sube
 * esa distancia por la normal para que apoye en vez de hundirse.
 */
export function placeLoose(
  object: Object3D,
  parent: Object3D,
  pose: LoosePose,
  lift: number,
): void {
  if (object.parent !== parent) parent.add(object);
  normal.set(...pose.normal);
  if (normal.lengthSq() < 1e-8) normal.copy(MODEL_UP);
  normal.normalize();
  object.position.set(...pose.position).addScaledVector(normal, lift);
  object.quaternion.copy(turn.setFromUnitVectors(MODEL_UP, normal));
  object.scale.setScalar(1);
}
