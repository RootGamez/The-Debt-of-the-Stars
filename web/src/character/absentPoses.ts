// Las poses de los dos Ausentes vivos (plan de finales, E3; lógica pura, sin Three): de un nombre de pose y un
// tiempo a los ángulos de cada articulación, como hace gait.ts con el explorador. No tienen rostro: el gesto va en
// la postura y en el brillo del signo del pecho. Cada uno con sus medidas (absentSkeleton.ts; de perfil en
// absentChains.ts): él es más alto, encorvado y se sienta con las rodillas abiertas; ella, erguida y con las piernas
// juntas bajo la túnica.
//
// Poses: `frozen` (ella en la cámara de frío: rígida, con escarcha), `standing` (de pie, atento), `idle` (de pie,
// respiración lenta), `seated` (sentados juntos en el banco del Mirador, la cinemática final) y `slumped` (él,
// abatido en el borde de su catre). Pasar de una a otra sin saltos está en absentPoser.ts.
//
// Convenios (los de gait.ts; marco de diseño Z arriba, frente +Y; todo en radianes): `hip`, `shoulder` > 0 llevan
// la pierna o el brazo hacia delante; `knee`, `elbow` > 0 doblan; `ankle`, `wrist` > 0 suben la punta; los
// `…Pitch` > 0 echan hacia atrás (mirar arriba). Índice 0 = izquierda (−X), 1 = derecha (+X).
import {
  ABSENT_SKELETONS,
  lapRadius,
  thighRadius,
  type AbsentPosture,
  type AbsentWho,
} from './absentSkeleton';
import type { LegPose } from './gait';
import { add, angleOf, clamp, finite, length, scaled, sub, twoBone } from './absentPlanar';
import {
  legChain,
  limbVectors,
  shoulderAt,
  type AbsentArmPose,
  type AbsentPose,
} from './absentChains';

export { ABSENT_WHO, type AbsentWho } from './absentSkeleton';
export type { Planar } from './absentPlanar';
export {
  armChain,
  legChain,
  type AbsentArmPose,
  type AbsentPose,
  type ArmChain,
  type LegChain,
} from './absentChains';

export type AbsentPoseName = 'frozen' | 'standing' | 'idle' | 'seated' | 'slumped';

export const ABSENT_POSE_NAMES: readonly AbsentPoseName[] = [
  'frozen',
  'standing',
  'idle',
  'seated',
  'slumped',
];

export interface PoseOptions {
  /** Altura del asiento (m) en `seated` y `slumped`. */
  seatHeight?: number;
  /** Giro de la cabeza (rad, > 0 a su izquierda), p. ej. hacia quien está al lado. */
  look?: number;
}

/** 🟡 El banco del Mirador del Ocaso (umbral.ts, `lookout`: 0,52 m) y el catre del escéptico, más bajo. */
export const DEFAULT_SEAT = { seated: 0.52, slumped: 0.45 } as const;

/** Lo que se aparta el muslo de la cadera (m) donde se apoya la mano, con las rodillas así de abiertas. */
const THIGH_SPLAY_AT_HAND = 0.02;
/** Lo que queda la muñeca sobre el regazo: el grosor de la mano. */
const PALM_ON_LAP = 0.03;
const LOOK_LIMIT = 0.6;
const TAU = Math.PI * 2;

/** Las dos piernas sentadas: la cadera a un radio de muslo sobre el asiento y los pies planos en el suelo. */
function seatedLegs(
  who: AbsentWho,
  seat: number,
  kind: 'seated' | 'slumped',
): { bob: number; legs: [LegPose, LegPose] } {
  const { joints, posture } = ABSENT_SKELETONS[who];
  const { thigh, shin } = limbVectors(who);
  const hipZ = seat + thighRadius(who);
  const hip = { y: joints.hip[1], z: hipZ };
  const [thighAngle, shinAngle] = twoBone(
    hip,
    { y: hip.y + posture.seatReach[kind], z: joints.ankle[2] },
    length(thigh),
    length(shin),
    1,
  );
  const hipAngle = thighAngle - angleOf(thigh);
  const knee = hipAngle + angleOf(shin) - shinAngle;
  const leg: LegPose = {
    hip: hipAngle,
    hipRoll: posture.seatSplay[kind],
    knee,
    ankle: knee - hipAngle,
  };
  return { bob: hipZ - joints.hip[2], legs: [leg, { ...leg }] };
}

