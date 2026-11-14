// Los dos Ausentes vivos montados (plan de finales, E3): un hueso rígido por articulación (como el explorador,
// explorerModel.ts) con sus mallas por material. El grupo raíz tiene los pies en el origen, Y arriba y el frente
// hacia −Z, como el explorador. La pose (absentPoses.ts) mueve los huesos, enciende el signo y los dibujos y pone o
// quita la escarcha. Cada Ausente lleva sus propios materiales: se pueden congelar y encender por separado.
//
// Para ponerlo en un mundo: `rig.root` en el marco del sitio (en `seated`, el origen va en el suelo justo debajo
// de las caderas: el asiento queda bajo la pelvis y los pies, delante) y cada fotograma
// `rig.setPose(currentAbsentPose(poser))` (absentPoser.ts).
import { Color, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Triple } from '../worlds/procedural/kit';
import {
  buildFoot,
  buildForearm,
  buildHand,
  buildShin,
  buildThigh,
  buildUpperArm,
} from './absentLimbs';
import {
  absentContext,
  ABSENT_PART_KINDS,
  AbsentSegment,
  buildChest,
  buildPelvis,
  buildSpine,
  type AbsentContext,
  type AbsentJointName,
  type AbsentPartKind,
} from './absentParts';
import { buildHead, buildNeck } from './absentHead';
import type { AbsentPose } from './absentPoses';
import type { AbsentWho } from './absentSkeleton';

const DESIGN_TO_BODY = new Matrix4().makeRotationX(-Math.PI / 2);
const toBody = (t: Triple): Vector3 => new Vector3(...t).applyMatrix4(DESIGN_TO_BODY);

/** Brillo del signo y de los dibujos de la cabeza a pose 1 (como las luces de los murales de Umbral). */
const SIGN_GLOW = 2.6;
const PATTERN_GLOW = 2.2;
/** La luz de dentro del vidrio y lo pulido que está. */
const GLASS_DEPTH = 0.015;
const GLASS_ROUGHNESS = 0.18;
/** Sin mapa de entorno, un cobre muy metálico se ve negro a contraluz. */
const COPPER_METALNESS = 0.55;
/** La escarcha: la cerámica azulada y mate, el cobre empañado, el vidrio blanquecino. */
const FROST = {
  ceramic: new Color('#bcd6ea'),
  copper: new Color('#a9c4d4'),
  glass: new Color('#5c7488'),
} as const;
const WHITE = new Color('#ffffff');

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

interface BoneSpec {
  name: AbsentBone;
  parent: AbsentBone | undefined;
  joint: AbsentJointName;
  side: number;
  build: (s: AbsentSegment, c: AbsentContext, side: number) => void;
}

const TRUNK: readonly BoneSpec[] = [
  { name: 'pelvis', parent: undefined, joint: 'pelvis', side: 0, build: buildPelvis },
  { name: 'spine', parent: 'pelvis', joint: 'spine', side: 0, build: buildSpine },
  { name: 'chest', parent: 'spine', joint: 'chest', side: 0, build: buildChest },
  { name: 'neck', parent: 'chest', joint: 'neck', side: 0, build: buildNeck },
  { name: 'head', parent: 'neck', joint: 'head', side: 0, build: buildHead },
];

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
        build: buildForearm,
      },
      { name: `hand${tag}`, parent: `forearm${tag}`, joint: 'wrist', side, build: buildHand },
      { name: `thigh${tag}`, parent: 'pelvis', joint: 'hip', side, build: buildThigh },
      { name: `shin${tag}`, parent: `thigh${tag}`, joint: 'knee', side, build: buildShin },
      { name: `foot${tag}`, parent: `shin${tag}`, joint: 'ankle', side, build: buildFoot },
    );
  }
  return specs;
}

export type AbsentMaterials = Record<AbsentPartKind, MeshStandardMaterial>;

function createMaterials(c: AbsentContext): AbsentMaterials {
  return {
    ceramic: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55 }),
    copper: new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.35,
      metalness: COPPER_METALNESS,
    }),
    // El vidrio, liso (con caras planas, el brillo de una sola cara parecería otro dibujo) y con un poco de luz
    // dentro, para que no sea un agujero negro.
    glass: new MeshStandardMaterial({
      color: c.look.glass,
      emissive: c.look.glow,
      emissiveIntensity: GLASS_DEPTH,
      roughness: GLASS_ROUGHNESS,
      metalness: 0.3,
    }),
    glow: new MeshStandardMaterial({
      color: '#10181c',
      emissive: c.look.glow,
      emissiveIntensity: PATTERN_GLOW,
      roughness: 0.4,
    }),
    sign: new MeshStandardMaterial({
      color: '#10181c',
      emissive: c.look.sign,
      emissiveIntensity: SIGN_GLOW,
      roughness: 0.4,
    }),
    frost: new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.85,
    }),
  };
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
    geometry.applyMatrix4(toLocal);
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, materials[kind]);
    mesh.name = `${group.name}_${kind}`;
    mesh.castShadow = kind === 'ceramic' || kind === 'copper' || kind === 'glass';
    mesh.receiveShadow = mesh.castShadow;
    if (kind === 'frost') mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

const sidedJoint = (c: AbsentContext, spec: BoneSpec): Triple => {
  const [x, y, z] = c.joints[spec.joint];
  return [spec.side === 0 ? x : x * spec.side, y, z];
};

/** Monta a `who` en pie, con su complexión, sus colores y su signo. */
export function buildAbsent(who: AbsentWho): AbsentRig {
  const c = absentContext(who);
  const materials = createMaterials(c);
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
    const f = Math.min(1, Math.max(0, frost));
    materials.ceramic.color.copy(WHITE).lerp(FROST.ceramic, f);
    materials.ceramic.roughness = 0.55 + 0.42 * f;
    materials.copper.color.copy(WHITE).lerp(FROST.copper, f);
    materials.copper.metalness = COPPER_METALNESS * (1 - 0.8 * f);
    materials.copper.roughness = 0.35 + 0.55 * f;
    materials.glass.color.copy(glassColor).lerp(FROST.glass, f);
    materials.glass.roughness = GLASS_ROUGHNESS + 0.6 * f;
    materials.glass.emissiveIntensity = GLASS_DEPTH * (1 - f);
    materials.frost.opacity = 0.85 * f;
    for (const mesh of frostMeshes) mesh.visible = f > 0.01;
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
        mesh.scale.set(1 + pose.breath * 0.6, 1 + pose.breath, 1 + pose.breath * 0.8);
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
