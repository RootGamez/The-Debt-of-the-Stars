// El Contrapeso a la vista (Fase 10): el modelo por código (worlds/procedural/contrapeso.ts), sobre su Banco del
// Laboratorio, en tus brazos (abajo en la vista), sobre la mesa de carga de la nave mientras pilotas, en la cuna de la
// Sala del Motor y, con el pulso, subiendo al núcleo. Sus tres anillos giran siempre: es un reloj. La lógica de dónde
// está vive en game/counterweight.ts.
import {
  Euler,
  Quaternion,
  Vector3,
  type Camera,
  type Group,
  type Object3D,
  type Scene,
} from 'three';
import { blendPose, ease, placeAt, type Anchor } from './poseTween';

export interface CounterweightModel {
  object: Group;
  /** Los anillos que giran (sobre su eje vertical) y a qué velocidad (rad/s). */
  rings: { object: Object3D; spin: number }[];
}

/** Dónde se ve: en un sitio (el Banco, la cuna, el núcleo), en brazos o guardado en la nave (sobre su mesa de carga). */
export type CounterweightShown = 'bench' | 'cradle' | 'core' | 'held' | 'stowed';
type Place = 'bench' | 'cradle' | 'core';

/** Los sitios donde puede estar; la cuna y el núcleo, solo si está Cicatriz. */
export type CounterweightAnchors = { bench: Anchor } & Partial<Record<'cradle' | 'core', Anchor>>;

export interface CounterweightView {
  update(shown: CounterweightShown, camera: Camera, dt: number): void;
  dispose(): void;
}

/**
 * En brazos: abajo y delante de los ojos (ejes de la cámara), más pequeño y algo inclinado hacia ti; por encima
 * del reloj del tablero y sin tapar el centro de la vista.
 */
const HELD_OFFSET = new Vector3(0, -0.3, -0.95);
const HELD_SCALE = 0.6;
const HELD_TILT = new Quaternion().setFromEuler(new Euler(0.12, 0, 0));
/** Sobre la mesa de carga de la nave, del mismo tamaño que en brazos. */
const STOWED_SCALE = HELD_SCALE;
/** Lo que tarda en subir de la cuna al núcleo: lo que dura el pulso (cronologia.json). */
export const RISE_SECONDS = 6;

export function createCounterweightView(
  model: CounterweightModel,
  scene: Scene,
  anchors: CounterweightAnchors,
  /** La mesa de carga de la nave (Fase 11): ahí se ve mientras pilotas. Sin ella, guardado no se ve. */
  stowage?: Object3D,
): CounterweightView {
  const { object, rings } = model;
  let placed: Place | undefined;
  /** De la cuna al núcleo: cuánto lleva subido (0–1), o undefined si no sube. */
  let rising: number | undefined;

  function hold(camera: Camera): void {
    // La cámara no cuelga de la escena: se copia su pose (coordenadas de la escena).
    if (object.parent !== scene) scene.add(object);
    object.position.copy(HELD_OFFSET).applyQuaternion(camera.quaternion).add(camera.position);
    object.quaternion.copy(camera.quaternion).multiply(HELD_TILT);
    object.scale.setScalar(HELD_SCALE);
    placed = undefined;
  }

  function rest(place: Place, dt: number): void {
    const anchor = anchors[place];
    object.visible = anchor !== undefined;
    if (!anchor) return;
    const { cradle } = anchors;
    if (place !== placed) {
      // Sube de la cuna al núcleo si los dos están en el mismo mundo; si no, aparece allí.
      const rises = placed === 'cradle' && place === 'core' && cradle?.parent === anchor.parent;
      rising = rises ? 0 : undefined;
      placed = place;
      placeAt(object, rises ? cradle : anchor);
    }
    if (rising !== undefined && cradle) {
      rising = Math.min(1, rising + dt / RISE_SECONDS);
      blendPose(object, cradle.pose, anchor.pose, ease(rising));
      if (rising >= 1) rising = undefined;
    }
  }

  function stow(): void {
    placed = undefined;
    if (!stowage || object.parent === stowage) return;
    stowage.add(object);
    object.position.set(0, 0, 0);
    object.quaternion.identity();
    object.scale.setScalar(STOWED_SCALE);
  }

  return {
    update(shown, camera, dt) {
      object.visible = shown !== 'stowed' || stowage !== undefined;
      for (const ring of rings) ring.object.rotateY(ring.spin * dt);
      if (shown === 'held') hold(camera);
      else if (shown === 'stowed') stow();
      else rest(shown, dt);
    },
    dispose() {
      object.removeFromParent();
    },
  };
}
