// Las poses de los dos Ausentes vivos (plan de finales, E3; lógica pura, sin Three): de un nombre de pose y un
// tiempo a los ángulos de cada articulación, como hace gait.ts con el explorador. No tienen rostro: el gesto va en
// la postura y en el brillo del signo del pecho.
//
// Poses: `frozen` (ella en la cámara de frío: rígida, con escarcha), `standing` (de pie, atento), `idle` (de pie,
// respiración lenta), `seated` (sentados juntos en el banco del Mirador, la cinemática final) y `slumped` (él,
// abatido en el borde de su catre). Pasar de una a otra sin saltos está en absentPoser.ts.
//
// Convenios (los de gait.ts; marco de diseño Z arriba, frente +Y; todo en radianes): `hip`, `shoulder` > 0 llevan
// la pierna o el brazo hacia delante; `knee`, `elbow` > 0 doblan; `ankle`, `wrist` > 0 suben la punta; los
// `…Pitch` > 0 echan hacia atrás (mirar arriba). Índice 0 = izquierda (−X), 1 = derecha (+X).
import {
  ABSENT_BUILDS,
  ABSENT_JOINTS,
  hipSpread,
  thighRadius,
  type AbsentPosture,
  type AbsentWho,
} from './absentSkeleton';
import type { ArmPose, LegPose } from './gait';
import {
  add,
  angleOf,
  clamp,
  finite,
  length,
  planar,
  rotate,
  scaled,
  sub,
  twoBone,
  type Planar,
} from './absentPlanar';

export { ABSENT_WHO, type AbsentWho } from './absentSkeleton';
export type { Planar } from './absentPlanar';

export type AbsentPoseName = 'frozen' | 'standing' | 'idle' | 'seated' | 'slumped';

export const ABSENT_POSE_NAMES: readonly AbsentPoseName[] = [
  'frozen',
  'standing',
  'idle',
  'seated',
  'slumped',
];

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

export interface PoseOptions {
  /** Altura del asiento (m) en `seated` y `slumped`. */
  seatHeight?: number;
  /** Giro de la cabeza (rad, > 0 a su izquierda), p. ej. hacia quien está al lado. */
  look?: number;
}

/** 🟡 El banco del Mirador del Ocaso (umbral.ts, `lookout`: 0,52 m) y el catre del escéptico, más bajo. */
export const DEFAULT_SEAT = { seated: 0.52, slumped: 0.45 } as const;

/** Lo que adelantan los pies respecto a la cadera al sentarse (m). */
const SEAT_REACH = { seated: 0.62, slumped: 0.6 } as const;
/** Cuánto se abren las rodillas (rad). */
const SEAT_SPLAY = { seated: 0.05, slumped: 0.12 } as const;
/** Lo que se aparta el muslo de la cadera (m) donde se apoya la mano, con las rodillas así de abiertas. */
const THIGH_SPLAY_AT_HAND = 0.02;
const LOOK_LIMIT = 0.6;
const TAU = Math.PI * 2;

// ---- El plano de perfil (y adelante, z arriba): cinemática de piernas y brazos --------------------------------

const J = ABSENT_JOINTS;

const THIGH = sub(planar(J.knee), planar(J.hip));
const SHIN = sub(planar(J.ankle), planar(J.knee));
const UPPER_ARM = sub(planar(J.elbow), planar(J.shoulder));
const FOREARM = sub(planar(J.wrist), planar(J.elbow));

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

const pelvisAt = (pose: AbsentPose): Planar => ({ y: J.pelvis[1], z: J.pelvis[2] + pose.bob });

/** Cadera, rodilla y tobillo de una pierna en el plano de perfil (sin el giro hacia fuera, que es pequeño). */
export function legChain(pose: AbsentPose, side: 0 | 1): LegChain {
  const leg = pose.legs[side];
  const hip = add(pelvisAt(pose), rotate(sub(planar(J.hip), planar(J.pelvis)), pose.pelvisPitch));
  const thigh = pose.pelvisPitch + leg.hip;
  const knee = add(hip, rotate(THIGH, thigh));
  const shin = thigh - leg.knee;
  return { hip, knee, ankle: add(knee, rotate(SHIN, shin)), footPitch: shin + leg.ankle };
}

/** El hombro en el plano de perfil y lo que va girado el pecho. */
function shoulderAt(pose: AbsentPose): { at: Planar; chest: number } {
  const spine = add(
    pelvisAt(pose),
    rotate(sub(planar(J.spine), planar(J.pelvis)), pose.pelvisPitch),
  );
  const lower = pose.pelvisPitch + pose.spinePitch;
  const chest = add(spine, rotate(sub(planar(J.chest), planar(J.spine)), lower));
  const upper = lower + pose.chestPitch;
  const offset = { y: J.shoulder[1] - J.chest[1], z: J.shoulder[2] - J.chest[2] + pose.shrug };
  return { at: add(chest, rotate(offset, upper)), chest: upper };
}

/** Hombro, codo y muñeca de un brazo en el plano de perfil (sin el giro del brazo ni lo que se abre). */
export function armChain(pose: AbsentPose, side: 0 | 1): ArmChain {
  const arm = pose.arms[side];
  const { at: shoulder, chest } = shoulderAt(pose);
  const upper = chest + arm.shoulder;
  const elbow = add(shoulder, rotate(UPPER_ARM, upper));
  const fore = upper + arm.elbow;
  return { shoulder, elbow, wrist: add(elbow, rotate(FOREARM, fore)), handPitch: fore + arm.wrist };
}

