// El esqueleto de los dos Ausentes vivos (plan de finales, E3; aspecto ✅ Anthony 2026-11-06): las articulaciones
// de cada uno en el marco de diseño de los personajes (Z arriba, frente +Y, derecha +X, los pies en z = 0) y cómo se
// tienen en pie. Lógica pura, sin Three: la comparten las poses (absentPoses.ts), la silueta (absentShape.ts) y el
// modelo (absentModel.ts).
//
// 🟡 (Anthony 2026-11-14: «él más alto que ella»): ella mide unos 2,6 m y es esbelta, de hombros estrechos, cintura
// marcada, caderas anchas y cuello largo; él, unos 3 m, ancho de hombros y de pecho, de cuello corto y grueso y algo
// encorvado. Los dos siguen siendo «de más de 2,5 m» (✅).
import type { Triple } from '../worlds/procedural/kit';

/** ✅ Son dos: la científica (el Contrapeso) y el escéptico (el bucle). */
export type AbsentWho = 'cientifica' | 'esceptico';

export const ABSENT_WHO: readonly AbsentWho[] = ['cientifica', 'esceptico'];

export type AbsentJointName =
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle';

/** Las articulaciones del lado derecho (+X); el izquierdo es su espejo. */
export type AbsentJoints = Readonly<Record<AbsentJointName, Triple>>;

/** Cómo se tienen en pie (rad, > 0 hacia atrás; los hombros en m, < 0 caídos). */
export interface AbsentPosture {
  spine: number;
  chest: number;
  neck: number;
  head: number;
  shrug: number;
  /** Lo que cuelgan los brazos hacia delante (rad) y lo que se separan del cuerpo. */
  armHang: number;
  armOut: number;
  /** Lo que se abren las piernas de pie (rad): ella, juntas bajo la túnica; él, plantado. */
  stance: number;
  /** Lo que adelantan los pies respecto a la cadera al sentarse (m) y cuánto se abren las rodillas (rad). */
  seatReach: { seated: number; slumped: number };
  seatSplay: { seated: number; slumped: number };
}

export interface AbsentSkeleton {
  joints: AbsentJoints;
  /** Lo que hay del eje del muslo al asiento, junto a la cadera (muslo y ropa): lo que apoya al sentarse (m). */
  seatRadius: number;
  /** Del eje del muslo a lo alto del regazo (muslo y ropa): donde apoyan las manos sentados (m). */
  lapRadius: number;
  /** Largo de la mano, de la muñeca a la punta de los dedos (m). */
  handLength: number;
  posture: AbsentPosture;
}

export const ABSENT_SKELETONS: Record<AbsentWho, AbsentSkeleton> = {
  cientifica: {
    joints: {
      pelvis: [0, 0, 1.27],
      spine: [0, 0, 1.39],
      chest: [0, 0, 1.6],
      neck: [0, 0, 1.92],
      head: [0, 0.015, 2.19],
      shoulder: [0.25, 0, 1.86],
      elbow: [0.275, -0.005, 1.43],
      wrist: [0.3, 0.02, 1],
      hip: [0.13, 0, 1.22],
      knee: [0.135, 0.02, 0.68],
      ankle: [0.135, 0, 0.105],
    },
    seatRadius: 0.16,
    lapRadius: 0.2,
    handLength: 0.22,
    posture: {
      spine: 0.02,
      chest: 0.02,
      neck: 0.03,
      head: 0.02,
      shrug: 0.01,
      armHang: 0.04,
      armOut: 0.12,
      stance: 0,
      seatReach: { seated: 0.56, slumped: 0.56 },
      seatSplay: { seated: 0, slumped: 0.03 },
    },
  },
  esceptico: {
    joints: {
      pelvis: [0, 0, 1.57],
      spine: [0, 0, 1.69],
      chest: [0, 0, 1.99],
      neck: [0, 0, 2.42],
      head: [0, 0.03, 2.6],
      shoulder: [0.46, 0, 2.31],
      elbow: [0.5, -0.01, 1.78],
      wrist: [0.53, 0.03, 1.26],
      hip: [0.19, 0, 1.51],
      knee: [0.2, 0.02, 0.85],
      ankle: [0.2, 0, 0.13],
    },
    seatRadius: 0.16,
    lapRadius: 0.19,
    handLength: 0.28,
    posture: {
      spine: -0.08,
      chest: -0.2,
      neck: -0.14,
      head: -0.12,
      shrug: -0.05,
      armHang: 0.06,
      armOut: 0.05,
      stance: 0.045,
      seatReach: { seated: 0.74, slumped: 0.7 },
      seatSplay: { seated: 0.08, slumped: 0.14 },
    },
  },
};

export const absentSkeleton = (who: AbsentWho): AbsentSkeleton => ABSENT_SKELETONS[who];

/** Las articulaciones de `who` a un lado (+1 derecha, −1 izquierda, 0 el eje del cuerpo). */
export function sidedJoint(who: AbsentWho, joint: AbsentJointName, side: number): Triple {
  const [x, y, z] = ABSENT_SKELETONS[who].joints[joint];
  return [side === 0 ? x : x * side, y, z];
}

/** Lo que queda entre la cadera y el asiento al sentarse: el muslo de cada uno con su ropa (m). */
export function thighRadius(who: AbsentWho): number {
  return ABSENT_SKELETONS[who].seatRadius;
}

/** Lo alto del regazo sobre el eje del muslo (m): ahí descansan las manos al sentarse. */
export function lapRadius(who: AbsentWho): number {
  return ABSENT_SKELETONS[who].lapRadius;
}

/** Media distancia entre los hombros y entre las caderas (m), para comparar siluetas. */
export function shoulderSpan(who: AbsentWho): number {
  return ABSENT_SKELETONS[who].joints.shoulder[0];
}

/** Largo del cuello: de su base a donde entra en la cabeza (m). */
export function neckLength(who: AbsentWho): number {
  const { neck, head } = ABSENT_SKELETONS[who].joints;
  return head[2] - neck[2];
}
