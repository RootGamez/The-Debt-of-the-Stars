// Pasar de una pose a otra sin saltos (plan de finales, E3; lógica pura): quién está en qué pose y, a medio cambio,
// desde dónde. Despertar del hielo es lento; sentarse o levantarse, pausado. Cada paso da un estado nuevo.
import { absentPose, type AbsentPoseName, type PoseOptions } from './absentPoses';
import { legChain, type AbsentArmPose, type AbsentPose } from './absentChains';
import { finite } from './absentPlanar';
import { ABSENT_SKELETONS, type AbsentWho } from './absentSkeleton';
import type { LegPose } from './gait';

/** Transiciones (s). */
const WAKE_SECONDS = 6;
const FREEZE_SECONDS = 3;
const SIT_SECONDS = 2.4;
const BLEND_SECONDS = 1.5;
/** Un fotograma larguísimo (una pestaña en segundo plano) no se come el cambio de golpe. */
const MAX_DT = 0.1;

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

function mixLeg(a: LegPose, b: LegPose, t: number): LegPose {
  return {
    hip: mix(a.hip, b.hip, t),
    hipRoll: mix(a.hipRoll, b.hipRoll, t),
    knee: mix(a.knee, b.knee, t),
    ankle: mix(a.ankle, b.ankle, t),
  };
}

function mixArm(a: AbsentArmPose, b: AbsentArmPose, t: number): AbsentArmPose {
  return {
    shoulder: mix(a.shoulder, b.shoulder, t),
    shoulderRoll: mix(a.shoulderRoll, b.shoulderRoll, t),
    elbow: mix(a.elbow, b.elbow, t),
    wrist: mix(a.wrist, b.wrist, t),
    twist: mix(a.twist, b.twist, t),
  };
}

/** Mezcla dos poses: 0 es `a`, 1 es `b`. */
export function mixAbsentPose(a: AbsentPose, b: AbsentPose, t: number): AbsentPose {
  const m = (key: keyof Omit<AbsentPose, 'legs' | 'arms'>): number => mix(a[key], b[key], t);
  return {
    bob: m('bob'),
    pelvisPitch: m('pelvisPitch'),
    spinePitch: m('spinePitch'),
    spineRoll: m('spineRoll'),
    chestPitch: m('chestPitch'),
    chestYaw: m('chestYaw'),
    neckPitch: m('neckPitch'),
    headPitch: m('headPitch'),
    headYaw: m('headYaw'),
    headRoll: m('headRoll'),
    shrug: m('shrug'),
    breath: m('breath'),
    sign: m('sign'),
    patterns: m('patterns'),
    frost: m('frost'),
    legs: [mixLeg(a.legs[0], b.legs[0], t), mixLeg(a.legs[1], b.legs[1], t)],
    arms: [mixArm(a.arms[0], b.arms[0], t), mixArm(a.arms[1], b.arms[1], t)],
  };
}

/** Quién está en qué pose y, si está cambiando, desde dónde. Inmutable: cada paso da uno nuevo. */
export interface AbsentPoser {
  readonly who: AbsentWho;
  readonly name: AbsentPoseName;
  readonly options: PoseOptions;
  readonly time: number;
  /** La pose de la que viene (fija) mientras dura el cambio. */
  readonly from: AbsentPose | undefined;
  readonly blend: number;
  readonly duration: number;
}

export function createAbsentPoser(
  who: AbsentWho,
  name: AbsentPoseName,
  options: PoseOptions = {},
): AbsentPoser {
  return { who, name, options, time: 0, from: undefined, blend: 1, duration: 0 };
}

const isSeated = (name: AbsentPoseName): boolean => name === 'seated' || name === 'slumped';

function transitionSeconds(from: AbsentPose, a: AbsentPoseName, b: AbsentPoseName): number {
  const base =
    b === 'frozen' ? FREEZE_SECONDS : isSeated(a) !== isSeated(b) ? SIT_SECONDS : BLEND_SECONDS;
  // Si aún le queda escarcha (a medio despertar), el deshielo sigue a su paso.
  return Math.max(base, WAKE_SECONDS * from.frost * (b === 'frozen' ? 0 : 1));
}

const sameOptions = (a: PoseOptions, b: PoseOptions): boolean =>
  a.seatHeight === b.seatHeight && a.look === b.look;

/** Cambia a la pose `name` desde donde esté ahora (también a medio cambio), sin saltos. */
export function switchAbsentPose(
  poser: AbsentPoser,
  name: AbsentPoseName,
  options: PoseOptions = {},
): AbsentPoser {
  if (name === poser.name && sameOptions(options, poser.options)) return poser;
  const from = currentAbsentPose(poser);
  return {
    ...poser,
    name,
    options,
    from,
    blend: 0,
    duration: transitionSeconds(from, poser.name, name),
  };
}

/** Avanza el tiempo (s). Un paso raro (negativo o no finito) no cambia nada. */
export function advanceAbsentPoser(poser: AbsentPoser, dt: number): AbsentPoser {
  const step = Math.min(MAX_DT, Math.max(0, finite(dt)));
  if (step === 0) return poser;
  const blend = poser.from ? Math.min(1, poser.blend + step / poser.duration) : 1;
  return {
    ...poser,
    time: poser.time + step,
    blend,
    from: blend >= 1 ? undefined : poser.from,
  };
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** La pose de ahora. A medio cambio, los pies no se hunden en el suelo: la pelvis sube lo que haga falta. */
export function currentAbsentPose(poser: AbsentPoser): AbsentPose {
  const target = absentPose(poser.who, poser.name, poser.time, poser.options);
  if (!poser.from) return target;
  const pose = mixAbsentPose(poser.from, target, smooth(poser.blend));
  const lowest = Math.min(
    legChain(poser.who, pose, 0).ankle.z,
    legChain(poser.who, pose, 1).ankle.z,
  );
  const lift = Math.max(0, ABSENT_SKELETONS[poser.who].joints.ankle[2] - lowest);
  return lift > 0 ? { ...pose, bob: pose.bob + lift } : pose;
}
