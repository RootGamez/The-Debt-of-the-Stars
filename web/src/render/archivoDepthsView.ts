// La cisterna y los péndulos del fondo del Archivo a la vista (plan de historia y puzzles físicos, T7): el agua que sube
// con cada bloque, la barcaza de piedra pómez que la sigue, los montones de bloques y tablones, lo que llevas en las
// manos, y los cinco péndulos colgados de la viga, con el largo y el vaivén que les da game/depthsPlay.ts. Todo
// cuelga de marcas del Archivo (sus ejes son los del suelo de la Galería, Z arriba).
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Camera,
  type Object3D,
  type Scene,
} from 'three';
import type { Cargo } from '../puzzles/cistern';
import { CISTERN, supplyOf } from '../puzzles/cistern';
import { PENDULUMS } from '../puzzles/pendulums';
import {
  BASIN,
  BEAM,
  BLOCK_SIZE,
  ROD_PER_NOTCH,
  waterHeight,
} from '../worlds/procedural/archivoDepthsShape';

const CARGOS: readonly Cargo[] = ['b1', 'b2', 'b3', 'wood'];
const HELD_OFFSET = new Vector3(0.18, -0.3, -0.7);
const HELD_TILT = new Quaternion().setFromEuler(new Euler(0.1, 0, 0));
/** Cuánto se inclina un péndulo en lo más alto de su vaivén (rad). */
const SWING_AMPLITUDE = 0.5;
/** Lo que se hunde el montón bajo su marca (m) y la altura de la base de piedra. */
const PILE_BASE = 0.36;
const PILE_MARK = 1.0;
/** La marca de la cisterna sobre el suelo de la pila. */
const BASIN_MARK = BASIN.height + 0.6;
/** La marca de cada péndulo sobre el suelo y hasta qué punto está bajo la viga. */
const PENDULUM_MARK = { y: BEAM.y - 0.45, z: 1.7 } as const;

function stone(size: number): Mesh {
  return new Mesh(
    new BoxGeometry(size, size, size),
    new MeshStandardMaterial({ color: new Color('#8C8F84'), roughness: 0.95, flatShading: true }),
  );
}

function cargoModel(cargo: Cargo): Mesh {
  if (cargo === 'wood') {
    return new Mesh(
      new BoxGeometry(0.7, 0.14, 0.05),
      new MeshStandardMaterial({ color: new Color('#B8885A'), roughness: 0.9 }),
    );
  }
  return stone(BLOCK_SIZE[cargo]);
}

export interface DepthsAnchors {
  cistern: Object3D;
  piles: Readonly<Record<Cargo, Object3D>>;
  /** Las cinco marcas de los péndulos, por orden. */
  pendulums: readonly Object3D[];
}

export interface DepthsShown {
  held: Cargo | undefined;
  /** El agua (partes de piedra). */
  level: number;
  remaining: Readonly<Record<Cargo, number>>;
  lengths: readonly number[];
  /** El ángulo (−1 a 1) de cada péndulo en este momento. */
  swings: readonly number[];
}

export interface DepthsView {
  update(shown: DepthsShown, camera: Camera): void;
  dispose(): void;
}

