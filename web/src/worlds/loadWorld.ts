// Carga un mundo y lee sus datos y marcas. Desde la Fase 11 todos se construyen por código (`procedural/`), con la
// misma forma de escena que tenían los .glb exportados de Blender: ya no se descarga ningún modelo.
import { Points, type Group, type Material, type Object3D } from 'three';
import {
  collectMarkers,
  isMesh,
  readWorldInfo,
  WorldDataError,
  type WorldInfo,
  type WorldMarkers,
} from './markers';
import { buildProceduralScene } from './procedural';

export interface LoadedWorld {
  scene: Group;
  info: WorldInfo;
  markers: WorldMarkers;
}

/** El mundo construido por código, o `undefined` si no hay constructor para ese id. */
export function buildWorld(worldId: string): LoadedWorld | undefined {
  const scene = buildProceduralScene(worldId);
  if (!scene) return undefined;
  return { scene, info: readWorldInfo(scene, worldId), markers: collectMarkers(scene) };
}

/** El mundo `worldId`, construido por código; falla si no existe. */
export function loadWorld(worldId: string): LoadedWorld {
  const built = buildWorld(worldId);
  if (!built) throw new WorldDataError(`No hay ningún mundo llamado «${worldId}»`);
  return built;
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      (value as { dispose(): void }).dispose();
    }
  }
  material.dispose();
}

function isPoints(object: Object3D): object is Points {
  return object instanceof Points;
}

/** Libera geometrías, materiales y texturas de la GPU al cambiar de mundo. */
export function disposeWorld(scene: Object3D): void {
  scene.traverse((object) => {
    // Las mallas y las motas de polvo de los mundos con viento (Points).
    if (!isMesh(object) && !isPoints(object)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(disposeMaterial);
  });
}
