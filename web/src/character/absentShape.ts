// La silueta de los dos Ausentes vivos (plan de finales, E3; 🟡 Anthony 2026-11-14: «que se note que ella es hembra
// y él macho, también de lejos»): las secciones de su tronco, cuello, cabeza y miembros, y sus aros de oro. Datos
// puros, sin Three (las superficies se tejen en absentLoft.ts). Marco de diseño: Z arriba, frente +Y, derecha +X.
//
// Ella: hombros estrechos, cintura muy marcada, caderas anchas (la túnica), cuello largo y fino, brazos y manos
// delicados, y la cabeza de vidrio alargada hacia atrás, como una cresta. Él: hombros, pecho y espalda grandes,
// cintura gruesa, cuello corto y ancho, antebrazos de forjador, manos grandes y la cabeza más ancha y redonda.
import { ABSENT_SKELETONS, type AbsentJointName, type AbsentWho } from './absentSkeleton';
import type { Triple } from '../worlds/procedural/kit';

/** Una sección horizontal: centro (x, y), media anchura y lo que llega por delante (+Y) y por detrás. */
export interface Section {
  z: number;
  x?: number;
  y?: number;
  rx: number;
  front: number;
  back: number;
}

/** Una sección de un miembro a una fracción `t` de su hueso (0 la articulación de arriba, 1 la de abajo). */
export type LimbSection = readonly [t: number, rx: number, front: number, back: number];

export interface Bulb {
  center: Triple;
  radii: Triple;
}

export interface AbsentBodyShape {
  /** Del bajo vientre a la base del cuello. */
  torso: readonly Section[];
  /** Ranuras entre placas de cerámica (alturas). */
  seams: readonly number[];
  neck: readonly Section[];
  head: readonly Section[];
  /** El hombro (deltoides), en el lado derecho. */
  shoulder: Bulb;
  upperArm: readonly LimbSection[];
  forearm: readonly LimbSection[];
  thigh: readonly LimbSection[];
  shin: readonly LimbSection[];
  /** Altura de la placa del pecho donde brilla el signo y su media anchura y alto. */
  plate: readonly [z: number, width: number, height: number];
}

const s = (z: number, rx: number, front: number, back: number, y = 0): Section => ({
  z,
  rx,
  front,
  back,
  y,
});

