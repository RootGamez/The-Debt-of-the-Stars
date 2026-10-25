// Orientación del jugador sobre un planeta. El cuerpo es un cuaternión: su +Y local es el "arriba",
// su -Z local es hacia donde mira y su +X local la derecha. Se usan cuaterniones (no ángulos de Euler)
// para que no haya saltos al pasar por los polos ni al dar la vuelta al mundo.
// Las funciones que reciben `body` lo modifican en el sitio (se llaman en cada paso de física).
import { Quaternion, Vector3 } from 'three';

const LOCAL_UP = new Vector3(0, 1, 0);
const LOCAL_FORWARD = new Vector3(0, 0, -1);
const LOCAL_RIGHT = new Vector3(1, 0, 0);
const IDENTITY = new Quaternion();
const delta = new Quaternion();
const partial = new Quaternion();
const turn = new Quaternion();
const currentUp = new Vector3();

export function upOf(body: Quaternion, target = new Vector3()): Vector3 {
  return target.copy(LOCAL_UP).applyQuaternion(body);
}

export function forwardOf(body: Quaternion, target = new Vector3()): Vector3 {
  return target.copy(LOCAL_FORWARD).applyQuaternion(body);
}

export function rightOf(body: Quaternion, target = new Vector3()): Vector3 {
  return target.copy(LOCAL_RIGHT).applyQuaternion(body);
}

/** Gira la vista alrededor del "arriba" local. Ángulo positivo = hacia la izquierda. */
export function yaw(body: Quaternion, angle: number): Quaternion {
  turn.setFromAxisAngle(LOCAL_UP, angle);
  return body.multiply(turn).normalize();
}

/**
 * Lleva el "arriba" del cuerpo hacia `targetUp` (unitario) con la rotación mínima, así se conserva
 * hacia dónde mira. `t` = fracción del camino (1 = de golpe; usar `smoothingFactor` para suavizar).
 */
export function alignUp(body: Quaternion, targetUp: Vector3, t: number): Quaternion {
  upOf(body, currentUp);
  delta.setFromUnitVectors(currentUp, targetUp);
  partial.copy(IDENTITY).slerp(delta, t);
  return body.premultiply(partial).normalize();
}

/** Fracción de suavizado independiente de la tasa de fotogramas: 1 - e^(-rate·dt). */
export function smoothingFactor(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}
