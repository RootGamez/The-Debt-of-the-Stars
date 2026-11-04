// Cámara en primera persona: ojos a EYE_HEIGHT sobre los pies, orientación del cuerpo más el
// cabeceo (mirar arriba/abajo), limitado para no dar la vuelta por encima de la cabeza.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { EYE_HEIGHT, MAX_PITCH_DEGREES } from '../data/movement';
import { forwardOf, rightOf, upOf } from '../physics/surfaceFrame';

const MAX_PITCH = (MAX_PITCH_DEGREES * Math.PI) / 180;
const PITCH_AXIS = new Vector3(1, 0, 0);
const pitchRotation = new Quaternion();
const up = new Vector3();

export function clampPitch(pitch: number): number {
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

/** Calcula posición y orientación de la cámara y las escribe en los objetivos. */
export function cameraPose(
  body: Quaternion,
  pitch: number,
  feet: Vector3,
  targetPosition: Vector3,
  targetQuaternion: Quaternion,
): void {
  targetPosition.copy(feet).addScaledVector(upOf(body, up), EYE_HEIGHT);
  pitchRotation.setFromAxisAngle(PITCH_AXIS, pitch);
  targetQuaternion.copy(body).multiply(pitchRotation);
}

/**
 * La cámara exterior de depuración (F6): detrás, algo por encima y a la derecha, mirando al explorador. `around`
 * la gira alrededor de él (rad; π = de frente).
 */
const CHASE = { back: 2.4, up: 1.2, side: 0.7, aim: 0.7 } as const;
const chaseLook = new Matrix4();
const chaseTarget = new Vector3();
const chaseForward = new Vector3();
const chaseRight = new Vector3();

export function chasePose(
  body: Quaternion,
  feet: Vector3,
  targetPosition: Vector3,
  targetQuaternion: Quaternion,
  around = 0,
): void {
  upOf(body, up);
  forwardOf(body, chaseForward).applyAxisAngle(up, around);
  rightOf(body, chaseRight).applyAxisAngle(up, around);
  targetPosition
    .copy(feet)
    .addScaledVector(up, CHASE.up)
    .addScaledVector(chaseForward, -CHASE.back)
    .addScaledVector(chaseRight, CHASE.side);
  chaseTarget.copy(feet).addScaledVector(up, CHASE.aim);
  chaseLook.lookAt(targetPosition, chaseTarget, up);
  targetQuaternion.setFromRotationMatrix(chaseLook);
}
