// Los gestos de los dos Ausentes sentados (plan de finales, F3; lógica pura): sobre la pose `seated` de
// absentPoses.ts, lo poco que se mueve en una escena tranquila. Mirar al otro, alzar la vista, ladear la cabeza,
// inclinarse un poco hacia el otro, sostener una taza delante del regazo y hacerla girar entre las manos, y que el
// signo del pecho brille algo más. Cada gesto es un número (las pistas de una cinemática: cinematic/timeline.ts),
// así que se mezclan solos y con 0 en todo la pose es la de siempre.
//
// Convenios (los de absentPoses.ts): `look` > 0 gira la cabeza a su izquierda; `lift` > 0 mira arriba; `tilt` y
// `lean` > 0 ladean la cabeza o el cuerpo a su izquierda.
import { absentPose, armTowards, DEFAULT_SEAT, type PoseOptions } from './absentPoses';
import { legChain, limbVectors, shoulderAt, type AbsentArmPose } from './absentChains';
import type { AbsentPose } from './absentChains';
import { mixAbsentPose } from './absentPoser';
import { add, clamp, finite, length, scaled, sub, twoBone } from './absentPlanar';
import { ABSENT_SKELETONS, lapRadius, type AbsentWho } from './absentSkeleton';

export interface SeatedGesture {
  /** Giro de la cabeza (rad, > 0 a su izquierda); el pecho la acompaña un poco. */
  readonly look: number;
  /** Alzar la vista (rad, > 0 arriba): el cuello pone una parte y la cabeza el resto. */
  readonly lift: number;
  /** Ladear la cabeza (rad, > 0 a su izquierda). */
  readonly tilt: number;
  /** Inclinar el cuerpo hacia un lado (rad, > 0 a su izquierda). */
  readonly lean: number;
  /** 0–1: las manos dejan los muslos y sostienen una taza delante del regazo. */
  readonly hold: number;
  /** Lo que ha girado la taza entre las manos (rad): las muñecas la acompañan. */
  readonly turn: number;
  /** 0–1: el signo del pecho brilla algo más. */
  readonly glow: number;
}

export const NEUTRAL_GESTURE: SeatedGesture = {
  look: 0,
  lift: 0,
  tilt: 0,
  lean: 0,
  hold: 0,
  turn: 0,
  glow: 0,
};

const LOOK_LIMIT = 0.6;
const LIFT_LIMIT = { down: -0.45, up: 0.55 } as const;
const TILT_LIMIT = 0.35;
const LEAN_LIMIT = 0.15;
/** La parte de la mirada arriba que pone el cuello (el resto, la cabeza). */
const NECK_SHARE = 0.35;
/** Lo que el pecho sigue a la cabeza al girarla. */
const CHEST_FOLLOW = 0.2;
/**
 * Dónde sostiene la taza: a qué parte del muslo y cuánto sobre el regazo (m). Él, ancho de pecho, la lleva más
 * adelante, casi sobre las rodillas, para que las manos no se le metan en el chaleco.
 */
const CUP_SPOT: Readonly<Record<AbsentWho, { along: number; above: number }>> = {
  cientifica: { along: 0.45, above: 0.12 },
  esceptico: { along: 1.0, above: 0.12 },
};
/** Media taza (radio 0,06) y lo gruesa que es la mano: a esto del centro queda cada palma. */
const CUP_GRIP = 0.085;
/** La palma: a esta parte del largo de la mano desde la muñeca (ahí se sujeta la taza). */
export const PALM_SHARE = 0.45;
/** Lo que se dobla la muñeca hacia la taza. */
const HAND_BEND = 0.15;
/** Lo que se mueven las muñecas al girar la taza. */
const WRIST_TURN = 0.06;
const GLOW_GAIN = 0.2;

const smooth = (x: number): number => {
  const u = clamp(finite(x), 0, 1);
  return u * u * (3 - 2 * u);
};

/**
 * Las dos manos alrededor de una taza, delante del regazo y hacia el centro del cuerpo. `grip` es el giro hacia
 * dentro de los brazos medido en el muñeco (absentGrip.ts); sin él, una estimación de perfil que se queda corta.
 */
