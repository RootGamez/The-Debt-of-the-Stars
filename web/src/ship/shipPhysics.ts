// Física de la nave: empuje en 6 grados de libertad con inercia, estabilizador de giro e igualación de
// velocidad con un objetivo. Todo vive en el marco donde vuela (el de un mundo o el del sistema); la
// gravedad y la velocidad del objetivo llegan ya expresadas en ese marco. Lógica pura, a 60 Hz.
//
// Ejes locales de la nave (como una cámara de Three.js): +X derecha, +Y arriba, −Z proa.
//   thrust  x: derecha · y: arriba · z: adelante (todos de −1 a 1)
//   turn    x: proa arriba · y: proa a la izquierda · z: alabeo a la izquierda (ala derecha arriba)
import { Quaternion, Vector3 } from 'three';
import {
  SHIP_MATCH_ACCEL,
  SHIP_MAX_SPEED,
  SHIP_MAX_TURN_RATE,
  SHIP_THRUST_FORWARD,
  SHIP_THRUST_LATERAL,
  SHIP_THRUST_VERTICAL,
  SHIP_TURN_ACCEL,
} from '../data/ship';

export interface ShipState {
  position: Vector3;
  velocity: Vector3;
  /** De los ejes de la nave a los del marco. */
  orientation: Quaternion;
  /** Velocidad de giro en ejes locales (rad/s). */
  angularVelocity: Vector3;
}

export interface ShipInput {
  thrust: Vector3;
  /** Giro deseado de −1 a 1 por eje (con estabilizador: velocidad de giro; sin él: aceleración). */
  turn: Vector3;
  stabilize: boolean;
  /** Igualar la velocidad del objetivo (ignora el empuje). */
  match: boolean;
}

export interface ShipEnvironment {
  /** Aceleración de la gravedad en la posición de la nave (marco de vuelo). */
  gravity: Vector3;
  /** Velocidad del objetivo en el marco de vuelo, si hay uno fijado. */
  targetVelocity: Vector3 | undefined;
}

export const IDLE_SHIP_INPUT: ShipInput = Object.freeze({
  thrust: new Vector3(),
  turn: new Vector3(),
  stabilize: true,
  match: false,
});

export function createShipState(): ShipState {
  return {
    position: new Vector3(),
    velocity: new Vector3(),
    orientation: new Quaternion(),
    angularVelocity: new Vector3(),
  };
}

const acceleration = new Vector3();
const brake = new Vector3();
const spin = new Quaternion();
const axis = new Vector3();
const AXES = ['x', 'y', 'z'] as const;

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

function turnShip(state: ShipState, input: ShipInput, dt: number): void {
  const w = state.angularVelocity;
  for (const key of AXES) {
    const command = clamp(input.turn[key], 1);
    if (input.stabilize) {
      const desired = command * SHIP_MAX_TURN_RATE;
      w[key] += clamp(desired - w[key], SHIP_TURN_ACCEL * dt);
    } else {
      w[key] = clamp(w[key] + command * SHIP_TURN_ACCEL * dt, SHIP_MAX_TURN_RATE);
    }
  }
  const angle = w.length() * dt;
  if (angle > 1e-12) {
    axis.copy(w).normalize();
    spin.setFromAxisAngle(axis, angle);
    state.orientation.multiply(spin).normalize();
  }
}

function thrustAcceleration(state: ShipState, input: ShipInput, target: Vector3): Vector3 {
  const { x, y, z } = input.thrust;
  target.set(x, y, -z);
  if (target.length() > 1) target.normalize();
  target.set(
    target.x * SHIP_THRUST_LATERAL,
    target.y * SHIP_THRUST_VERTICAL,
    target.z * SHIP_THRUST_FORWARD,
  );
  return target.applyQuaternion(state.orientation);
}

export function stepShip(
  state: ShipState,
  input: ShipInput,
  env: ShipEnvironment,
  dt: number,
): void {
  turnShip(state, input, dt);

  const matching = input.match && env.targetVelocity !== undefined;
  if (!matching) {
    state.velocity.addScaledVector(thrustAcceleration(state, input, acceleration), dt);
  }
  state.velocity.addScaledVector(env.gravity, dt);
  if (matching && env.targetVelocity) {
    brake.subVectors(env.targetVelocity, state.velocity);
    const needed = brake.length();
    if (needed > 0) brake.multiplyScalar(Math.min(needed, SHIP_MATCH_ACCEL * dt) / needed);
    state.velocity.add(brake);
  }
  if (state.velocity.length() > SHIP_MAX_SPEED) state.velocity.setLength(SHIP_MAX_SPEED);
  state.position.addScaledVector(state.velocity, dt);
}
