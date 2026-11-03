// Carga un mundo y lee sus datos y marcas: construido por código (Fase 11, `procedural/`) o, mientras no se
// migre, desde el glTF exportado de Blender. Las dos vías dan la misma forma de escena.
import type { Group, Material, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
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

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export function worldUrl(worldId: string): string {
  return `${import.meta.env.BASE_URL}models/${worldId}.glb`;
}

/** Interpreta un .glb ya descargado (separado de la red para poder probarlo). */
export async function parseWorld(data: ArrayBuffer, worldId: string): Promise<LoadedWorld> {
  const gltf = await loader.parseAsync(data, '');
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  return { scene, info: readWorldInfo(scene, worldId), markers: collectMarkers(scene) };
}

/** El mundo construido por código, o `undefined` si ese mundo aún llega como .glb. */
export function buildWorld(worldId: string): LoadedWorld | undefined {
  const scene = buildProceduralScene(worldId);
  if (!scene) return undefined;
  return { scene, info: readWorldInfo(scene, worldId), markers: collectMarkers(scene) };
}

export async function loadWorld(worldId: string): Promise<LoadedWorld> {
  const built = buildWorld(worldId);
  if (built) return built;
  const url = worldUrl(worldId);
  const response = await fetch(url);
  // Vite devuelve index.html con 200 si el archivo no existe: comprobamos también el tipo.
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || type.includes('text/html')) {
    throw new WorldDataError(`No se encontró el modelo del mundo: ${url} (${response.status})`);
  }
  return parseWorld(await response.arrayBuffer(), worldId);
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      (value as { dispose(): void }).dispose();
    }
  }
  material.dispose();
}

/** Libera geometrías, materiales y texturas de la GPU al cambiar de mundo. */
export function disposeWorld(scene: Object3D): void {
  scene.traverse((object) => {
    if (!isMesh(object)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(disposeMaterial);
  });
}
