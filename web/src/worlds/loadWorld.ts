// Carga el glTF de un mundo exportado desde Blender y lee sus datos y marcas.
import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { collectMarkers, readWorldInfo, type WorldInfo, type WorldMarkers } from './markers';

export interface LoadedWorld {
  scene: Group;
  info: WorldInfo;
  markers: WorldMarkers;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export function worldUrl(worldId: string): string {
  return `${import.meta.env.BASE_URL}models/${worldId}.glb`;
}

export async function loadWorld(worldId: string): Promise<LoadedWorld> {
  const gltf = await loader.loadAsync(worldUrl(worldId));
  const scene = gltf.scene;
  return { scene, info: readWorldInfo(scene, worldId), markers: collectMarkers(scene) };
}
