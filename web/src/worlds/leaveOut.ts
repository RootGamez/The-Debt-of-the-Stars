// Piezas de un mundo que no están en esta versión de él (Fase 10E: el Hogar de antes, sin los fragmentos que aún no
// han llegado). Se quitan antes de crear su runtime, y con ellas sus colisiones: un COL_ hijo de la pieza se va con
// ella. Saca las piezas de la escena del mundo recién cargado (que aún no cuelga de ningún pivote).
import type { Object3D } from 'three';
import type { LoadedWorld } from './loadWorld';

function isInside(object: Object3D, removed: readonly Object3D[]): boolean {
  for (let p: Object3D | null = object; p; p = p.parent) {
    if (removed.includes(p)) return true;
  }
  return false;
}

/** El mundo sin las piezas `names` (las que no tenga se ignoran: cada mundo tiene las suyas). */
export function leaveOut(world: LoadedWorld, names: readonly string[]): LoadedWorld {
  const removed = names.flatMap((name) => world.scene.getObjectByName(name) ?? []);
  if (removed.length === 0) return world;
  const colliders = world.markers.colliders.filter((mesh) => !isInside(mesh, removed));
  for (const object of removed) object.removeFromParent();
  return { ...world, markers: { ...world.markers, colliders } };
}
