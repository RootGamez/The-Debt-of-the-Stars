// Las posturas de un Ool articulado (F4, la escena del nido; 🟡 los gestos): mirar al cielo, señalarlo, tender las
// manos, leer un libro, asentir. Un Ool es una pera blanda sin cuello: se inclina por la cadera, gira la cabeza y
// levanta los brazos cortos. Pura: character/oolRig.ts aplica la postura a las piezas.
//
// Marco del Ool (como worlds/procedural/ool.ts): Y arriba, frente hacia −Z, +X a su derecha. Ángulos en radianes:
// `lean` > 0 se inclina hacia delante; `headPitch` > 0 alza la vista; `headYaw` > 0 gira la cabeza hacia su izquierda;
// `raise` > 0 levanta el brazo hacia delante y `out` > 0 lo abre hacia fuera.

export interface OolArmPose {
  raise: number;
  out: number;
}

export interface OolPose {
  lean: number;
  /** Lo que gira el cuerpo sobre los pies (rad, > 0 hacia su izquierda). */
  turn: number;
  headPitch: number;
  headYaw: number;
  /** Ladear la cabeza (rad, > 0 hacia su derecha). */
  headTilt: number;
  armL: OolArmPose;
  armR: OolArmPose;
  /** Cuánto brillan sus luces (1 = lo de siempre). */
  glow: number;
}

/** Hasta dónde llega cada articulación (rad): un Ool no tiene cuello y sus brazos son cortos. */
export const OOL_LIMITS = {
  lean: [-0.35, 0.5],
  headPitch: [-0.6, 0.85],
  headYaw: [-1.1, 1.1],
  headTilt: [-0.4, 0.4],
  raise: [-0.4, 2.9],
  out: [-0.4, 1.4],
} as const;

const ARM_REST: OolArmPose = { raise: 0, out: 0 };

export const REST_POSE: OolPose = {
  lean: 0,
  turn: 0,
  headPitch: 0,
  headYaw: 0,
  headTilt: 0,
  armL: ARM_REST,
  armR: ARM_REST,
  glow: 1,
};

const clamp = (x: number, [low, high]: readonly [number, number]): number =>
  Math.min(high, Math.max(low, Number.isFinite(x) ? x : 0));
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

function mixArm(a: OolArmPose, b: OolArmPose, k: number): OolArmPose {
  return { raise: mix(a.raise, b.raise, k), out: mix(a.out, b.out, k) };
}

/** De `a` a `b` (k = 0 … 1). */
export function blendPose(a: OolPose, b: OolPose, k: number): OolPose {
  const t = Math.min(1, Math.max(0, k));
  return {
    lean: mix(a.lean, b.lean, t),
    turn: mix(a.turn, b.turn, t),
    headPitch: mix(a.headPitch, b.headPitch, t),
    headYaw: mix(a.headYaw, b.headYaw, t),
    headTilt: mix(a.headTilt, b.headTilt, t),
    armL: mixArm(a.armL, b.armL, t),
    armR: mixArm(a.armR, b.armR, t),
    glow: mix(a.glow, b.glow, t),
  };
}

/** La postura dentro de lo que el cuerpo puede hacer. */
export function clampPose(pose: OolPose): OolPose {
  const arm = (a: OolArmPose): OolArmPose => ({
    raise: clamp(a.raise, OOL_LIMITS.raise),
    out: clamp(a.out, OOL_LIMITS.out),
  });
  return {
    lean: clamp(pose.lean, OOL_LIMITS.lean),
    turn: Number.isFinite(pose.turn) ? pose.turn : 0,
    headPitch: clamp(pose.headPitch, OOL_LIMITS.headPitch),
    headYaw: clamp(pose.headYaw, OOL_LIMITS.headYaw),
    headTilt: clamp(pose.headTilt, OOL_LIMITS.headTilt),
    armL: arm(pose.armL),
    armR: arm(pose.armR),
    glow: Math.max(0, Number.isFinite(pose.glow) ? pose.glow : 1),
  };
}

/** Mirar al cielo: la cabeza alzada y el cuerpo algo echado atrás para ver más alto (amount 0 … 1). */
export function lookUpPose(amount = 1): OolPose {
  const k = Math.min(1, Math.max(0, amount));
  return { ...REST_POSE, lean: -0.22 * k, headPitch: 0.8 * k, armL: { raise: 0, out: 0.12 * k } };
}

/** Señalar arriba con la mano derecha, mirando hacia allí. */
export function pointUpPose(): OolPose {
  return {
    ...lookUpPose(1),
    armR: { raise: 2.55, out: 0.25 },
    glow: 1.25,
  };
}

/** Tender las dos manos hacia delante (para recibir algo). */
export function reachPose(): OolPose {
  return {
    ...REST_POSE,
    lean: 0.16,
    headPitch: -0.12,
    armL: { raise: 1.15, out: -0.18 },
    armR: { raise: 1.15, out: -0.18 },
  };
}

/** Leer un libro abierto sostenido con las dos manos: la cabeza baja hacia las páginas. */
export function readingPose(): OolPose {
  return {
    ...REST_POSE,
    lean: 0.1,
    headPitch: -0.42,
    armL: { raise: 0.95, out: -0.22 },
    armR: { raise: 0.95, out: -0.22 },
  };
}

/** El libro bajado, aún en las manos, mirando a quien habla. */
export function bookLoweredPose(): OolPose {
  return {
    ...REST_POSE,
    headPitch: 0.08,
    armL: { raise: 0.5, out: -0.18 },
    armR: { raise: 0.5, out: -0.18 },
  };
}

/** Lo que baja la cabeza al asentir (rad) a los `seconds` de empezar: dos cabezadas cortas en un segundo. */
export function nod(seconds: number): number {
  if (seconds < 0 || seconds > 1) return 0;
  return -0.22 * Math.sin(seconds * Math.PI * 2) ** 2;
}

/** Respirar: el cuerpo se inclina y la luz late un poco (desfasado por Ool con `seed`). */
export function breathe(time: number, seed = 0): { lean: number; glow: number } {
  const phase = time * 1.7 + seed * 2.39;
  return { lean: 0.015 * Math.sin(phase), glow: 0.06 * Math.sin(phase * 0.5) };
}

/**
 * Hacia dónde girar la cabeza para mirar `target` desde `eye` (los dos en el marco del Ool: Y arriba, frente −Z):
 * giro (> 0 a su izquierda) y altura (> 0 arriba), dentro de lo que puede.
 */
export function aimHead(
  eye: readonly [number, number, number],
  target: readonly [number, number, number],
): { yaw: number; pitch: number } {
  const dx = target[0] - eye[0];
  const dy = target[1] - eye[1];
  const dz = target[2] - eye[2];
  const flat = Math.hypot(dx, dz);
  if (flat < 1e-6 && Math.abs(dy) < 1e-6) return { yaw: 0, pitch: 0 };
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, flat);
  return {
    yaw: clamp(yaw, OOL_LIMITS.headYaw),
    pitch: clamp(pitch, OOL_LIMITS.headPitch),
  };
}
