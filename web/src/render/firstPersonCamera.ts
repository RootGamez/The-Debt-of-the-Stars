// Cámara en primera persona: ojos a EYE_HEIGHT sobre los pies, orientación del cuerpo más el
// cabeceo (mirar arriba/abajo), limitado para no dar la vuelta por encima de la cabeza.
import { Quaternion, Vector3 } from 'three';
import { EYE_HEIGHT, MAX_PITCH_DEGREES } from '../data/movement';
import { upOf } from '../physics/surfaceFrame';

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
