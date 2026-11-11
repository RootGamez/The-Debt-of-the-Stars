// Cámara en tercera persona (tecla V a pie): sigue la misma orientación que la primera persona (cuerpo + cabeceo),
// así el ratón apunta igual, pero se coloca detrás del hombro del explorador. Si hay una pared entre él y la cámara,
// se acerca para no atravesarla. La distancia se suaviza: se acerca deprisa (para no ver dentro de la pared) y se
// aleja despacio (para que no dé tirones al pasar junto a una esquina).
import { Quaternion, Vector3 } from 'three';
import type { RaycastWorld } from '../physics/collisionWorld';
import { rightOf, upOf } from '../physics/surfaceFrame';

/** Distancia ideal detrás del pivote (m). El explorador mide 1,45 m: a 3 m se ve entero y el entorno cabe. */
export const THIRD_PERSON_DISTANCE = 3;
/** Altura del pivote sobre los pies (m): hombros, un poco por debajo de los ojos. */
export const THIRD_PERSON_PIVOT_HEIGHT = 1.2;
/** Desplazamiento lateral del pivote (m, > 0 a la derecha): deja el punto de mira libre, junto al personaje. */
export const THIRD_PERSON_SHOULDER = 0.45;
/** Lo más cerca que se acerca la cámara al pivote (m). */
export const THIRD_PERSON_MIN_DISTANCE = 0.4;
/** Separación de la cámara respecto a la pared que la frena (m). */
const WALL_MARGIN = 0.25;
/** Velocidad con que se aleja la cámara (m/s); al acercarse es inmediata. */
const RECOVER_SPEED = 6;

const PITCH_AXIS = new Vector3(1, 0, 0);
const pitchRotation = new Quaternion();
const up = new Vector3();
const right = new Vector3();
const view = new Vector3();
const pivot = new Vector3();
const back = new Vector3();

/** Pivote alrededor del que gira la cámara: hombro derecho del explorador. */
export function thirdPersonPivot(body: Quaternion, feet: Vector3, out: Vector3): Vector3 {
  upOf(body, up);
  rightOf(body, right);
  return out
    .copy(feet)
    .addScaledVector(up, THIRD_PERSON_PIVOT_HEIGHT)
    .addScaledVector(right, THIRD_PERSON_SHOULDER);
}

/**
 * Distancia que cabe detrás del pivote: la ideal o, si hay una pared más cerca, hasta ella menos un margen (nunca
 * menos que `THIRD_PERSON_MIN_DISTANCE`).
 */
export function clearDistance(wallDistance: number | null, wanted = THIRD_PERSON_DISTANCE): number {
  if (wallDistance === null) return wanted;
  return Math.min(wanted, Math.max(THIRD_PERSON_MIN_DISTANCE, wallDistance - WALL_MARGIN));
}

/** Acerca de golpe y aleja poco a poco la distancia actual hacia la que cabe. */
export function easeDistance(current: number, clear: number, dt: number): number {
  if (clear <= current) return clear;
  return Math.min(clear, current + RECOVER_SPEED * dt);
}

/**
 * Calcula la pose de la cámara. `distance` es la distancia actual (ya suavizada); devuelve la distancia que cabe
 * este fotograma para que quien llama la suavice con `easeDistance`.
 */
export function thirdPersonPose(
  body: Quaternion,
  pitch: number,
  feet: Vector3,
  distance: number,
  world: RaycastWorld | undefined,
  targetPosition: Vector3,
  targetQuaternion: Quaternion,
): number {
  thirdPersonPivot(body, feet, pivot);
  pitchRotation.setFromAxisAngle(PITCH_AXIS, pitch);
  targetQuaternion.copy(body).multiply(pitchRotation);
  // La dirección de la vista (−Z local de la cámara) y su opuesta, hacia donde se retira la cámara.
  view.set(0, 0, -1).applyQuaternion(targetQuaternion);
  back.copy(view).negate();
  const wall = world ? world.raycast(pivot, back, THIRD_PERSON_DISTANCE + WALL_MARGIN) : null;
  const clear = clearDistance(wall);
  targetPosition.copy(pivot).addScaledVector(back, Math.min(distance, clear));
  return clear;
}
