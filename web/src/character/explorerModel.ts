// El explorador montado: un hueso rígido por articulación (sin piel, como un muñeco articulado) con sus mallas
// por material. Mide lo que un Ool adulto (✅ Anthony 2026-11-03). El grupo raíz tiene los pies en el origen,
// Y arriba y el frente hacia −Z, como el cuerpo del jugador (physics/characterMotor.ts).
import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { oolLook } from '../worlds/procedural/ool';
import type { Triple } from '../worlds/procedural/kit';
import {
  buildFoot,
  buildForearm,
  buildHand,
  buildPelvis,
  buildShin,
  buildThigh,
  buildTorso,
  buildUpperArm,
  JOINTS,
  sided,
} from './explorerBody';
import { buildHead, buildHelmet, buildPack } from './explorerGear';
import { PART_KINDS, Segment } from './explorerParts';
import type { BodyPose } from './gait';

/** ✅ Joven pero ya de talla adulta (oolLook: el tamaño llega a 1 en 0,3): verde agua claro y mucha luz. */
export const EXPLORER_AGE = 0.3;
/** Lo que se mezcla la pose del cuerpo hacia un pie apoyado por paso (los pies se quedan en el suelo). */
const PLANT_RATE = 1;

const DESIGN_TO_BODY = new Matrix4().makeRotationX(-Math.PI / 2);
const toBody = (t: Triple): Vector3 => new Vector3(...t).applyMatrix4(DESIGN_TO_BODY);

export type BoneName =
  | 'pelvis'
  | 'torso'
  | 'head'
  | 'helmet'
  | 'pack'
  | 'upperArmL'
  | 'upperArmR'
  | 'forearmL'
  | 'forearmR'
  | 'handL'
  | 'handR'
  | 'thighL'
  | 'thighR'
  | 'shinL'
  | 'shinR'
  | 'footL'
  | 'footR';

interface BoneSpec {
  name: BoneName;
  parent: BoneName | undefined;
  pivot: Triple;
  build: (s: Segment) => void;
}

function boneSpecs(): BoneSpec[] {
  const look = oolLook(EXPLORER_AGE);
  const specs: BoneSpec[] = [
    { name: 'pelvis', parent: undefined, pivot: JOINTS.pelvis, build: buildPelvis },
    { name: 'torso', parent: 'pelvis', pivot: JOINTS.torso, build: buildTorso },
    {
      name: 'head',
      parent: 'torso',
      pivot: JOINTS.head,
      build: (s) => {
        buildHead(s, look);
      },
    },
    { name: 'helmet', parent: 'torso', pivot: JOINTS.head, build: buildHelmet },
    { name: 'pack', parent: 'torso', pivot: JOINTS.pack, build: buildPack },
  ];
  for (const [side, tag] of [
    [-1, 'L'],
    [1, 'R'],
  ] as const) {
    const at = (t: Triple): Triple => sided(t, side);
    specs.push(
      {
        name: `upperArm${tag}`,
        parent: 'torso',
        pivot: at(JOINTS.shoulder),
        build: (s) => {
          buildUpperArm(s, side);
        },
      },
      {
        name: `forearm${tag}`,
        parent: `upperArm${tag}`,
        pivot: at(JOINTS.elbow),
        build: (s) => {
          buildForearm(s, side);
        },
      },
      {
        name: `hand${tag}`,
        parent: `forearm${tag}`,
        pivot: at(JOINTS.wrist),
        build: (s) => {
          buildHand(s, side);
        },
      },
      {
        name: `thigh${tag}`,
        parent: 'pelvis',
        pivot: at(JOINTS.hip),
        build: (s) => {
          buildThigh(s, side);
        },
      },
      {
        name: `shin${tag}`,
        parent: `thigh${tag}`,
        pivot: at(JOINTS.knee),
        build: (s) => {
          buildShin(s, side);
        },
      },
      {
        name: `foot${tag}`,
        parent: `shin${tag}`,
        pivot: at(JOINTS.ankle),
        build: (s) => {
          buildFoot(s, side);
        },
      },
    );
  }
  return specs;
}

export interface ExplorerMaterials {
  suit: MeshStandardMaterial;
  metal: MeshStandardMaterial;
  glow: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  shine: MeshBasicMaterial;
}

function createMaterials(): ExplorerMaterials {
  const look = oolLook(EXPLORER_AGE);
  return {
    suit: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
    metal: new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.4,
      metalness: 0.35,
    }),
    glow: new MeshStandardMaterial({
      vertexColors: true,
      emissive: look.glow,
      emissiveIntensity: look.glowIntensity,
      roughness: 0.6,
    }),
    glass: new MeshStandardMaterial({
      color: '#dff4ff',
      transparent: true,
      opacity: 0.14,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false,
    }),
    shine: new MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  };
}

export interface ExplorerRig {
  root: Group;
  bones: Record<BoneName, Group>;
  materials: ExplorerMaterials;
  /** Triángulos de todo el modelo. */
  triangles: number;
  /** Pone el cuerpo en una pose; `plant` (0–1) baja o sube la pelvis para que el pie más bajo pise el suelo. */
  setPose(pose: BodyPose, plant: number): void;
  /** En primera persona no se ven la cabeza ni el casco (la cámara está dentro). */
  setFirstPerson(on: boolean): void;
  dispose(): void;
}

