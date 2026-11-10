// La boca del cielo del Archivo de las Puertas a la vista (plan de historia y puzzles físicos, T11): el mismo velo en
// espiral de los anillos de las Puertas, pero grande (cabe la nave), colgado del mundo en lo alto y siempre de cara a
// quien mira. Cerca de ella la imagen se deforma igual que junto a un anillo, a su escala. Qué boca es y cuándo se
// cruza, en game/skyMouth.ts.
import { Vector3, type Object3D } from 'three';
import { proximity } from '../game/gateWormhole';
import { SKY_MOUTH } from '../game/skyMouth';
import { createWormholeMesh } from './gateWormholeView';

/** El hueco del velo base mide esto (m): se escala hasta el radio de la boca del cielo. */
const BASE_OPENING = 1.38;
const SCALE = SKY_MOUTH.radius / BASE_OPENING;

export interface SkyMouthView {
  /** La abre en `center` (marco del mundo). */
  open(center: Vector3): void;
  readonly isOpen: boolean;
  /** Dónde está (en el marco del mundo). */
  readonly center: Vector3;
  /** Dónde está ahora (en la escena): con la nave en el espacio abierto, el marco del mundo ya no vale. */
  worldCenter(target: Vector3): Vector3;
  /** Una vez por fotograma: `eye`, dónde está quien mira (en la escena); devuelve cuánto afecta (0–1). */
  update(eye: Vector3, time: number): number;
  close(): void;
  dispose(): void;
}

export function createSkyMouthView(world: Object3D): SkyMouthView {
  const mesh = createWormholeMesh();
  mesh.root.name = 'Boca del cielo';
  mesh.root.scale.setScalar(SCALE);
  mesh.root.visible = false;
  world.add(mesh.root);
  const center = new Vector3();
  const here = new Vector3();
  let open = false;
  return {
    open(at) {
      center.copy(at);
      mesh.root.position.copy(at);
      mesh.root.visible = true;
      open = true;
    },
    get isOpen() {
      return open;
    },
    center,
    worldCenter(target) {
      return mesh.root.getWorldPosition(target);
    },
    update(eye, time) {
      if (!open) return 0;
      mesh.time.value = time;
      mesh.root.lookAt(eye); // siempre de cara (lookAt sabe del marco del padre)
      mesh.root.getWorldPosition(here);
      return proximity(here.distanceTo(eye) / SCALE);
    },
    close() {
      open = false;
      mesh.root.visible = false;
    },
    dispose() {
      mesh.dispose();
    },
  };
}
