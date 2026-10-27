// Pasar algo que se mueve (la nave) de un marco a otro sin que cambie su movimiento real: posición,
// velocidad, orientación y giro se re-expresan, nada más. El giro de cada marco cuenta: lo que está quieto
// sobre un mundo que gira, visto desde el espacio, gira con él.
import { Quaternion, Vector3 } from 'three';
import {
  toLocalOrientation,
  toLocalPosition,
  toLocalVelocity,
  toSystemPosition,
  toSystemVelocity,
} from './frames';
import type { BodyPose } from './orbits';

export interface MovingState {
  position: Vector3;
  velocity: Vector3;
  /** De los ejes del objeto a los del marco. */
  orientation: Quaternion;
  /** Velocidad de giro en los ejes del objeto (rad/s), respecto al marco. */
  angularVelocity: Vector3;
}

const position = new Vector3();
const velocity = new Vector3();
const orientation = new Quaternion();
const spin = new Vector3();
const frameSpin = new Vector3();
const inverse = new Quaternion();

/** Giro propio de un marco expresado en el sistema (eje Y del mundo). */
function spinOf(frame: BodyPose, target: Vector3): Vector3 {
  return target.set(0, frame.spinRate, 0).applyQuaternion(frame.orientation);
}

/** Re-expresa `state` (dado en el marco `from`) en el marco `to`. Lo modifica en el sitio. */
export function reframe(state: MovingState, from: BodyPose, to: BodyPose): void {
  toSystemPosition(from, state.position, position);
  toSystemVelocity(from, state.position, state.velocity, velocity);
  orientation.multiplyQuaternions(from.orientation, state.orientation).normalize();
  spin.copy(state.angularVelocity).applyQuaternion(orientation).add(spinOf(from, frameSpin));

  toLocalPosition(to, position, state.position);
  toLocalVelocity(to, position, velocity, state.velocity);
  toLocalOrientation(to, orientation, state.orientation);
  spin.sub(spinOf(to, frameSpin));
  inverse.copy(orientation).invert();
  state.angularVelocity.copy(spin).applyQuaternion(inverse);
}
