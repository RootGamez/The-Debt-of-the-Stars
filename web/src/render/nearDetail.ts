// Detalle que solo se dibuja de cerca (Fase 11H). Con todos los mundos en el cielo, Cicatriz se pintaba entera
// desde cualquier sitio y pesaba mucho:
// - `userData.near_only`: lo de dentro (la cara interior, la máquina, los haces), que no se ve desde fuera; solo
//   se muestra cuando el marco de quien mira es su mundo.
// - `userData.far_hidden`: el detalle de fuera (estructuras, rocas del anillo); se muestra en su marco o a menos
//   de FAR_DETAIL_RADII radios del mundo. De lejos queda la cáscara y el velo del anillo.
import { Vector3, type Object3D } from 'three';
import type { WorldRuntime } from '../worlds/worldRuntime';

export const NEAR_ONLY = 'near_only';
export const FAR_HIDDEN = 'far_hidden';
/** A cuántos radios del mundo aparece su detalle de fuera. */
export const FAR_DETAIL_RADII = 8;

export interface NearDetail {
  /** Una vez por fotograma: el mundo en cuyo marco se está (o ninguno) y la cámara (en coordenadas de escena). */
  update(frame: string | undefined, camera: Vector3): void;
}

interface WorldDetail {
  root: Object3D;
  reach: number;
  inside: Object3D[];
  outside: Object3D[];
  insideShown: boolean | undefined;
  outsideShown: boolean | undefined;
}

function collect(runtime: WorldRuntime): WorldDetail | undefined {
  const inside: Object3D[] = [];
  const outside: Object3D[] = [];
  runtime.world.scene.traverse((o) => {
    if (o.userData[NEAR_ONLY] === true) inside.push(o);
    else if (o.userData[FAR_HIDDEN] === true) outside.push(o);
  });
  if (inside.length === 0 && outside.length === 0) return undefined;
  return {
    root: runtime.world.scene,
    reach: runtime.well.radius * FAR_DETAIL_RADII,
    inside,
    outside,
    insideShown: undefined,
    outsideShown: undefined,
  };
}

function show(objects: readonly Object3D[], visible: boolean): void {
  for (const o of objects) o.visible = visible;
}

export function createNearDetail(runtimes: ReadonlyMap<string, WorldRuntime>): NearDetail {
  const worlds = new Map<string, WorldDetail>();
  for (const [id, runtime] of runtimes) {
    const detail = collect(runtime);
    if (detail) worlds.set(id, detail);
  }
  const center = new Vector3();
  return {
    update(frame, camera) {
      for (const [id, w] of worlds) {
        const here = id === frame;
        const near = here || w.root.getWorldPosition(center).distanceTo(camera) < w.reach;
        if (w.insideShown !== here) show(w.inside, (w.insideShown = here));
        if (w.outsideShown !== near) show(w.outside, (w.outsideShown = near));
      }
    },
  };
}
