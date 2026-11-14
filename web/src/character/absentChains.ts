// La cinemática de perfil de los dos Ausentes vivos (plan de finales, E3; lógica pura): qué números tiene una pose y
// dónde caen la cadera, la rodilla, el tobillo, el hombro, el codo y la muñeca de cada uno con sus medidas
// (absentSkeleton.ts: él es más alto y tiene los miembros más largos). Plano de perfil: y adelante, z arriba.
import type { ArmPose, LegPose } from './gait';
import { ABSENT_SKELETONS, type AbsentWho } from './absentSkeleton';
import { add, planar, rotate, sub, type Planar } from './absentPlanar';

/** Un brazo, con su giro sobre sí mismo: > 0 lleva el antebrazo doblado hacia el centro del cuerpo. */
export interface AbsentArmPose extends ArmPose {
  twist: number;
}

export interface AbsentPose {
  /** Subir y bajar la pelvis (m; al sentarse, mucho). */
  bob: number;
  pelvisPitch: number;
  spinePitch: number;
  spineRoll: number;
  chestPitch: number;
  chestYaw: number;
  neckPitch: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  /** Los hombros arriba o abajo (m, < 0 caídos). */
  shrug: number;
  /** Cuánto se hincha el pecho (fracción). */
  breath: number;
  /** Brillo del signo del pecho y de los dibujos de la cabeza (0–1). */
  sign: number;
  patterns: number;
  /** La escarcha (0–1): 1 congelada. */
  frost: number;
  legs: readonly [LegPose, LegPose];
  arms: readonly [AbsentArmPose, AbsentArmPose];
}

/** Los huesos de cada uno, de perfil: muslo, espinilla, brazo y antebrazo en reposo. */
export interface LimbVectors {
  thigh: Planar;
  shin: Planar;
  upperArm: Planar;
  forearm: Planar;
}

const VECTORS = Object.fromEntries(
  Object.entries(ABSENT_SKELETONS).map(([who, { joints: j }]) => [
    who,
    {
      thigh: sub(planar(j.knee), planar(j.hip)),
      shin: sub(planar(j.ankle), planar(j.knee)),
      upperArm: sub(planar(j.elbow), planar(j.shoulder)),
      forearm: sub(planar(j.wrist), planar(j.elbow)),
    },
  ]),
) as Record<AbsentWho, LimbVectors>;

export const limbVectors = (who: AbsentWho): LimbVectors => VECTORS[who];

export interface LegChain {
  hip: Planar;
  knee: Planar;
  ankle: Planar;
  /** Inclinación de la planta (0 = plana sobre el suelo). */
  footPitch: number;
}

export interface ArmChain {
  shoulder: Planar;
  elbow: Planar;
  wrist: Planar;
  /** Hacia dónde apunta la mano (ángulo desde «hacia abajo»). */
  handPitch: number;
}

/** La pelvis de `who` con la pose puesta. */
export function pelvisAt(who: AbsentWho, pose: AbsentPose): Planar {
  const { pelvis } = ABSENT_SKELETONS[who].joints;
  return { y: pelvis[1], z: pelvis[2] + pose.bob };
}

/** Cadera, rodilla y tobillo de una pierna en el plano de perfil (sin el giro hacia fuera, que es pequeño). */
export function legChain(who: AbsentWho, pose: AbsentPose, side: 0 | 1): LegChain {
  const j = ABSENT_SKELETONS[who].joints;
  const v = VECTORS[who];
  const leg = pose.legs[side];
  const hip = add(
    pelvisAt(who, pose),
    rotate(sub(planar(j.hip), planar(j.pelvis)), pose.pelvisPitch),
  );
  const thigh = pose.pelvisPitch + leg.hip;
  const knee = add(hip, rotate(v.thigh, thigh));
  const shin = thigh - leg.knee;
  return { hip, knee, ankle: add(knee, rotate(v.shin, shin)), footPitch: shin + leg.ankle };
}

/** El hombro en el plano de perfil y lo que va girado el pecho. */
export function shoulderAt(who: AbsentWho, pose: AbsentPose): { at: Planar; chest: number } {
  const j = ABSENT_SKELETONS[who].joints;
  const spine = add(
    pelvisAt(who, pose),
    rotate(sub(planar(j.spine), planar(j.pelvis)), pose.pelvisPitch),
  );
  const lower = pose.pelvisPitch + pose.spinePitch;
  const chest = add(spine, rotate(sub(planar(j.chest), planar(j.spine)), lower));
  const upper = lower + pose.chestPitch;
  const offset = { y: j.shoulder[1] - j.chest[1], z: j.shoulder[2] - j.chest[2] + pose.shrug };
  return { at: add(chest, rotate(offset, upper)), chest: upper };
}

/** Hombro, codo y muñeca de un brazo en el plano de perfil (sin el giro del brazo ni lo que se abre). */
export function armChain(who: AbsentWho, pose: AbsentPose, side: 0 | 1): ArmChain {
  const v = VECTORS[who];
  const arm = pose.arms[side];
  const { at: shoulder, chest } = shoulderAt(who, pose);
  const upper = chest + arm.shoulder;
  const elbow = add(shoulder, rotate(v.upperArm, upper));
  const fore = upper + arm.elbow;
  return {
    shoulder,
    elbow,
    wrist: add(elbow, rotate(v.forearm, fore)),
    handPitch: fore + arm.wrist,
  };
}
