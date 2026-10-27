// Carga la nave exportada de Blender (public/models/nave.glb) y lee sus marcas: el asiento (los ojos del
// piloto), la escotilla (donde se pisa al bajar), el radio de colisión y las piezas que brillan.
import { Vector3, type Group, type Material, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { isMesh, WorldDataError } from '../worlds/markers';

export interface LoadedShipModel {
  object: Group;
  /** Ojos del piloto respecto al centro de la nave (ejes de la nave). */
  seatOffset: Vector3;
  /** Donde pisa el suelo al bajar, con la nave posada (ejes de la nave). */
  exitOffset: Vector3;
  /** La nave colisiona como una esfera de este radio; las patas llegan justo hasta él. */
  radius: number;
  /** Toberas y farol (material emisivo propio): se avivan con el empuje. */
  engine: Mesh | undefined;
  /** La burbuja de cristal, semitransparente y visible por las dos caras. */
  glass: Mesh | undefined;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export function shipModelUrl(): string {
  return `${import.meta.env.BASE_URL}models/nave.glb`;
}

function required(object: Group, name: string): Vector3 {
  const node = object.getObjectByName(name);
  if (!node) throw new WorldDataError(`nave.glb: falta la marca ${name}`);
  return node.position.clone();
}

export async function parseShipModel(data: ArrayBuffer): Promise<LoadedShipModel> {
  const gltf = await loader.parseAsync(data, '');
  const object = gltf.scene;
  object.name = 'Nave';
  object.updateMatrixWorld(true);

  const radius: unknown = object.getObjectByName('nave')?.userData.collision_radius;
  if (typeof radius !== 'number' || !(radius > 0)) {
    throw new WorldDataError('nave.glb: la raíz "nave" necesita collision_radius > 0');
  }
  const engineNode = object.getObjectByName('nave_Motor');
  const glassNode = object.getObjectByName('nave_Cristal');
  const glass = glassNode && isMesh(glassNode) ? glassNode : undefined;
  if (glass) {
    // No escribe profundidad: la cabina se ve a través desde fuera y el cielo desde dentro.
    const materials: Material[] = Array.isArray(glass.material) ? glass.material : [glass.material];
    for (const material of materials) material.depthWrite = false;
    glass.renderOrder = 1;
  }
  return {
    object,
    seatOffset: required(object, 'SEAT_Piloto'),
    exitOffset: required(object, 'EXIT_Escotilla'),
    radius,
    engine: engineNode && isMesh(engineNode) ? engineNode : undefined,
    glass,
  };
}

export async function loadShipModel(): Promise<LoadedShipModel> {
  const url = shipModelUrl();
  const response = await fetch(url);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || type.includes('text/html')) {
    throw new WorldDataError(`No se pudo cargar el modelo de la nave: ${url} (${response.status})`);
  }
  return parseShipModel(await response.arrayBuffer());
}
