// Física de la nave (Fase 11: el Albatros II redondo). La nave solo se mueve y gira por lo que empujan sus toberas
// (src/ship/thrusters.ts): el ordenador de vuelo convierte los mandos en una aceleración y un giro deseados, las
// toberas dan lo que pueden y eso es lo que se aplica, con la gravedad siempre encima.
// El estabilizador es la "mano amable" del ordenador: frena el giro al soltar, lleva la proa hacia donde apunta el
// ratón, sostiene la nave contra la gravedad del mundo cercano (con las toberas de la panza: se ve arder), endereza
// las alas con el horizonte y frena el descenso junto al suelo. Sin estabilizador (modo libre) los mandos piden
// empuje y par a pelo. Todo vive en el marco donde vuela; la gravedad, el "arriba" y la velocidad del objetivo
// llegan ya expresados en ese marco. Lógica pura, a 60 Hz.
//
// Ejes locales de la nave (como una cámara de Three.js): +X derecha, +Y arriba, −Z proa.
//   thrust  x: derecha · y: arriba · z: adelante (todos de −1 a 1)
//   aim     ángulo de este paso (ratón): yaw > 0 proa a la izquierda, pitch > 0 proa arriba
//   turn    teclas, de −1 a 1: x proa arriba · y proa a la izquierda · z alabeo a la izquierda
import { Quaternion, Vector3 } from 'three';
import {
  SHIP_AIM_RATE,
  SHIP_ASSIST_ALTITUDE,
  SHIP_ASSIST_BRAKE,
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
  SHIP_TURN_RESPONSE,
} from '../data/ship';
import {
  allocateThrust,
  createThrustLevels,
  createThrustOutput,
  type ThrustOutput,
} from './thrusters';

export interface ShipState {
  position: Vector3;
  velocity: Vector3;
  /** De los ejes de la nave a los del marco. */
  orientation: Quaternion;
  /** Velocidad de giro en ejes locales (rad/s). */
  angularVelocity: Vector3;
  /** Nivel de cada tobera en el último paso (0 a 1, en el orden de THRUSTERS): lo que se ve arder. */
  thrusters: Float32Array;
  /** Lo que falta por girar hacia donde apuntó el ratón (rad), con el estabilizador puesto. */
  aimPending: ShipAim;
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
    thrusters: createThrustLevels(),
    aimPending: { yaw: 0, pitch: 0 },
  };
}

/** Por debajo de esto, un mando se considera suelto. */
const DEAD_INPUT = 0.05;
/** Con la proa casi vertical no hay horizonte que nivelar. */
const MAX_LEVEL_ALIGNMENT = 0.95;
/** Puntería pendiente que se da por hecha (rad). */
const AIM_DONE = 1e-4;

const wantedLinear = new Vector3();
const wantedTurn = new Vector3();
const worldWanted = new Vector3();
const brake = new Vector3();
const spin = new Quaternion();
const inverse = new Quaternion();
const axis = new Vector3();
const nose = new Vector3();
const right = new Vector3();
const shipUp = new Vector3();
const output: ThrustOutput = createThrustOutput();
const AXES = ['x', 'y', 'z'] as const;

function clamp(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-limit, Math.min(limit, value));
}

/** Gira la nave un ángulo alrededor de uno de sus propios ejes. */
function rotateLocal(state: ShipState, localAxis: Vector3, angle: number): void {
  if (angle === 0) return;
  spin.setFromAxisAngle(localAxis, angle);
  state.orientation.multiply(spin).normalize();
}

/** Error de alabeo respecto al horizonte (rad, > 0 = ala derecha arriba); 0 si no hay horizonte que nivelar. */
function rollError(state: ShipState, up: Vector3): number {
  nose.set(0, 0, -1).applyQuaternion(state.orientation);
  if (Math.abs(nose.dot(up)) > MAX_LEVEL_ALIGNMENT) return 0;
  right.set(1, 0, 0).applyQuaternion(state.orientation);
  shipUp.set(0, 1, 0).applyQuaternion(state.orientation);
  return Math.atan2(right.dot(up), shipUp.dot(up));
}

/**
 * El giro que pide el piloto, como aceleración de giro (rad/s², ejes de la nave). Con el estabilizador se pide una
 * velocidad de giro y el ordenador la persigue: la de las teclas, la que lleva la proa hacia donde apuntó el ratón
 * y, cerca de un mundo, la que endereza las alas. Sin él, cada mando es par a pelo.
 */