/** Las dos piernas sentadas: la cadera a un radio de muslo sobre el asiento y los pies planos en el suelo. */
function seatedLegs(
  who: AbsentWho,
  seat: number,
  reach: number,
  splay: number,
): { bob: number; legs: [LegPose, LegPose] } {
  const hipZ = seat + thighRadius(who);
  const hip = { y: J.hip[1], z: hipZ };
  const [thigh, shin] = twoBone(
    hip,
    { y: hip.y + reach, z: J.ankle[2] },
    length(THIGH),
    length(SHIN),
    1,
  );
  const hipAngle = thigh - angleOf(THIGH);
  const knee = hipAngle + angleOf(SHIN) - shin;
  const leg: LegPose = { hip: hipAngle, hipRoll: splay, knee, ankle: knee - hipAngle };
  return { bob: hipZ - J.hip[2], legs: [leg, { ...leg }] };
}

/** Un brazo que apunta a unas direcciones del mundo (de perfil) desde un pecho girado `chest`. */
function armTowards(
  chest: number,
  upper: number,
  fore: number,
  hand: number,
  extra: { shoulderRoll: number; twist: number },
): AbsentArmPose {
  const shoulder = upper - chest - angleOf(UPPER_ARM);
  const elbow = fore - upper - angleOf(FOREARM) + angleOf(UPPER_ARM);
  return { shoulder, elbow, wrist: hand - (chest + shoulder + elbow), ...extra };
}

// ---- Las poses ------------------------------------------------------------------------------------------------

const PHASE: Record<AbsentWho, number> = { cientifica: 0, esceptico: 1.9 };
const wave = (time: number, period: number, phase = 0): number =>
  Math.sin((time * TAU) / period + phase);
/** De 0 a 1 y vuelta, suave. */
const pulse = (time: number, period: number, phase = 0): number =>
  0.5 + 0.5 * wave(time, period, phase);

const STANDING_LEG: LegPose = { hip: 0, hipRoll: 0.025, knee: 0.03, ankle: 0.03 };

/** De pie: la espalda según su complexión y los brazos colgando del hombro. */
function upright(who: AbsentWho, time: number, breathDepth: number): AbsentPose {
  const p: AbsentPosture = ABSENT_BUILDS[who].posture;
  const phase = PHASE[who];
  const breathing = wave(time, 6.5, phase);
  const arm: AbsentArmPose = {
    shoulder: -(p.spine + p.chest) + p.armHang + 0.01 * breathing,
    shoulderRoll: p.armOut + 0.04,
    elbow: 0.14,
    wrist: 0.06,
    twist: 0.15,
  };
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
    legs: [{ ...STANDING_LEG }, { ...STANDING_LEG }],
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
    shoulderRoll: 0.06,
    elbow: 0.75,
    wrist: 0.1,
    twist: 0.7,
  };
  const leg: LegPose = { hip: 0, hipRoll: 0.01, knee: 0.02, ankle: 0.02 };
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
  const p = ABSENT_BUILDS[who].posture;
  const seat = finite(options.seatHeight ?? DEFAULT_SEAT.seated, DEFAULT_SEAT.seated);
  const { bob, legs } = seatedLegs(who, seat, SEAT_REACH.seated, SEAT_SPLAY.seated);
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

/** Las manos apoyadas en los muslos, cerca de las rodillas, con los dedos cayendo. */
function handsOnThighs(who: AbsentWho, pose: AbsentPose): [AbsentArmPose, AbsentArmPose] {
  const { at, chest } = shoulderAt(pose);
  const leg = legChain(pose, 1);
  const thigh = sub(leg.knee, leg.hip);
  const up = scaled({ y: -thigh.z, z: thigh.y }, 1 / length(thigh));
  const target = add(add(leg.hip, scaled(thigh, 0.72)), scaled(up, thighRadius(who) + 0.05));
  const [upper, fore] = twoBone(at, target, length(UPPER_ARM), length(FOREARM), -1);
  const arm = armTowards(chest, upper, fore, angleOf(thigh) - 0.35, {
    shoulderRoll: ABSENT_BUILDS[who].posture.armOut - 0.06,
    twist: twistOverThigh(who),
  });
  return [arm, { ...arm }];
}

/**
 * De perfil la mano ya está sobre el muslo; de frente, el hombro queda por fuera de la cadera. El antebrazo gira
 * hacia dentro (sobre el eje del brazo) lo justo para que la muñeca caiga encima del muslo y no en el aire, al lado.
 */
function twistOverThigh(who: AbsentWho): number {
  const { width } = ABSENT_BUILDS[who];
  const shoulderX = J.shoulder[0] * width;
  // El muslo se abre un poco al sentarse (SEAT_SPLAY): la mano cae algo por fuera de la cadera.
  const thighX = J.hip[0] * hipSpread(width) + THIGH_SPLAY_AT_HAND;
  return Math.asin(clamp((shoulderX - thighX) / length(FOREARM), 0, 0.9));
}

/** Abatido en el borde del catre: los codos en las rodillas, la cabeza colgando y las manos caídas delante. */
function slumped(who: AbsentWho, time: number, options: PoseOptions): AbsentPose {
  const p = ABSENT_BUILDS[who].posture;
  const seat = finite(options.seatHeight ?? DEFAULT_SEAT.slumped, DEFAULT_SEAT.slumped);
  const { bob, legs } = seatedLegs(who, seat, SEAT_REACH.slumped, SEAT_SPLAY.slumped);
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
  const { at, chest } = shoulderAt(pose);
  const knee = legChain(pose, 1).knee;
  const target = add(knee, { y: 0.14, z: -0.06 });
  const [upper, fore] = twoBone(at, target, length(UPPER_ARM), length(FOREARM), -1);
  const arm = armTowards(chest, upper, fore, 0.45, {
    shoulderRoll: ABSENT_BUILDS[who].posture.armOut,
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