function cupHands(who: AbsentWho, pose: AbsentPose, grip?: number): [AbsentArmPose, AbsentArmPose] {
  const { upperArm, forearm } = limbVectors(who);
  const { joints, posture, handLength } = ABSENT_SKELETONS[who];
  const { at, chest } = shoulderAt(who, pose);
  const leg = legChain(who, pose, 1);
  const thigh = sub(leg.knee, leg.hip);
  const up = scaled({ y: -thigh.z, z: thigh.y }, 1 / length(thigh));
  const spot = CUP_SPOT[who];
  const target = add(
    add(leg.hip, scaled(thigh, spot.along)),
    scaled(up, lapRadius(who) + spot.above),
  );
  const [upper, fore] = twoBone(at, target, length(upperArm), length(forearm), -1);
  // El brazo gira hacia dentro sobre el eje vertical (antes de echarse adelante): lo que se acercan las palmas es lo
  // que el antebrazo y la palma salen de la vertical del codo.
  const roll = posture.armOut - 0.08;
  const elbowOut = joints.shoulder[0] + length(upperArm) * Math.sin(roll);
  const sideways =
    length(forearm) * Math.abs(Math.sin(fore - upper)) +
    handLength * PALM_SHARE * Math.abs(Math.sin(fore + HAND_BEND - upper));
  const inward = clamp((elbowOut - CUP_GRIP) / Math.max(sideways, 1e-3), 0, 0.95);
  const arm = armTowards(who, chest, upper, fore, fore + HAND_BEND, {
    shoulderRoll: roll,
    twist: grip === undefined ? Math.asin(inward) : finite(grip),
  });
  return [arm, { ...arm }];
}

/** Las muñecas acompañan el giro de la taza, una hacia cada lado. */
function turningWrists(
  arms: readonly [AbsentArmPose, AbsentArmPose],
  turn: number,
  hold: number,
): [AbsentArmPose, AbsentArmPose] {
  const swing = WRIST_TURN * hold * Math.sin(turn);
  const [left, right] = arms;
  return [
    { ...left, twist: left.twist + swing, wrist: left.wrist + swing * 0.5 },
    { ...right, twist: right.twist - swing, wrist: right.wrist - swing * 0.5 },
  ];
}

export interface GestureOptions extends PoseOptions {
  /** El giro hacia dentro de los brazos con la taza, medido en el muñeco (absentGrip.ts `gripTwist`). */
  grip?: number;
}

/** La pose sentada de `who` en el instante `time` con un gesto encima. */
export function seatedGesture(
  who: AbsentWho,
  time: number,
  gesture: SeatedGesture,
  options: GestureOptions = {},
): AbsentPose {
  const base = absentPose(who, 'seated', time, {
    seatHeight: options.seatHeight ?? DEFAULT_SEAT.seated,
  });
  const look = clamp(finite(gesture.look + (options.look ?? 0)), -LOOK_LIMIT, LOOK_LIMIT);
  const lift = clamp(finite(gesture.lift), LIFT_LIMIT.down, LIFT_LIMIT.up);
  const lean = clamp(finite(gesture.lean), -LEAN_LIMIT, LEAN_LIMIT);
  const posed: AbsentPose = {
    ...base,
    headYaw: look,
    chestYaw: base.chestYaw + look * CHEST_FOLLOW,
    neckPitch: base.neckPitch + lift * NECK_SHARE,
    headPitch: base.headPitch + lift * (1 - NECK_SHARE),
    headRoll: base.headRoll + clamp(finite(gesture.tilt), -TILT_LIMIT, TILT_LIMIT),
    spineRoll: base.spineRoll + lean,
    sign: Math.min(1, base.sign + GLOW_GAIN * clamp(finite(gesture.glow), 0, 1)),
  };
  const hold = smooth(gesture.hold);
  if (hold === 0) return posed;
  const holding = mixAbsentPose(
    posed,
    { ...posed, arms: cupHands(who, posed, options.grip) },
    hold,
  );
  return { ...holding, arms: turningWrists(holding.arms, finite(gesture.turn), hold) };
}
