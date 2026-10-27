// Física de la nave: empuje en 6 grados de libertad con inercia, igualación de velocidad con un objetivo
// y el estabilizador, que además de frenar el giro es la "mano amable" del vuelo cerca de un mundo:
// anula la gravedad del mundo (la nave se sostiene sola), endereza las alas con el horizonte y suaviza el descenso junto al suelo.
// Sin estabilizador (modo libre) no hay ninguna ayuda. Todo vive en el marco donde vuela; la gravedad,
// el "arriba" y la velocidad del objetivo llegan ya expresados en ese marco. Lógica pura, a 60 Hz.
//
// Ejes locales de la nave (como una cámara de Three.js): +X derecha, +Y arriba, −Z proa.
//   thrust  x: derecha · y: arriba · z: adelante (todos de −1 a 1)
//   aim     ángulo de este paso (ratón): yaw > 0 proa a la izquierda, pitch > 0 proa arriba
//   turn    teclas, de −1 a 1: x proa arriba · y proa a la izquierda · z alabeo a la izquierda
import { Quaternion, Vector3 } from 'three';
import {
  SHIP_ASSIST_ALTITUDE,
  SHIP_ASSIST_DESCENT_PER_METER,
  SHIP_ASSIST_MIN_DESCENT,
  SHIP_FREE_AIM_GAIN,
  SHIP_LEVEL_RATE,
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

export interface ShipAim {
  yaw: number;
  pitch: number;
}

export interface ShipInput {
  thrust: Vector3;
  /** Giro de este paso con el ratón (rad). */
  aim: ShipAim;
  /** Giro con teclas de −1 a 1 por eje (con estabilizador: velocidad de giro; sin él: aceleración). */
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
  /** "Arriba" del mundo cercano en la posición de la nave; sin él no hay ayudas de vuelo. */
  up?: Vector3 | undefined;
  /** Altura sobre la superficie del mundo cercano (m). */
  altitude?: number | undefined;
}

export const IDLE_SHIP_INPUT: ShipInput = Object.freeze({
  thrust: new Vector3(),
  aim: Object.freeze({ yaw: 0, pitch: 0 }),
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

/** Por debajo de esto, un mando se considera suelto. */
const DEAD_INPUT = 0.05;
/** Con la proa casi vertical no hay horizonte que nivelar. */
const MAX_LEVEL_ALIGNMENT = 0.95;

const acceleration = new Vector3();
const brake = new Vector3();
const spin = new Quaternion();
const axis = new Vector3();
const nose = new Vector3();
const right = new Vector3();
const shipUp = new Vector3();
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);
const AXES = ['x', 'y', 'z'] as const;

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** Gira la nave un ángulo alrededor de uno de sus propios ejes. */
function rotateLocal(state: ShipState, localAxis: Vector3, angle: number): void {
  if (angle === 0) return;
  spin.setFromAxisAngle(localAxis, angle);
  state.orientation.multiply(spin).normalize();
}

function aimShip(state: ShipState, input: ShipInput, dt: number): void {
  const { yaw, pitch } = input.aim;
  if (input.stabilize) {
    rotateLocal(state, AXIS_Y, yaw);
    rotateLocal(state, AXIS_X, pitch);
    return;
  }
  // Modo libre: el ratón empuja el giro, que sigue después.
  const w = state.angularVelocity;
  if (dt > 0) {
    w.y = clamp(w.y + yaw * SHIP_FREE_AIM_GAIN, SHIP_MAX_TURN_RATE);
    w.x = clamp(w.x + pitch * SHIP_FREE_AIM_GAIN, SHIP_MAX_TURN_RATE);
  }
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
    rotateLocal(state, axis, angle);
  }
}

/** Endereza las alas con el horizonte del mundo (solo el alabeo: el cabeceo es del piloto). */
function levelWings(state: ShipState, up: Vector3, dt: number): void {
  nose.set(0, 0, -1).applyQuaternion(state.orientation);
  if (Math.abs(nose.dot(up)) > MAX_LEVEL_ALIGNMENT) return;
  right.set(1, 0, 0).applyQuaternion(state.orientation);
  shipUp.set(0, 1, 0).applyQuaternion(state.orientation);
  const error = Math.atan2(right.dot(up), shipUp.dot(up));
  rotateLocal(state, AXIS_Z, -error * Math.min(1, SHIP_LEVEL_RATE * dt));
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

/** Cerca del suelo, el descenso no pasa de una velocidad que permite posarse sin golpe. */
function softenDescent(state: ShipState, up: Vector3, altitude: number): void {
  if (altitude >= SHIP_ASSIST_ALTITUDE) return;
  const allowed = Math.max(
    SHIP_ASSIST_MIN_DESCENT,
    Math.max(0, altitude) * SHIP_ASSIST_DESCENT_PER_METER,
  );
  const descent = -state.velocity.dot(up);
  if (descent > allowed) state.velocity.addScaledVector(up, descent - allowed);
}

export function stepShip(
  state: ShipState,
  input: ShipInput,
  env: ShipEnvironment,
  dt: number,
): void {
  const assisted = input.stabilize && env.up !== undefined;
  aimShip(state, input, dt);
  turnShip(state, input, dt);
  if (assisted && env.up && Math.abs(input.turn.z) < DEAD_INPUT) levelWings(state, env.up, dt);

  const matching = input.match && env.targetVelocity !== undefined;
  if (!matching) {
    state.velocity.addScaledVector(thrustAcceleration(state, input, acceleration), dt);
  }
  // Cerca de un mundo el estabilizador sostiene la nave: subir y bajar es solo cosa del empuje.
  if (!assisted) state.velocity.addScaledVector(env.gravity, dt);
  if (matching && env.targetVelocity) {
    brake.subVectors(env.targetVelocity, state.velocity);
    const needed = brake.length();
    if (needed > 0) brake.multiplyScalar(Math.min(needed, SHIP_MATCH_ACCEL * dt) / needed);
    state.velocity.add(brake);
  }
  if (assisted && env.up && env.altitude !== undefined) {
    softenDescent(state, env.up, env.altitude);
  }
  if (state.velocity.length() > SHIP_MAX_SPEED) state.velocity.setLength(SHIP_MAX_SPEED);
  state.position.addScaledVector(state.velocity, dt);
}
