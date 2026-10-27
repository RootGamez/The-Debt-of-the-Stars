// Traducción de las teclas y el ratón en la intención de pilotaje 6DOF (ShipInput).
import { Vector3 } from 'three';
import { MOUSE_LOOK_SENSITIVITY } from '../data/movement';
import type { ShipInput } from './shipPhysics';

export interface FlightKeys {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  match: boolean;
}

export const EMPTY_FLIGHT_KEYS: FlightKeys = Object.freeze({
  forward: false,
  back: false,
  left: false,
  right: false,
  up: false,
  down: false,
  rollLeft: false,
  rollRight: false,
  match: false,
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createShipInput(
  keys: FlightKeys,
  /** Píxeles de ratón (o arrastre) desde el último paso. */
  look: { x: number; y: number },
  options: { stabilize: boolean },
): ShipInput {
  // Empuje en 3D: +X derecha, +Y arriba, +Z adelante
  let x = Number(keys.right) - Number(keys.left);
  let y = Number(keys.up) - Number(keys.down);
  let z = Number(keys.forward) - Number(keys.back);

  const len = Math.hypot(x, y, z);
  if (len > 1) {
    x /= len;
    y /= len;
    z /= len;
  }

  // El ratón apunta la proa como la mirada a pie (mismo ángulo por píxel); Q/E alabean.
  const roll = Number(keys.rollLeft) - Number(keys.rollRight);

  return {
    thrust: new Vector3(x, y, z),
    aim: { yaw: -look.x * MOUSE_LOOK_SENSITIVITY, pitch: -look.y * MOUSE_LOOK_SENSITIVITY },
    turn: new Vector3(0, 0, clamp(roll, -1, 1)),
    stabilize: options.stabilize,
    match: keys.match,
  };
}
