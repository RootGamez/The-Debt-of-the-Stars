// El esqueleto de los dos Ausentes vivos (plan de finales, E3; aspecto ✅ Anthony 2026-11-06): las articulaciones
// en el marco de diseño de los personajes (Z arriba, frente +Y, derecha +X, los pies en z = 0) y la complexión de
// cada uno. Lógica pura, sin Three: la comparten las poses (absentPoses.ts) y el modelo (absentModel.ts).
// Las medidas son las del Ausente de los murales (absent.ts): 2,78 m de los pies a la coronilla.
import type { Triple } from '../worlds/procedural/kit';

/** ✅ Son dos: la científica (el Contrapeso) y el escéptico (el bucle). */
export type AbsentWho = 'cientifica' | 'esceptico';

export const ABSENT_WHO: readonly AbsentWho[] = ['cientifica', 'esceptico'];

/** Las articulaciones del lado derecho (+X); el izquierdo es su espejo. */
export const ABSENT_JOINTS = {
  pelvis: [0, 0, 1.36],
  spine: [0, 0, 1.47],
  chest: [0, 0, 1.76],
  neck: [0, 0, 2.16],
  head: [0, 0.01, 2.33],
  shoulder: [0.36, 0, 2.05],
  elbow: [0.41, 0.01, 1.57],
  wrist: [0.44, 0.03, 1.1],
  hip: [0.17, 0, 1.32],
  knee: [0.18, 0.02, 0.75],
  ankle: [0.18, 0, 0.12],
} as const satisfies Record<string, Triple>;

/** La cabeza: un óvalo alto de vidrio (centro y semiejes); su coronilla es la altura del Ausente. */
export const ABSENT_HEAD = {
  center: [0, 0.02, 2.53] as Triple,
  radii: [0.18, 0.205, 0.25] as Triple,
};

/** Radio del muslo junto a la cadera (m) en un Ausente de grosor 1. */
export const THIGH_TOP_RADIUS = 0.125;
/** Largo de la mano, de la muñeca a la punta de los dedos (m). */
export const HAND_LENGTH = 0.24;

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
}

export interface AbsentBuild {
  /** Ancho del tronco y de los hombros (1 = el Ausente de los murales). */
  width: number;
  /** Grosor de brazos y piernas. */
  limb: number;
  posture: AbsentPosture;
}

/**
 * La complexión (🟡): ella más esbelta y erguida; él más ancho, encorvado y con los hombros caídos. Con el signo
 * del pecho, es lo que los distingue de lejos.
 */
export const ABSENT_BUILDS: Record<AbsentWho, AbsentBuild> = {
  cientifica: {
    width: 0.9,
    limb: 0.9,
    posture: {
      spine: 0.02,
      chest: 0.02,
      neck: 0.03,
      head: 0.02,
      shrug: 0.01,
      armHang: 0.04,
      armOut: 0.1,
    },
  },
  esceptico: {
    width: 1.08,
    limb: 1.08,
    posture: {
      spine: -0.08,
      chest: -0.2,
      neck: -0.14,
      head: -0.12,
      shrug: -0.05,
      armHang: 0.06,
      armOut: 0.05,
    },
  },
};

/** Cuánto se separan las caderas con la anchura del tronco (la mitad que los hombros). */
export function hipSpread(width: number): number {
  return 1 + (width - 1) * 0.5;
}

/** Lo que queda entre la cadera y el asiento al sentarse: el radio del muslo de cada uno (m). */
export function thighRadius(who: AbsentWho): number {
  return THIGH_TOP_RADIUS * ABSENT_BUILDS[who].limb;
}