export const ABSENT_SHAPES: Record<AbsentWho, AbsentBodyShape> = {
  cientifica: {
    torso: [
      s(1.3, 0.125, 0.092, 0.1),
      s(1.42, 0.126, 0.092, 0.097),
      s(1.5, 0.138, 0.103, 0.1),
      s(1.6, 0.162, 0.124, 0.108),
      s(1.69, 0.182, 0.143, 0.116),
      s(1.77, 0.196, 0.14, 0.12),
      s(1.835, 0.2, 0.118, 0.118),
      s(1.885, 0.165, 0.094, 0.102),
      s(1.925, 0.092, 0.068, 0.078),
      s(1.96, 0.06, 0.056, 0.06),
    ],
    seams: [1.6, 1.79],
    neck: [
      s(1.9, 0.075, 0.068, 0.074),
      s(1.97, 0.06, 0.056, 0.06),
      s(2.08, 0.055, 0.052, 0.056, 0.006),
      s(2.2, 0.053, 0.05, 0.054, 0.016),
    ],
    head: [
      s(2.155, 0.05, 0.05, 0.05, 0.02),
      s(2.18, 0.096, 0.104, 0.096, 0.025),
      s(2.23, 0.129, 0.15, 0.138, 0.02),
      s(2.3, 0.144, 0.168, 0.16, 0.01),
      s(2.38, 0.146, 0.166, 0.176, -0.005),
      s(2.46, 0.137, 0.148, 0.188, -0.03),
      s(2.53, 0.114, 0.114, 0.19, -0.065),
      s(2.58, 0.08, 0.075, 0.16, -0.1),
      s(2.61, 0.042, 0.04, 0.1, -0.13),
      s(2.626, 0.002, 0.002, 0.004, -0.14),
    ],
    shoulder: { center: [0.258, 0, 1.845], radii: [0.064, 0.067, 0.06] },
    upperArm: [
      [-0.04, 0.05, 0.05, 0.05],
      [0.12, 0.05, 0.052, 0.049],
      [0.38, 0.047, 0.05, 0.046],
      [0.72, 0.039, 0.04, 0.039],
      [0.96, 0.035, 0.035, 0.036],
      [1.05, 0.03, 0.03, 0.03],
    ],
    forearm: [
      [-0.05, 0.03, 0.03, 0.032],
      [0.08, 0.037, 0.035, 0.039],
      [0.3, 0.038, 0.035, 0.035],
      [0.72, 0.029, 0.026, 0.026],
      [1.0, 0.024, 0.021, 0.021],
      [1.04, 0.022, 0.019, 0.019],
    ],
    // Bajo la túnica no se ven: solo el tobillo, bajo el dobladillo.
    thigh: [],
    shin: [
      [0.62, 0.034, 0.033, 0.036],
      [0.85, 0.03, 0.029, 0.03],
      [1.0, 0.027, 0.026, 0.027],
      [1.04, 0.024, 0.023, 0.024],
    ],
    plate: [1.72, 0.07, 0.085],
  },
  esceptico: {
    torso: [
      s(1.315, 0.01, 0.01, 0.012),
      s(1.345, 0.09, 0.07, 0.08),
      s(1.4, 0.18, 0.125, 0.14),
      s(1.47, 0.215, 0.145, 0.17),
      s(1.56, 0.232, 0.155, 0.176),
      s(1.67, 0.226, 0.152, 0.15),
      s(1.79, 0.252, 0.168, 0.152),
      s(1.92, 0.296, 0.196, 0.166),
      s(2.05, 0.338, 0.218, 0.186),
      s(2.17, 0.366, 0.224, 0.2),
      s(2.27, 0.374, 0.2, 0.206, -0.005),
      s(2.34, 0.33, 0.158, 0.192, -0.01),
      s(2.405, 0.205, 0.118, 0.155, -0.012),
      s(2.46, 0.118, 0.102, 0.11, -0.005),
    ],
    seams: [1.82, 1.99, 2.24],
    neck: [
      s(2.4, 0.13, 0.115, 0.13),
      s(2.46, 0.112, 0.102, 0.112),
      s(2.54, 0.104, 0.098, 0.106, 0.012),
      s(2.63, 0.1, 0.095, 0.1, 0.028),
    ],
    head: [
      s(2.585, 0.08, 0.08, 0.08, 0.035),
      s(2.62, 0.148, 0.158, 0.148, 0.038),
      s(2.69, 0.184, 0.198, 0.19, 0.036),
      s(2.78, 0.196, 0.212, 0.205, 0.03),
      s(2.87, 0.192, 0.204, 0.206, 0.024),
      s(2.95, 0.166, 0.172, 0.184, 0.018),
      s(3.01, 0.118, 0.116, 0.132, 0.013),
      s(3.05, 0.058, 0.058, 0.066, 0.01),
      s(3.066, 0.003, 0.003, 0.004, 0.01),
    ],
    shoulder: { center: [0.476, 0, 2.285], radii: [0.118, 0.12, 0.112] },
    upperArm: [
      [-0.04, 0.09, 0.09, 0.09],
      [0.1, 0.094, 0.097, 0.094],
      [0.36, 0.09, 0.1, 0.087],
      [0.7, 0.076, 0.077, 0.075],
      [0.96, 0.066, 0.066, 0.067],
      [1.05, 0.058, 0.058, 0.058],
    ],
    forearm: [
      [-0.05, 0.06, 0.06, 0.062],
      [0.06, 0.07, 0.066, 0.072],
      [0.26, 0.082, 0.074, 0.077],
      [0.7, 0.062, 0.055, 0.055],
      [1.0, 0.05, 0.042, 0.043],
      [1.04, 0.047, 0.04, 0.04],
    ],
    // Piernas de gigante: muslos gruesos y pantorrillas que se notan (de lejos no deben parecer palos).
    thigh: [
      [-0.13, 0.055, 0.055, 0.065],
      [-0.07, 0.128, 0.126, 0.136],
      [0.02, 0.163, 0.158, 0.16],
      [0.3, 0.156, 0.156, 0.15],
      [0.62, 0.13, 0.13, 0.122],
      [0.92, 0.1, 0.098, 0.098],
      [1.02, 0.09, 0.088, 0.09],
    ],
    shin: [
      [-0.03, 0.088, 0.082, 0.088],
      [0.08, 0.094, 0.086, 0.098],
      [0.28, 0.102, 0.083, 0.118],
      [0.62, 0.077, 0.068, 0.08],
      [0.92, 0.06, 0.057, 0.06],
      [1.04, 0.055, 0.052, 0.055],
    ],
    plate: [2.17, 0.085, 0.095],
  },
};