export function createDepthsView(scene: Scene, anchors: DepthsAnchors): DepthsView {
  // El agua y la barcaza dentro de la pila.
  const water = new Mesh(
    new CylinderGeometry(BASIN.radius - 0.05, BASIN.radius - 0.05, 1, 20).rotateX(Math.PI / 2),
    new MeshStandardMaterial({
      color: new Color('#3E8FB0'),
      emissive: new Color('#103848'),
      transparent: true,
      opacity: 0.8,
    }),
  );
  const barge = new Group();
  barge.add(
    new Mesh(
      new BoxGeometry(1.5, 1.1, 0.14),
      new MeshStandardMaterial({ color: new Color('#C9C0AE'), roughness: 1, flatShading: true }),
    ),
  );
  const records = new Mesh(
    new BoxGeometry(0.5, 0.35, 0.3),
    new MeshStandardMaterial({ color: new Color('#3D4A5A'), metalness: 0.4 }),
  );
  records.position.z = 0.2;
  barge.add(records);
  anchors.cistern.add(water, barge);

  const placeInBasin = (z: number): number => z - BASIN_MARK;

  // Los bloques de cada montón (hasta lo que había) y lo que llevas.
  const piles = new Map<Cargo, Mesh[]>();
  for (const cargo of CARGOS) {
    const meshes = Array.from({ length: supplyOf(cargo) }, () => cargoModel(cargo));
    meshes.forEach((mesh, index) => {
      const size = cargo === 'wood' ? 0.14 : BLOCK_SIZE[cargo];
      mesh.position.set(
        ((index % 3) - 1) * 0.32,
        0,
        -(PILE_MARK - PILE_BASE) + size / 2 + Math.floor(index / 3) * size,
      );
      anchors.piles[cargo].add(mesh);
    });
    piles.set(cargo, meshes);
  }
  const heldMeshes = new Map<Cargo, Mesh>(CARGOS.map((cargo) => [cargo, cargoModel(cargo)]));
  for (const mesh of heldMeshes.values()) {
    mesh.visible = false;
    scene.add(mesh);
  }

  // Los péndulos: una vara y una pesa por marca, que cuelgan de la viga.
  const pendulums = anchors.pendulums.map((anchor) => {
    const pivot = new Group();
    pivot.position.set(0, BEAM.y - PENDULUM_MARK.y, BEAM.z - PENDULUM_MARK.z);
    const rod = new Mesh(
      new BoxGeometry(0.03, 0.03, 1),
      new MeshStandardMaterial({ color: new Color('#B87333'), metalness: 0.7, roughness: 0.4 }),
    );
    const bob = new Mesh(
      new SphereGeometry(0.13, 12, 8),
      new MeshStandardMaterial({ color: new Color('#D4B565'), metalness: 0.7, roughness: 0.35 }),
    );
    pivot.add(rod, bob);
    anchor.add(pivot);
    return { pivot, rod, bob };
  });

  return {
    update(shown, camera) {
      const top = waterHeight(shown.level);
      water.scale.z = top;
      water.position.z = placeInBasin(0.16 + top / 2);
      barge.position.z = placeInBasin(0.16 + top + 0.07);
      const full = shown.level >= CISTERN.full;
      barge.rotation.z = full ? 0.05 : 0;

      for (const cargo of CARGOS) {
        const left = shown.remaining[cargo];
        piles.get(cargo)?.forEach((mesh, index) => {
          mesh.visible = index < left;
        });
        const held = heldMeshes.get(cargo);
        if (!held) continue;
        held.visible = shown.held === cargo;
        if (held.visible) {
          // La cámara no cuelga de la escena: se copia su pose (coordenadas de la escena).
          held.position.copy(HELD_OFFSET).applyQuaternion(camera.quaternion).add(camera.position);
          held.quaternion.copy(camera.quaternion).multiply(HELD_TILT);
        }
      }

      pendulums.forEach(({ pivot, rod, bob }, index) => {
        const length = (shown.lengths[index] ?? PENDULUMS.start[0] ?? 3) * ROD_PER_NOTCH;
        rod.scale.z = length;
        rod.position.z = -length / 2;
        bob.position.z = -length;
        pivot.rotation.x = (shown.swings[index] ?? 0) * SWING_AMPLITUDE;
      });
    },
    dispose() {
      water.removeFromParent();
      barge.removeFromParent();
      for (const meshes of piles.values()) for (const mesh of meshes) mesh.removeFromParent();
      for (const mesh of heldMeshes.values()) mesh.removeFromParent();
      for (const { pivot } of pendulums) pivot.removeFromParent();
    },
  };
}