/** Un brazo que apunta a unas direcciones del mundo (de perfil) desde un pecho girado `chest`. */
function armTowards(
  who: AbsentWho,
  chest: number,
  upper: number,
  fore: number,
  hand: number,
  extra: { shoulderRoll: number; twist: number },
): AbsentArmPose {
  const { upperArm, forearm } = limbVectors(who);
  const shoulder = upper - chest - angleOf(upperArm);
  const elbow = fore - upper - angleOf(forearm) + angleOf(upperArm);
  return { shoulder, elbow, wrist: hand - (chest + shoulder + elbow), ...extra };
}

// ---- Las poses ------------------------------------------------------------------------------------------------

const PHASE: Record<AbsentWho, number> = { cientifica: 0, esceptico: 1.9 };
const wave = (time: number, period: number, phase = 0): number =>
  Math.sin((time * TAU) / period + phase);
/** De 0 a 1 y vuelta, suave. */
const pulse = (time: number, period: number, phase = 0): number =>
  0.5 + 0.5 * wave(time, period, phase);

/** De pie: la espalda según su complexión y los brazos colgando del hombro. */
function upright(who: AbsentWho, time: number, breathDepth: number): AbsentPose {
  const p: AbsentPosture = ABSENT_SKELETONS[who].posture;
  const phase = PHASE[who];
  const breathing = wave(time, 6.5, phase);
  const arm: AbsentArmPose = {
    shoulder: -(p.spine + p.chest) + p.armHang + 0.01 * breathing,
    shoulderRoll: p.armOut + 0.04,
    elbow: 0.14,
    wrist: 0.06,
    twist: 0.15,
  };
  const leg: LegPose = { hip: 0, hipRoll: p.stance, knee: 0.03, ankle: 0.03 };
  return {
    bob: 0,
    pelvisPitch: 0,
    spinePitch: p.spine,
    spineRoll: 0,
    chestPitch: p.chest,
    chestYaw: 0,
    neckPitch: p.neck,
    headPitch: p.head,
    headYaw: 0,
    headRoll: 0,
    shrug: p.shrug,
    breath: breathDepth * breathing,
    sign: 0.8 + 0.06 * wave(time, 9, phase),
    patterns: 0.75,
    frost: 0,
    legs: [leg, { ...leg }],
    arms: [arm, { ...arm }],
  };
}

function idle(who: AbsentWho, time: number): AbsentPose {
  const base = upright(who, time, 0.014);
  const phase = PHASE[who];
  return {
    ...base,
    spineRoll: 0.012 * wave(time, 11, phase),
    chestYaw: 0.025 * wave(time, 13, phase + 0.7),
    headYaw: 0.06 * wave(time, 17, phase + 1.3),
    headRoll: 0.025 * wave(time, 9.5, phase + 2.1),
    headPitch: base.headPitch + 0.02 * wave(time, 6.5, phase + 0.4),
    sign: 0.66 + 0.16 * pulse(time, 6.5, phase),
  };
}

/** Congelada: rígida, la cabeza un poco baja, las manos juntas delante; solo late el signo, muy débil. */
function frozen(): AbsentPose {
  const arm: AbsentArmPose = {
    shoulder: 0.12,
    shoulderRoll: 0.08,
    elbow: 0.75,
    wrist: 0.1,
    twist: 0.7,
  };
  const leg: LegPose = { hip: 0, hipRoll: 0, knee: 0.02, ankle: 0.02 };
  return {
    bob: 0,
    pelvisPitch: 0,
    spinePitch: 0,
    spineRoll: 0,
    chestPitch: 0.01,
    chestYaw: 0,
    neckPitch: -0.04,
    headPitch: -0.12,
    headYaw: 0,
    headRoll: 0,
    shrug: 0,
    breath: 0,
    sign: 0.12,
    patterns: 0.04,
    frost: 1,
    legs: [leg, { ...leg }],
    arms: [arm, { ...arm }],
  };
}

/** Sentada o sentado en el banco: erguidos, las manos en los muslos. Los dos signos laten a la vez. */
function seated(who: AbsentWho, time: number, options: PoseOptions): AbsentPose {
  const p = ABSENT_SKELETONS[who].posture;
  const seat = finite(options.seatHeight ?? DEFAULT_SEAT.seated, DEFAULT_SEAT.seated);
  const { bob, legs } = seatedLegs(who, seat, 'seated');
  const pose: AbsentPose = {
    ...upright(who, time, 0.01),
    bob,
    spinePitch: p.spine - 0.03,
    neckPitch: p.neck,
    headPitch: p.head + 0.04,
    headYaw: clamp(finite(options.look ?? 0), -LOOK_LIMIT, LOOK_LIMIT),
    sign: 0.78 + 0.12 * pulse(time, 7),
    patterns: 0.8,
    legs,
  };
  return { ...pose, arms: handsOnThighs(who, pose) };
}