function wantedRotation(
  state: ShipState,
  input: ShipInput,
  env: ShipEnvironment,
  dt: number,
  target: Vector3,
): Vector3 {
  const w = state.angularVelocity;
  const pending = state.aimPending;
  if (!input.stabilize) {
    pending.yaw = pending.pitch = 0;
    const kick = SHIP_FREE_AIM_GAIN / dt;
    return target.set(
      clamp(input.turn.x, 1) * SHIP_TURN_ACCEL + clamp(input.aim.pitch * kick, 1e3),
      clamp(input.turn.y, 1) * SHIP_TURN_ACCEL + clamp(input.aim.yaw * kick, 1e3),
      clamp(input.turn.z, 1) * SHIP_TURN_ACCEL,
    );
  }
  pending.yaw = clamp(pending.yaw + input.aim.yaw, Math.PI);
  pending.pitch = clamp(pending.pitch + input.aim.pitch, Math.PI);
  target.set(
    clamp(input.turn.x, 1) * SHIP_MAX_TURN_RATE + pending.pitch * SHIP_AIM_RATE,
    clamp(input.turn.y, 1) * SHIP_MAX_TURN_RATE + pending.yaw * SHIP_AIM_RATE,
    clamp(input.turn.z, 1) * SHIP_MAX_TURN_RATE,
  );
  if (env.up && Math.abs(input.turn.z) < DEAD_INPUT) {
    target.z = -rollError(state, env.up) * SHIP_LEVEL_RATE;
  }
  for (const key of AXES) {
    const desired = clamp(target[key], SHIP_MAX_TURN_RATE);
    target[key] = (desired - w[key]) * SHIP_TURN_RESPONSE;
  }
  return target;
}

/** Empuje que pide el piloto con las teclas (m/s², ejes de la nave). */
function pilotThrust(input: ShipInput, target: Vector3): Vector3 {
  const { x, y, z } = input.thrust;
  target.set(clamp(x, 1), clamp(y, 1), -clamp(z, 1));
  if (target.length() > 1) target.normalize();
  return target.set(
    target.x * SHIP_THRUST_LATERAL,
    target.y * SHIP_THRUST_VERTICAL,
    target.z * SHIP_THRUST_FORWARD,
  );
}

/**
 * Lo que el ordenador añade en el marco del mundo: igualar la velocidad del objetivo, o bien sostener la nave contra
 * la gravedad y frenar el descenso junto al suelo (una curva de frenado que llega al suelo a la velocidad mínima).
 */
function assistance(state: ShipState, input: ShipInput, env: ShipEnvironment, dt: number): Vector3 {
  worldWanted.set(0, 0, 0);
  if (input.match && env.targetVelocity) {
    brake.subVectors(env.targetVelocity, state.velocity).divideScalar(dt);
    if (brake.length() > SHIP_MATCH_ACCEL) brake.setLength(SHIP_MATCH_ACCEL);
    return worldWanted.copy(brake).sub(env.gravity);
  }
  if (!input.stabilize || !env.up) return worldWanted;
  worldWanted.copy(env.gravity).negate();
  const altitude = env.altitude;
  if (altitude === undefined || altitude >= SHIP_ASSIST_ALTITUDE) return worldWanted;
  const allowed =
    SHIP_ASSIST_MIN_DESCENT + Math.sqrt(2 * SHIP_ASSIST_BRAKE * Math.max(0, altitude));
  const descent = -state.velocity.dot(env.up);
  if (descent > allowed) worldWanted.addScaledVector(env.up, (descent - allowed) / dt);
  return worldWanted;
}

/** Resta lo girado a lo pendiente sin pasarse de cero. */
function settle(pending: number, turned: number): number {
  const left = pending - turned;
  if (Math.abs(left) < AIM_DONE || Math.sign(left) !== Math.sign(pending)) return 0;
  return left;
}

export function stepShip(
  state: ShipState,
  input: ShipInput,
  env: ShipEnvironment,
  dt: number,
): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  wantedRotation(state, input, env, dt, wantedTurn);
  if (input.match && env.targetVelocity) wantedLinear.set(0, 0, 0);
  else pilotThrust(input, wantedLinear);
  inverse.copy(state.orientation).invert();
  wantedLinear.add(assistance(state, input, env, dt).applyQuaternion(inverse));

  allocateThrust(wantedLinear, wantedTurn, state.thrusters, output);

  // Giro: lo que dan las toberas, con un tope de velocidad para que el piloto no pierda el control.
  const w = state.angularVelocity;
  for (const key of AXES) w[key] = clamp(w[key] + output.angular[key] * dt, SHIP_MAX_TURN_RATE);
  const angle = w.length() * dt;
  if (angle > 1e-12) {
    axis.copy(w).normalize();
    rotateLocal(state, axis, angle);
    // La puntería pendiente se gasta con lo que de verdad ha girado.
    state.aimPending.yaw = settle(state.aimPending.yaw, w.y * dt);
    state.aimPending.pitch = settle(state.aimPending.pitch, w.x * dt);
  }

  // Empuje: lo que dan las toberas, más la gravedad (el estabilizador la contrarresta con empuje, no con magia).
  state.velocity.addScaledVector(output.linear.applyQuaternion(state.orientation), dt);
  state.velocity.addScaledVector(env.gravity, dt);
  if (state.velocity.length() > SHIP_MAX_SPEED) state.velocity.setLength(SHIP_MAX_SPEED);
  state.position.addScaledVector(state.velocity, dt);
}
