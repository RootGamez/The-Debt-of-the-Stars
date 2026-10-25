// Cambios de marco de referencia: del sistema (origen = la Brasa) al de un mundo y al revés. El marco
// de un mundo gira y se mueve con él: lo quieto en su superficie está quieto en su marco.
// Velocidad de un punto: v_sistema = v_mundo + q·v_local + ω × (q·x_local), con ω = (0, spin, 0).
import { Quaternion, Vector3 } from 'three';
import type { BodyPose } from './orbits';

/** El propio marco del sistema (el espacio abierto): no mueve ni gira nada. */
export const SYSTEM_FRAME: BodyPose = {
  position: new Vector3(),
  velocity: new Vector3(),
  orientation: new Quaternion(),
  spinRate: 0,
};

const inverse = new Quaternion();
const offset = new Vector3();
const spinVelocity = new Vector3();

/** Posición del sistema → posición en el marco de `pose`. */
export function toLocalPosition(pose: BodyPose, systemPoint: Vector3, target: Vector3): Vector3 {
  inverse.copy(pose.orientation).invert();
  return target.subVectors(systemPoint, pose.position).applyQuaternion(inverse);
}

/** Posición en el marco de `pose` → posición del sistema. */
export function toSystemPosition(pose: BodyPose, localPoint: Vector3, target: Vector3): Vector3 {
  return target.copy(localPoint).applyQuaternion(pose.orientation).add(pose.position);
}

/** Velocidad del sistema de algo que está en `systemPoint` → velocidad que ve quien está sobre el mundo. */
export function toLocalVelocity(
  pose: BodyPose,
  systemPoint: Vector3,
  systemVelocity: Vector3,
  target: Vector3,
): Vector3 {
  inverse.copy(pose.orientation).invert();
  offset.subVectors(systemPoint, pose.position);
  spinVelocity.set(0, pose.spinRate, 0).cross(offset);
  return target
    .subVectors(systemVelocity, pose.velocity)
    .sub(spinVelocity)
    .applyQuaternion(inverse);
}

/** Velocidad vista desde el mundo, de algo que está en `localPoint` → velocidad en el sistema. */
export function toSystemVelocity(
  pose: BodyPose,
  localPoint: Vector3,
  localVelocity: Vector3,
  target: Vector3,
): Vector3 {
  offset.copy(localPoint).applyQuaternion(pose.orientation);
  spinVelocity.set(0, pose.spinRate, 0).cross(offset);
  return target
    .copy(localVelocity)
    .applyQuaternion(pose.orientation)
    .add(pose.velocity)
    .add(spinVelocity);
}

/** Orientación del sistema → orientación respecto al marco de `pose`. */
export function toLocalOrientation(
  pose: BodyPose,
  systemOrientation: Quaternion,
  target: Quaternion,
): Quaternion {
  inverse.copy(pose.orientation).invert();
  return target.multiplyQuaternions(inverse, systemOrientation);
}