/** Las manos apoyadas en el regazo, cerca de las rodillas, con los dedos cayendo. */
function handsOnThighs(who: AbsentWho, pose: AbsentPose): [AbsentArmPose, AbsentArmPose] {
  const { upperArm, forearm } = limbVectors(who);
  const { at, chest } = shoulderAt(who, pose);
  const leg = legChain(who, pose, 1);
  const thigh = sub(leg.knee, leg.hip);
  const up = scaled({ y: -thigh.z, z: thigh.y }, 1 / length(thigh));
  const target = add(add(leg.hip, scaled(thigh, 0.7)), scaled(up, lapRadius(who) + PALM_ON_LAP));
  const [upper, fore] = twoBone(at, target, length(upperArm), length(forearm), -1);
  const arm = armTowards(who, chest, upper, fore, angleOf(thigh) - 0.35, {
    shoulderRoll: ABSENT_SKELETONS[who].posture.armOut - 0.06,
    twist: twistOverThigh(who),
  });
  return [arm, { ...arm }];
}

/**
 * De perfil la mano ya está sobre el muslo; de frente, el hombro queda por fuera de la cadera. El antebrazo gira
 * hacia dentro (sobre el eje del brazo) lo justo para que la muñeca caiga encima del muslo y no en el aire, al lado.
 */
function twistOverThigh(who: AbsentWho): number {
  const { joints } = ABSENT_SKELETONS[who];
  const { forearm } = limbVectors(who);
  // El muslo se abre un poco al sentarse (seatSplay): la mano cae algo por fuera de la cadera.
  const thighX = joints.hip[0] + THIGH_SPLAY_AT_HAND;
  return Math.asin(clamp((joints.shoulder[0] - thighX) / length(forearm), 0, 0.9));
}

/** Abatido en el borde del catre: los codos en las rodillas, la cabeza colgando y las manos caídas delante. */
function slumped(who: AbsentWho, time: number, options: PoseOptions): AbsentPose {
  const p = ABSENT_SKELETONS[who].posture;
  const seat = finite(options.seatHeight ?? DEFAULT_SEAT.slumped, DEFAULT_SEAT.slumped);
  const { bob, legs } = seatedLegs(who, seat, 'slumped');
  const sigh = wave(time, 9, PHASE[who]);
  const pose: AbsentPose = {
    ...upright(who, time, 0),
    bob,
    spinePitch: p.spine - 0.22,
    chestPitch: p.chest - 0.25 + 0.015 * sigh,
    neckPitch: p.neck - 0.15,
    headPitch: p.head - 0.3,
    headYaw: clamp(finite(options.look ?? 0), -LOOK_LIMIT, LOOK_LIMIT),
    shrug: p.shrug - 0.04,
    breath: 0.012 * sigh,
    sign: 0.28 + 0.07 * pulse(time, 9, PHASE[who]),
    patterns: 0.3,
    legs,
  };
  return { ...pose, arms: handsOverKnees(who, pose) };
}

function handsOverKnees(who: AbsentWho, pose: AbsentPose): [AbsentArmPose, AbsentArmPose] {
  const { upperArm, forearm } = limbVectors(who);
  const { at, chest } = shoulderAt(who, pose);
  const knee = legChain(who, pose, 1).knee;
  const target = add(knee, { y: 0.14, z: -0.06 });
  const [upper, fore] = twoBone(at, target, length(upperArm), length(forearm), -1);
  const arm = armTowards(who, chest, upper, fore, 0.45, {
    shoulderRoll: ABSENT_SKELETONS[who].posture.armOut,
    twist: 0.45,
  });
  return [arm, { ...arm }];
}

/** La pose `name` de `who` en el instante `time` (s). */
export function absentPose(
  who: AbsentWho,
  name: AbsentPoseName,
  time: number,
  options: PoseOptions = {},
): AbsentPose {
  const t = finite(time);
  switch (name) {
    case 'frozen':
      return frozen();
    case 'standing':
      return upright(who, t, 0.006);
    case 'idle':
      return idle(who, t);
    case 'seated':
      return seated(who, t, options);
    case 'slumped':
      return slumped(who, t, options);
  }
}
