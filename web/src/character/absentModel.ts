// Los dos Ausentes vivos montados (plan de finales, E3): un hueso rígido por articulación (como el explorador,
// explorerModel.ts) con una malla por material en cada hueso (las piezas se funden: pocas llamadas de dibujo). El
// grupo raíz tiene los pies en el origen, Y arriba y el frente hacia −Z, como el explorador. La pose (absentPoses.ts)
// mueve los huesos, enciende el signo y los dibujos y pone o quita la escarcha. Cada Ausente lleva sus propios
// materiales (absentMaterials.ts): se pueden congelar y encender por separado.
//
// 🟡 (Anthony 2026-11-14) Ella mide unos 2,6 m, él unos 3 m; ella lleva túnica y manto (absentRobe.ts), él chaleco,
// delantal y bandolera (absentWorkwear.ts), y los dos sus aros de oro (absentGold.ts).
//
// Para ponerlo en un mundo: `rig.root` en el marco del sitio (en `seated`, el origen va en el suelo justo debajo
// de las caderas: el asiento queda bajo la pelvis y los pies, delante) y cada fotograma
// `rig.setPose(currentAbsentPose(poser))` (absentPoser.ts).
import { Color, Group, Matrix4, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Triple } from '../worlds/procedural/kit';
import { buildForearm, buildShin, buildThigh, buildUpperArm, sidedSections } from './absentLimbs';
import { buildFoot, buildHand } from './absentHands';
import { buildChest, buildPelvis, buildSpine } from './absentTorso';
import { buildHead, buildNeck } from './absentHead';
import { ankleRings, headRings, neckRings, wristRings } from './absentGold';
import { robeChest, robePelvis, robeShin, robeThigh } from './absentRobe';
import { workwearChest, workwearPelvis, workwearThigh } from './absentWorkwear';
import {
  createAbsentMaterials,
  frostMaterials,
  PATTERN_GLOW,
  SIGN_GLOW,
  type AbsentMaterials,
} from './absentMaterials';
import {
  absentContext,
  ABSENT_PART_KINDS,
  AbsentSegment,
  type AbsentContext,
  type AbsentPartKind,
} from './absentParts';
import type { AbsentPose } from './absentPoses';
import type { AbsentJointName, AbsentWho } from './absentSkeleton';

export type { AbsentMaterials } from './absentMaterials';

const DESIGN_TO_BODY = new Matrix4().makeRotationX(-Math.PI / 2);
const toBody = (t: Triple): Vector3 => new Vector3(...t).applyMatrix4(DESIGN_TO_BODY);

/** Cuánto se ensancha el pecho al respirar, de lado y de frente (por cada unidad de `breath`). */
const BREATH = { side: 0.6, up: 1, depth: 0.8 } as const;

export type AbsentBone =
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
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

type Builder = (s: AbsentSegment, c: AbsentContext, side: number) => void;

interface BoneSpec {
  name: AbsentBone;
  parent: AbsentBone | undefined;
  joint: AbsentJointName;
  side: number;
  build: Builder;
}

/** La ropa de cada uno, por hueso. */
const OUTFIT: Record<AbsentWho, Partial<Record<'pelvis' | 'chest' | 'thigh' | 'shin', Builder>>> = {
  cientifica: { pelvis: robePelvis, chest: robeChest, thigh: robeThigh, shin: robeShin },
  esceptico: { pelvis: workwearPelvis, chest: workwearChest, thigh: workwearThigh },
};

const withOutfit =
  (base: Builder, part: 'pelvis' | 'chest' | 'thigh' | 'shin'): Builder =>
  (s, c, side) => {
    base(s, c, side);
    OUTFIT[c.who][part]?.(s, c, side);
  };

const TRUNK: readonly BoneSpec[] = [
  {
    name: 'pelvis',
    parent: undefined,
    joint: 'pelvis',
    side: 0,
    build: withOutfit(buildPelvis, 'pelvis'),
  },
  { name: 'spine', parent: 'pelvis', joint: 'spine', side: 0, build: buildSpine },
  {
    name: 'chest',
    parent: 'spine',
    joint: 'chest',
    side: 0,
    build: withOutfit(buildChest, 'chest'),
  },
  {
    name: 'neck',
    parent: 'chest',
    joint: 'neck',
    side: 0,
    build: (s, c) => {
      buildNeck(s, c);
      neckRings(s, c);
    },
  },
  {
    name: 'head',
    parent: 'neck',
    joint: 'head',
    side: 0,
    build: (s, c) => {
      buildHead(s, c);
      headRings(s, c);
    },
  },
];

const forearmWithRings: Builder = (s, c, side) => {
  buildForearm(s, c, side);
  wristRings(s, c, sidedSections(c, 'elbow', 'wrist', c.shape.forearm, side));
};

const shinWithRings: Builder = (s, c, side) => {
  withOutfit(buildShin, 'shin')(s, c, side);
  ankleRings(s, c, sidedSections(c, 'knee', 'ankle', c.shape.shin, side));
};

function boneSpecs(): BoneSpec[] {
  const specs = [...TRUNK];
  for (const [side, tag] of [
    [-1, 'L'],
    [1, 'R'],
  ] as const) {
    specs.push(
      { name: `upperArm${tag}`, parent: 'chest', joint: 'shoulder', side, build: buildUpperArm },
      {
        name: `forearm${tag}`,
        parent: `upperArm${tag}`,
        joint: 'elbow',
        side,
        build: forearmWithRings,
      },
      { name: `hand${tag}`, parent: `forearm${tag}`, joint: 'wrist', side, build: buildHand },
      {
        name: `thigh${tag}`,
        parent: 'pelvis',
        joint: 'hip',
        side,
        build: withOutfit(buildThigh, 'thigh'),
      },
      { name: `shin${tag}`, parent: `thigh${tag}`, joint: 'knee', side, build: shinWithRings },
      { name: `foot${tag}`, parent: `shin${tag}`, joint: 'ankle', side, build: buildFoot },
    );
  }
  return specs;
}

