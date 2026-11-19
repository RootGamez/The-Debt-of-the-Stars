// Un Ool articulado para las escenas (F4, el nido): las mismas piezas que worlds/procedural/ool.ts, partidas por sus
// articulaciones (pies, cuerpo, cabeza y brazos) y colgadas de sus pivotes, para que pueda mirar al cielo, tender las
// manos o leer (character/oolPoses.ts). En el juego los Ool siguen siendo una sola pieza (render/oolView.ts).
//
// Marco del Ool: Y arriba, frente hacia −Z, los pies en el origen (como buildOol: se cuelga igual, con OOL_UPRIGHT).
import { Group, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry } from 'three';
import {
  oolGlowMaterial,
  oolParts,
  type OolMaterials,
  type OolPart,
  type OolSpec,
} from '../worlds/procedural/ool';
import { clampPose, type OolPose } from './oolPoses';

/** Dónde gira cada parte, en el marco de diseño de ool.ts (Z arriba, frente +Y) y a tamaño de adulto. */
const PIVOTS: Readonly<Record<Exclude<OolPart, 'base'>, readonly [number, number, number]>> = {
  body: [0, 0, 0.3],
  head: [0, 0, 0.84],
  armL: [-0.27, 0.02, 0.74],
  armR: [0.27, 0.02, 0.74],
};

export interface OolRig {
  /** Para colgar de un marco de lugar (como un Ool del mundo). */
  root: Group;
  joints: { body: Group; head: Group; armL: Group; armR: Group };
  /** Lo alto que es (m) y dónde están sus ojos (marco del Ool, sin pose). */
  height: number;
  eye: Vector3;
  setPose(pose: OolPose): void;
  dispose(): void;
}

/** Del marco de diseño al del Ool (Y arriba, frente −Z), a su tamaño. */
function toOol([x, y, z]: readonly [number, number, number], size: number): Vector3 {
  return new Vector3(x, z, -y).multiplyScalar(size);
}

export function buildOolRig(spec: OolSpec, materials: OolMaterials): OolRig {
  const { look, parts } = oolParts(spec);
  const glow: MeshStandardMaterial = oolGlowMaterial(look);
  const root = new Group();
  root.name = `OOL_${spec.id}_Escena`;
  const joint = (name: string, parent: Group, pivot: Vector3, from: Vector3): Group => {
    const group = new Group();
    group.name = `${root.name}_${name}`;
    group.position.copy(pivot).sub(from);
    parent.add(group);
    return group;
  };
  const size = look.size;
  const pivot = (part: Exclude<OolPart, 'base'>): Vector3 => toOol(PIVOTS[part], size);
  const origin = new Vector3();
  // El giro sobre los pies va dentro: la raíz es de quien lo cuelga.
  const spin = joint('giro', root, origin, origin);
  const body = joint('cuerpo', spin, pivot('body'), origin);
  const joints = {
    body,
    head: joint('cabeza', body, pivot('head'), pivot('body')),
    armL: joint('brazoI', body, pivot('armL'), pivot('body')),
    armR: joint('brazoD', body, pivot('armR'), pivot('body')),
  };
  const geometries: BufferGeometry[] = [];
  const hang = (part: OolPart, parent: Group, from: Vector3): void => {
    const shape = parts.get(part);
    if (!shape) return;
    const add = (geometry: BufferGeometry | undefined, light: boolean): void => {
      if (!geometry) return;
      geometry.translate(-from.x, -from.y, -from.z);
      geometries.push(geometry);
      const mesh = new Mesh(geometry, light ? glow : materials.body);
      mesh.name = `${parent.name}_${light ? 'luz' : 'piel'}`;
      mesh.castShadow = !light;
      mesh.receiveShadow = !light;
      parent.add(mesh);
    };
    add(shape.body, false);
    add(shape.glow, true);
  };
  hang('base', spin, origin);
  hang('body', joints.body, pivot('body'));
  hang('head', joints.head, pivot('head'));
  hang('armL', joints.armL, pivot('armL'));
  hang('armR', joints.armR, pivot('armR'));

  return {
    root,
    joints,
    height: 1.32 * size,
    eye: toOol([0, 0.255, 1.07], size),
    setPose(raw) {
      const pose = clampPose(raw);
      spin.rotation.set(0, pose.turn, 0);
      joints.body.rotation.set(-pose.lean, 0, 0);
      joints.head.rotation.set(pose.headPitch, pose.headYaw, -pose.headTilt, 'YXZ');
      joints.armL.rotation.set(pose.armL.raise, 0, -pose.armL.out);
      joints.armR.rotation.set(pose.armR.raise, 0, pose.armR.out);
      glow.emissiveIntensity = look.glowIntensity * pose.glow;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      glow.dispose();
    },
  };
}