function boneGroup(spec: BoneSpec, materials: ExplorerMaterials, parentPivot: Triple): Group {
  const segment = new Segment(spec.name.length * 31 + 7);
  spec.build(segment);
  const group = new Group();
  group.name = `EXPLORADOR_${spec.name}`;
  group.position.copy(toBody(spec.pivot).sub(toBody(parentPivot)));
  const toLocal = new Matrix4()
    .makeTranslation(-spec.pivot[0], -spec.pivot[1], -spec.pivot[2])
    .premultiply(DESIGN_TO_BODY);
  for (const kind of PART_KINDS) {
    const parts = segment.parts[kind];
    if (parts.length === 0) continue;
    const geometry = mergeGeometries(
      parts.map((g) => (kind === 'glass' || kind === 'shine' ? stripColor(g) : g)),
    );
    geometry.applyMatrix4(toLocal);
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, materials[kind]);
    mesh.name = `${group.name}_${kind}`;
    mesh.renderOrder = kind === 'glass' || kind === 'shine' ? 2 : 0;
    group.add(mesh);
  }
  return group;
}

/** El cristal y los reflejos van de un solo color: sin colores por vértice (no todos los trozos los tienen). */
function stripColor<T extends { deleteAttribute(name: string): unknown }>(g: T): T {
  g.deleteAttribute('color');
  return g;
}

export function buildExplorer(): ExplorerRig {
  const materials = createMaterials();
  const root = new Group();
  root.name = 'EXPLORADOR';
  const bones = {} as Record<BoneName, Group>;
  const pivots = {} as Record<BoneName, Triple>;
  for (const spec of boneSpecs()) {
    const parentPivot: Triple = spec.parent ? pivots[spec.parent] : [0, 0, 0];
    const group = boneGroup(spec, materials, parentPivot);
    bones[spec.name] = group;
    pivots[spec.name] = spec.pivot;
    (spec.parent ? bones[spec.parent] : root).add(group);
  }
  let triangles = 0;
  root.traverse((o) => {
    if (o instanceof Mesh) triangles += (o as Mesh).geometry.getAttribute('position').count / 3;
  });
  const pelvisRest = bones.pelvis.position.clone();
  const torsoMeshes = bones.torso.children.filter((c): c is Mesh => c instanceof Mesh);
  const ankleRest = toBody(JOINTS.ankle).y;
  const ankle = new Vector3();
  const inverse = new Matrix4();
  // Izquierda (k = 0, lado −1) y derecha (k = 1, lado +1), con sus huesos a mano.
  const limbs = (['L', 'R'] as const).map((tag, k) => ({
    k: k as 0 | 1,
    side: k === 0 ? -1 : 1,
    upperArm: bones[`upperArm${tag}`],
    forearm: bones[`forearm${tag}`],
    hand: bones[`hand${tag}`],
    thigh: bones[`thigh${tag}`],
    shin: bones[`shin${tag}`],
    foot: bones[`foot${tag}`],
  }));

  function lowestAnkle(): number {
    root.updateMatrixWorld(true);
    inverse.copy(root.matrixWorld).invert();
    const left = ankle.setFromMatrixPosition(bones.footL.matrixWorld).applyMatrix4(inverse).y;
    const right = ankle.setFromMatrixPosition(bones.footR.matrixWorld).applyMatrix4(inverse).y;
    return Math.min(left, right);
  }

  return {
    root,
    bones,
    materials,
    triangles,
    setPose(pose, plant) {
      bones.pelvis.position.set(pelvisRest.x + pose.sway, pelvisRest.y + pose.bob, pelvisRest.z);
      bones.pelvis.rotation.set(0, pose.pelvisYaw, pose.pelvisRoll, 'YXZ');
      bones.torso.rotation.set(pose.torsoPitch, pose.torsoYaw, pose.torsoRoll);
      for (const mesh of torsoMeshes)
        mesh.scale.set(1 + pose.breath * 0.6, 1 + pose.breath, 1 + pose.breath * 0.8);
      bones.head.rotation.set(pose.headPitch, 0, 0);
      bones.pack.rotation.set(pose.pack * 0.3, 0, 0);
      for (const limb of limbs) {
        const arm = pose.arms[limb.k];
        const leg = pose.legs[limb.k];
        limb.upperArm.rotation.set(arm.shoulder, 0, limb.side * arm.shoulderRoll);
        limb.forearm.rotation.set(arm.elbow, 0, 0);
        limb.hand.rotation.set(arm.wrist, 0, 0);
        limb.thigh.rotation.set(leg.hip, 0, limb.side * leg.hipRoll - pose.pelvisRoll);
        limb.shin.rotation.set(-leg.knee, 0, 0);
        limb.foot.rotation.set(leg.ankle, 0, 0);
      }
      if (plant > 0) {
        bones.pelvis.position.y += (ankleRest - lowestAnkle()) * Math.min(1, plant * PLANT_RATE);
      }
    },
    setFirstPerson(on) {
      bones.head.visible = !on;
      bones.helmet.visible = !on;
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof Mesh) (o as Mesh).geometry.dispose();
      });
      for (const material of Object.values(materials) as Material[]) material.dispose();
    },
  };
}
