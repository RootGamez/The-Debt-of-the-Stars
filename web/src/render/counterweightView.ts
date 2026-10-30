// El Contrapeso a la vista (Fase 10): el modelo de Blender (public/models/contrapeso.glb), sobre su Banco del
// Laboratorio, en tus brazos (abajo en la vista), guardado en el relicario de la nave (no se ve), en la cuna de la
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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { WorldDataError } from '../worlds/markers';
import { blendPose, ease, placeAt, type Anchor } from './poseTween';

export interface CounterweightModel {
  object: Group;
  /** Los anillos que giran (sobre su eje vertical) y a qué velocidad (rad/s). */
  rings: { object: Object3D; spin: number }[];
}

/** Dónde se ve: en un sitio (el Banco, la cuna, el núcleo), en brazos o en ningún lado (en el relicario). */
export type CounterweightShown = 'bench' | 'cradle' | 'core' | 'held' | 'stowed';
type Place = 'bench' | 'cradle' | 'core';

/** Los sitios donde puede estar; la cuna y el núcleo, solo si está Cicatriz. */
export type CounterweightAnchors = { bench: Anchor } & Partial<Record<'cradle' | 'core', Anchor>>;

export interface CounterweightView {
  update(shown: CounterweightShown, camera: Camera, dt: number): void;
  dispose(): void;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const RING_PREFIX = 'contrapeso_Anillo';

/**
 * En brazos: abajo y delante de los ojos (ejes de la cámara), más pequeño y algo inclinado hacia ti; por encima
 * del reloj del tablero y sin tapar el centro de la vista.
 */
const HELD_OFFSET = new Vector3(0, -0.3, -0.95);
const HELD_SCALE = 0.6;
const HELD_TILT = new Quaternion().setFromEuler(new Euler(0.12, 0, 0));
/** Lo que tarda en subir de la cuna al núcleo: lo que dura el pulso (cronologia.json). */
export const RISE_SECONDS = 6;

export function counterweightModelUrl(): string {
  return `${import.meta.env.BASE_URL}models/contrapeso.glb`;
}

export async function parseCounterweightModel(data: ArrayBuffer): Promise<CounterweightModel> {
  const gltf = await loader.parseAsync(data, '');
  const object = gltf.scene;
  object.name = 'Contrapeso';
  const rings: CounterweightModel['rings'] = [];
  object.traverse((child) => {
    if (!child.name.startsWith(RING_PREFIX)) return;
    const spin: unknown = child.userData.spin;
    if (typeof spin !== 'number' || !Number.isFinite(spin)) {
      throw new WorldDataError(`contrapeso.glb: ${child.name} necesita "spin" (rad/s)`);
    }
    rings.push({ object: child, spin });
  });
  if (rings.length === 0) throw new WorldDataError('contrapeso.glb: faltan los anillos');
  return { object, rings };
}

export async function loadCounterweightModel(): Promise<CounterweightModel> {
  const url = counterweightModelUrl();
  const response = await fetch(url);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || type.includes('text/html')) {
    throw new WorldDataError(`No se pudo cargar el Contrapeso: ${url} (${response.status})`);
  }
  return parseCounterweightModel(await response.arrayBuffer());
}

export function createCounterweightView(
  model: CounterweightModel,
  scene: Scene,
  anchors: CounterweightAnchors,
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

  return {
    update(shown, camera, dt) {
      object.visible = shown !== 'stowed';
      for (const ring of rings) ring.object.rotateY(ring.spin * dt);
      if (shown === 'held') hold(camera);
      else if (shown === 'stowed') placed = undefined;
      else rest(shown, dt);
    },
    dispose() {
      object.removeFromParent();
    },
  };
}
