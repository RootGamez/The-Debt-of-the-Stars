// Poses de un objeto respecto a su padre, y el paso suave de una a otra (Fase 10C: el motor viejo que sale del
// núcleo, el Contrapeso que sube de la cuna al núcleo con el pulso).
import { Quaternion, Vector3, type Object3D } from 'three';

export interface LocalPose {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
}

/** Una pieza colocada: su padre y su pose respecto a él. */
export interface Anchor {
  parent: Object3D;
  pose: LocalPose;
}

/** La pose de un objeto respecto a su padre (copiada: no cambia si el objeto se mueve). */
export function poseOf(object: Object3D, scale = object.scale.x): LocalPose {
  return { position: object.position.clone(), quaternion: object.quaternion.clone(), scale };
}

/** Una marca del mundo como sitio donde dejar algo: su padre y su pose, a esa escala. */
export function anchorAt(marker: Object3D, scale = 1): Anchor | undefined {
  return marker.parent ? { parent: marker.parent, pose: poseOf(marker, scale) } : undefined;
}

/** Arranca y frena despacio (0 → 0, 1 → 1). */
export function ease(k: number): number {
  const x = Math.min(1, Math.max(0, k));
  return x * x * (3 - 2 * x);
}

/** Pone `object` entre dos poses (k de 0 a 1, ya suavizado o no). */
export function blendPose(object: Object3D, from: LocalPose, to: LocalPose, k: number): void {
  object.position.lerpVectors(from.position, to.position, k);
  object.quaternion.slerpQuaternions(from.quaternion, to.quaternion, k);
  object.scale.setScalar(from.scale + (to.scale - from.scale) * k);
}

/** Cuelga `object` de un sitio, en su pose. */
export function placeAt(object: Object3D, anchor: Anchor): void {
  if (object.parent !== anchor.parent) anchor.parent.add(object);
  blendPose(object, anchor.pose, anchor.pose, 0);
}
