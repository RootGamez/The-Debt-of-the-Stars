// El Albatros II por código (Fase 11, docs/plan-fase-11-nave.md): sustituye a la nave de Blender (nave.glb). Junta
// el casco (albatrosHull.ts) y la sala (albatrosInterior.ts) en pocas mallas con vertex colors, el cristal aparte
// (semitransparente, por las dos caras), una llama por tobera (thrusters.ts) y la colisión para andar por ella
// posada. Ejes de la nave: +X estribor, +Y arriba, −Z proa.
import {
  AdditiveBlending,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBvhWorld, type BvhWorld } from '../../physics/bvhWorld';
import {
  colliderMesh,
  cone,
  PieceSet,
  piecesToMeshes,
  triangleCount,
  type PieceKind,
} from '../../worlds/procedural/kit';
import type { ShipHull } from '../ship';
import type { Station } from '../stations';
import { THRUSTERS } from '../thrusters';
import { buildHull, nozzleExit } from './albatrosHull';
import { buildInterior, type InteriorParts } from './albatrosInterior';
import { ALBATROS_HULL, SEAT_EYE, STAND_SPOT, STATIONS } from './albatrosShape';

export interface ShipModel {
  object: Group;
  hull: ShipHull;
  /** Ojos del piloto sentado (ejes de la nave). */
  seatEye: Vector3;
  /** Pies de quien se levanta del asiento (ejes de la nave). */
  standSpot: Vector3;
  stations: readonly Station[];
  /** Colisión de la nave en sus ejes: casco, sala, muebles y la escalerilla bajada. */
  interior: BvhWorld;
  /** El cristal de la cúpula y del ventanal. */
  glass: Mesh;
  /** Una llama por tobera, en el orden de THRUSTERS: su escala Z es lo largo de la llama. */
  flames: readonly Object3D[];
  parts: InteriorParts;
  triangles: number;
}

const SEED = 41;
/** Largo de la llama a pleno (m) según el tipo de tobera, y su anchura en la boca. */
const FLAME = {
  main: [2.2, 0.28],
  retro: [1.1, 0.13],
  lift: [1.4, 0.18],
  rcs: [0.7, 0.07],
} as const;

function materials(): Record<PieceKind, Material> {
  return {
    stone: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }),
    metal: new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.4,
      metalness: 0.5,
    }),
    light: new MeshBasicMaterial({ vertexColors: true }),
  };
}

function glassMesh(parts: BufferGeometry[]): Mesh {
  const mesh = new Mesh(
    mergeGeometries(parts),
    new MeshStandardMaterial({
      color: 0xbfe8ef,
      transparent: true,
      opacity: 0.18,
      roughness: 0.05,
      metalness: 0.1,
      side: DoubleSide,
      // No escribe profundidad: desde fuera se ve la sala y desde dentro, el cielo.
      depthWrite: false,
    }),
  );
  mesh.name = 'nave_Cristal';
  mesh.renderOrder = 1;
  return mesh;
}

/** Las llamas: un cono por tobera que sale de su boca hacia atrás de su empuje; empiezan apagadas. */
function flames(parent: Group): Object3D[] {
  const material = new MeshBasicMaterial({
    color: 0xffb066,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  // Cono con la base en el origen y la punta en +Z (largo 1).
  const geometry = cone(1, 0, 8).clone().translate(0, 0, 0.5);
  const forward = new Vector3(0, 0, 1);
  return THRUSTERS.map((thruster) => {
    const [length, width] = FLAME[thruster.group];
    const flame = new Mesh(geometry, material);
    flame.name = `nave_Llama_${thruster.id}`;
    flame.position.set(...nozzleExit(thruster));
    flame.quaternion.copy(
      new Quaternion().setFromUnitVectors(forward, thruster.direction.clone().negate()),
    );
    flame.scale.set(width, width, length);
    flame.userData.fullLength = length;
    flame.visible = false;
    flame.renderOrder = 2;
    parent.add(flame);
    return flame;
  });
}

export function buildAlbatros(): ShipModel {
  const object = new Group();
  object.name = 'Nave';
  const shared = materials();
  const pieces = new PieceSet(SEED);
  const glass: BufferGeometry[] = [];
  let triangles = 0;
  const make = (name: string, fill: (set: PieceSet) => void): Group => {
    const set = new PieceSet(SEED + name.length);
    fill(set);
    const group = new Group();
    group.name = name;
    for (const mesh of piecesToMeshes(set, shared, name)) {
      triangles += triangleCount(mesh.geometry);
      group.add(mesh);
    }
    return group;
  };

  buildHull(pieces, glass);
  const parts = buildInterior(pieces, make, object);
  for (const mesh of piecesToMeshes(pieces, shared, 'nave')) {
    triangles += triangleCount(mesh.geometry);
    object.add(mesh);
  }
  const glassPart = glassMesh(glass);
  triangles += triangleCount(glassPart.geometry);
  object.add(glassPart);
  const flameObjects = flames(object);

  return {
    object,
    hull: ALBATROS_HULL,
    seatEye: SEAT_EYE.clone(),
    standSpot: STAND_SPOT.clone(),
    stations: STATIONS,
    interior: createBvhWorld([colliderMesh('COL_nave', pieces.colliders)]),
    glass: glassPart,
    flames: flameObjects,
    parts,
    triangles,
  };
}
