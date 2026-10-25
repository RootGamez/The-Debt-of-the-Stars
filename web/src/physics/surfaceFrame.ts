// Orientación del jugador sobre un planeta. El cuerpo es un cuaternión: su +Y local es el "arriba",
// su -Z local es hacia donde mira y su +X local la derecha. Se usan cuaterniones (no ángulos de Euler)
// para que no haya saltos al pasar por los polos ni al dar la vuelta al mundo.
// Las funciones que reciben `body` lo modifican en el sitio (se llaman en cada paso de física).
import { Matrix4, Quaternion, Vector3 } from 'three';

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

const basis = new Matrix4();
const axisX = new Vector3();
const axisZ = new Vector3();
const FALLBACK_HEADINGS = [new Vector3(0, 0, -1), new Vector3(1, 0, 0)];

/**
 * Orientación de pie sobre el suelo: `up` hacia arriba y mirando lo más cerca posible de `forward`
 * (proyectado sobre el plano del suelo). Si `forward` es paralelo a `up`, elige un rumbo cualquiera.
 */
export function lookAlong(up: Vector3, forward: Vector3, target = new Quaternion()): Quaternion {
  const upUnit = new Vector3().copy(up).normalize();
  const heading = new Vector3().copy(forward).addScaledVector(upUnit, -forward.dot(upUnit));
  for (const fallback of FALLBACK_HEADINGS) {
    if (heading.lengthSq() > 1e-12) break;
    heading.copy(fallback).addScaledVector(upUnit, -fallback.dot(upUnit));
  }
  heading.normalize();
  axisX.crossVectors(heading, upUnit).normalize();
  axisZ.copy(heading).negate();
  basis.makeBasis(axisX, upUnit, axisZ);
  return target.setFromRotationMatrix(basis).normalize();
}