/** Las secciones de un miembro en el marco de diseño, del hueso que va de `from` a `to` (lado derecho). */
export function limbSections(
  who: AbsentWho,
  from: AbsentJointName,
  to: AbsentJointName,
  profile: readonly LimbSection[],
): Section[] {
  const a = ABSENT_SKELETONS[who].joints[from];
  const b = ABSENT_SKELETONS[who].joints[to];
  const at = (k: number, t: number): number => (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * t;
  // De abajo arriba, como las demás secciones.
  return profile
    .map(([t, rx, front, back]) => ({ z: at(2, t), x: at(0, t), y: at(1, t), rx, front, back }))
    .sort((p, q) => p.z - q.z);
}

/** Lo alto de la coronilla en reposo (m). */
export function crownHeight(who: AbsentWho): number {
  const head = ABSENT_SHAPES[who].head;
  return head[head.length - 1]?.z ?? 0;
}

/** De lo bajo de la cabeza a la coronilla: una fracción (0–1) de esa altura en metros. */
export function headHeightAt(who: AbsentWho, fraction: number): number {
  const head = ABSENT_SHAPES[who].head;
  const bottom = head[0]?.z ?? 0;
  return bottom + (crownHeight(who) - bottom) * fraction;
}

// ---- Los aros de oro (🟡: Anthony recuerda «una especie de aros dorados»; no estaba escrito) --------------------

export type RingPlace = 'neck' | 'wrist' | 'ankle' | 'head';

/** Unos aros en un sitio del cuerpo: cuántos, lo gruesos que son (radio del tubo, m) y a qué alturas. */
export interface GoldRings {
  place: RingPlace;
  count: number;
  tube: number;
}

/** Ella, muchos y finos; él, pocos y gruesos. */
export const ABSENT_RINGS: Record<AbsentWho, readonly GoldRings[]> = {
  cientifica: [
    { place: 'neck', count: 4, tube: 0.0055 },
    { place: 'wrist', count: 2, tube: 0.0042 },
    { place: 'ankle', count: 2, tube: 0.0045 },
    { place: 'head', count: 2, tube: 0.0042 },
  ],
  esceptico: [
    { place: 'neck', count: 1, tube: 0.02 },
    { place: 'wrist', count: 1, tube: 0.014 },
    { place: 'ankle', count: 1, tube: 0.013 },
    { place: 'head', count: 1, tube: 0.0075 },
  ],
};

/**
 * Un aro que flota alrededor de la cabeza, inclinado como una órbita (nunca horizontal sobre ella ni de canto detrás:
 * no es un halo). Por delante pasa bajo el óvalo (sin tapar el vidrio ni sus dibujos) y por detrás sube.
 */
export interface HeadRing {
  /** Centro del aro (m) y sus semiejes en su plano (a lo ancho y de delante atrás). */
  center: Triple;
  width: number;
  depth: number;
  /** Inclinación (rad, > 0: el frente baja y la espalda sube) y giro sobre la vertical. */
  tilt: number;
  yaw: number;
}

export const HEAD_RINGS: Record<AbsentWho, readonly HeadRing[]> = {
  cientifica: [
    { center: [0, -0.025, 2.29], width: 0.2, depth: 0.26, tilt: 0.56, yaw: 0.2 },
    // Por detrás pasa por fuera de la cresta, que se alarga hacia atrás.
    { center: [0, -0.05, 2.33], width: 0.19, depth: 0.29, tilt: 0.62, yaw: -0.24 },
  ],
  esceptico: [{ center: [0, 0.015, 2.72], width: 0.255, depth: 0.28, tilt: 0.42, yaw: 0.12 }],
};