export interface AbsentRig {
  who: AbsentWho;
  root: Group;
  bones: Record<AbsentBone, Group>;
  materials: AbsentMaterials;
  /** Triángulos de todo el modelo, escarcha incluida. */
  triangles: number;
  /** Pone el cuerpo en una pose (ángulos, brillo del signo y de los dibujos, escarcha). */
  setPose(pose: AbsentPose): void;
  dispose(): void;
}

const sidedJoint = (c: AbsentContext, spec: BoneSpec): Triple => {
  const [x, y, z] = c.joints[spec.joint];
  return [spec.side === 0 ? x : x * spec.side, y, z];
};

const CASTS_SHADOW: ReadonlySet<AbsentPartKind> = new Set(['ceramic', 'metal', 'cloth', 'glass']);

function boneGroup(
  spec: BoneSpec,
  c: AbsentContext,
  materials: AbsentMaterials,
  parentPivot: Triple,
): Group {
  const pivot = sidedJoint(c, spec);
  const segment = new AbsentSegment(spec.name.length * 37 + (c.who === 'esceptico' ? 11 : 3));
  spec.build(segment, c, spec.side);
  const group = new Group();
  group.name = `AUSENTE_${c.who}_${spec.name}`;
  group.position.copy(toBody(pivot).sub(toBody(parentPivot)));
  const toLocal = new Matrix4()
    .makeTranslation(-pivot[0], -pivot[1], -pivot[2])
    .premultiply(DESIGN_TO_BODY);
  for (const kind of ABSENT_PART_KINDS) {
    const parts = segment.parts[kind];
    if (parts.length === 0) continue;
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    geometry.applyMatrix4(toLocal);
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, materials[kind]);
    mesh.name = `${group.name}_${kind}`;
    mesh.castShadow = CASTS_SHADOW.has(kind);
    mesh.receiveShadow = mesh.castShadow;
    if (kind === 'frost') mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

/** Monta a `who` en pie, con su complexión, su ropa, sus aros, sus colores y su signo. */
export function buildAbsent(who: AbsentWho): AbsentRig {
  const c = absentContext(who);
  const materials = createAbsentMaterials(c);
  const root = new Group();
  root.name = `AUSENTE_${who}`;
  const bones = {} as Record<AbsentBone, Group>;
  const pivots = {} as Record<AbsentBone, Triple>;
  for (const spec of boneSpecs()) {
    const parentPivot: Triple = spec.parent ? pivots[spec.parent] : [0, 0, 0];
    const group = boneGroup(spec, c, materials, parentPivot);
    bones[spec.name] = group;
    pivots[spec.name] = sidedJoint(c, spec);
    (spec.parent ? bones[spec.parent] : root).add(group);
  }
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh) meshes.push(o as Mesh);
  });
  const triangles = meshes.reduce((n, m) => n + m.geometry.getAttribute('position').count / 3, 0);
  const frostMeshes = meshes.filter((m) => m.name.endsWith('_frost'));
  const chestMeshes = meshes.filter((m) => m.parent === bones.chest);
  const rest = Object.fromEntries(
    Object.entries(bones).map(([name, bone]) => [name, bone.position.clone()]),
  ) as Record<AbsentBone, Vector3>;
  const glassColor = new Color(c.look.glass);
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

  function setFrost(frost: number): void {
    frostMaterials(materials, glassColor, frost);
    for (const mesh of frostMeshes) mesh.visible = frost > 0.01;
  }

  return {
    who,
    root,
    bones,
    materials,
    triangles,
    setPose(pose) {
      bones.pelvis.position.set(rest.pelvis.x, rest.pelvis.y + pose.bob, rest.pelvis.z);
      bones.pelvis.rotation.set(pose.pelvisPitch, 0, 0);
      bones.spine.rotation.set(pose.spinePitch, 0, pose.spineRoll);
      bones.chest.rotation.set(pose.chestPitch, pose.chestYaw, 0);
      for (const mesh of chestMeshes)
        mesh.scale.set(
          1 + pose.breath * BREATH.side,
          1 + pose.breath * BREATH.up,
          1 + pose.breath * BREATH.depth,
        );
      bones.neck.rotation.set(pose.neckPitch, 0, 0);
      bones.head.rotation.set(pose.headPitch, pose.headYaw, pose.headRoll, 'YXZ');
      for (const limb of limbs) {
        const arm = pose.arms[limb.k];
        const leg = pose.legs[limb.k];
        const shoulder = rest[limb.side < 0 ? 'upperArmL' : 'upperArmR'];
        limb.upperArm.position.set(shoulder.x, shoulder.y + pose.shrug, shoulder.z);
        limb.upperArm.rotation.set(
          arm.shoulder,
          limb.side * arm.twist,
          limb.side * arm.shoulderRoll,
        );
        limb.forearm.rotation.set(arm.elbow, 0, 0);
        limb.hand.rotation.set(arm.wrist, 0, 0);
        limb.thigh.rotation.set(leg.hip, 0, limb.side * leg.hipRoll);
        limb.shin.rotation.set(-leg.knee, 0, 0);
        limb.foot.rotation.set(leg.ankle, 0, 0);
      }
      materials.sign.emissiveIntensity = SIGN_GLOW * Math.min(1, Math.max(0, pose.sign));
      materials.glow.emissiveIntensity = PATTERN_GLOW * Math.min(1, Math.max(0, pose.patterns));
      setFrost(pose.frost);
    },
    dispose() {
      for (const mesh of meshes) mesh.geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
    },
  };
}
