// Llevar algo en brazos (lógica pura, sin escena): dónde va el objeto delante del pecho según su tamaño real y qué
// pose de brazos pone las dos palmas en sus costados. La pose sale de una cinemática directa del brazo con las
// mismas medidas (JOINTS) y los mismos giros que el muñeco (explorerModel.ts `setPose`), afinada por descenso por
// coordenadas: así las manos tocan el objeto de verdad, sea una campana o el Contrapeso.
//
// Marcos: lo de diseño va con Z arriba y frente +Y (explorerBody.ts); el resultado va en el marco del torso del
// muñeco (Y arriba, frente −Z, derecha +X, origen en su pivote), porque el objeto cuelga del torso.
import { Euler, Quaternion, Vector3 } from 'three';
import { EYE_HEIGHT } from '../data/movement';
import type { Triple } from '../worlds/procedural/kit';
import { CHEST, JOINTS, sided } from './explorerBody';
import type { ArmPose } from './gait';

/** Las medidas del objeto que se lleva (m): ancho (de lado a lado), alto y fondo (de delante atrás). */
export interface CarrySize {
  width: number;
  height: number;
  depth: number;
}

export interface CarryGrip {
  /** Pose de los dos brazos (izquierdo, derecho) con las palmas en los costados del objeto. */
  arms: readonly [ArmPose, ArmPose];
  /** Centro del objeto en el marco del torso. */
  center: Triple;
  /** Dónde quedan las palmas con esa pose (marco del torso) y lo que se separan de donde debían (m). */
  palms: readonly [Triple, Triple];
  miss: number;
}

/** El objeto va con su borde de arriba así de por debajo de los ojos (m): se ve en primera persona sin tapar. */
const BELOW_EYES = 0.1;
/** Altura del centro del objeto (diseño, m): ni más abajo de la tripa ni más arriba de los hombros. */
const HOLD_LOW = 0.58;
const HOLD_HIGH = 0.9;
/** Las palmas, a cada lado: lo que abulta el guante y lo más y lo menos que se abren los brazos (m). */
const GLOVE = 0.03;
const HALF_SPAN_MIN = 0.06;
const HALF_SPAN_MAX = 0.34;
/** Hueco entre el pecho y el objeto, y lo que entran las palmas en él desde atrás como mucho (m). */
const CHEST_GAP = 0.02;
const GRIP_DEPTH = 0.06;
/** Las palmas van algo por delante del pecho acolchado (m). */
const PALM_CLEAR = 0.05;
/**
 * Con los brazos tendidos (primera persona), las palmas van al menos así de delante (diseño, m): casi lo que alcanza
 * el brazo. Pegado al pecho quedaría bajo los ojos, fuera de la vista.
 */
const OUT_REACH = 0.34;
/** Lo más bajo que queda el objeto mientras sube a las manos (diseño, m): de aquí arranca al cogerlo. */
export const PICKUP_DROP = 0.22;

/** La palma, desde la muñeca (diseño, lado derecho): como en `buildHand`, un poco más hacia los dedos. */
const PALM_FROM_WRIST: Triple = [0.006, 0.02, -0.075];
const WRIST_BEND = 0.25;

const toBody = (t: Triple): Vector3 => new Vector3(t[0], t[2], -t[1]);

/** El frente del pecho acolchado (Y de diseño) a una altura y separación del centro dadas; 0 si no hay pecho. */
export function chestFront(x: number, z: number): number {
  const [cx, , cz] = CHEST.center;
  const [rx, ry, rz] = CHEST.radii;
  const k = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2;
  return k > 0 ? ry * Math.sqrt(k) : 0;
}

/**
 * Dónde van el centro del objeto y la palma derecha (diseño, Z arriba). La izquierda es su espejo. `out`: con los
 * brazos tendidos hacia delante en vez de abrazado al pecho.
 */
function holdTargets(size: CarrySize, out: boolean): { center: Triple; palm: Triple } {
  const z = Math.min(HOLD_HIGH, Math.max(HOLD_LOW, EYE_HEIGHT - BELOW_EYES - size.height / 2));
  const half = Math.min(HALF_SPAN_MAX, Math.max(HALF_SPAN_MIN, size.width / 2 + GLOVE));
  const back = chestFront(0, z) + CHEST_GAP;
  const grip = Math.min(size.depth / 2, GRIP_DEPTH);
  const palmY = Math.max(chestFront(half, z) + PALM_CLEAR, back + grip, out ? OUT_REACH : 0);
  // Las palmas entran `grip` desde atrás: el objeto va tan delante como ellas lo lleven.
  const backAt = Math.max(back, palmY - grip);
  return { center: [0, backAt + size.depth / 2, z], palm: [half, palmY, z] };
}

interface ArmChain {
  shoulder: Vector3;
  elbow: Vector3;
  wrist: Vector3;
  palm: Vector3;
}

/** Los tramos del brazo de un lado, en el marco del torso (como `boneGroup`: cada hueso desde el pivote del padre). */
function armChain(side: number): ArmChain {
  const at = (t: Triple): Vector3 => toBody(sided(t, side));
  const shoulder = at(JOINTS.shoulder).sub(toBody(JOINTS.torso));
  const elbow = at(JOINTS.elbow).sub(at(JOINTS.shoulder));
  const wrist = at(JOINTS.wrist).sub(at(JOINTS.elbow));
  const palm = toBody(sided(PALM_FROM_WRIST, side));
  return { shoulder, elbow, wrist, palm };
}

const qShoulder = new Quaternion();
const qElbow = new Quaternion();
const qWrist = new Quaternion();
const euler = new Euler();
const step = new Vector3();

/** Dónde queda la palma con una pose de brazo (marco del torso), con los giros de `setPose`. */
export function palmOf(arm: ArmPose, side: number, out = new Vector3()): Vector3 {
  const chain = armChain(side);
  qShoulder.setFromEuler(euler.set(arm.shoulder, 0, side * arm.shoulderRoll));
  qElbow.setFromEuler(euler.set(arm.elbow, 0, 0));
  qWrist.setFromEuler(euler.set(arm.wrist, 0, 0));
  step.copy(chain.palm).applyQuaternion(qWrist).add(chain.wrist);
  step.applyQuaternion(qElbow).add(chain.elbow);
  return out.copy(step.applyQuaternion(qShoulder)).add(chain.shoulder);
}

const LIMITS = {
  shoulder: [-0.5, 2.4],
  shoulderRoll: [-1.7, 0.9],
  elbow: [0, 2.3],
} as const;
type Joint = keyof typeof LIMITS;
const JOINT_NAMES = Object.keys(LIMITS) as Joint[];

/** Poses de arranque de la búsqueda: con varias no se queda en un mínimo local (codo hacia fuera, brazo caído…). */
const STARTS: readonly (readonly [number, number, number])[] = [
  [1, -0.3, 0.6],
  [1.6, -0.6, 1.2],
  [0.6, -0.9, 1.6],
  [2, -0.2, 0.4],
];

/** Descenso por coordenadas desde una pose: el brazo que deja la palma más cerca de `target`. */
function descend(start: ArmPose, target: Vector3, side: number): { arm: ArmPose; miss: number } {
  let arm = start;
  const palm = new Vector3();
  const miss = (a: ArmPose): number => palmOf(a, side, palm).distanceTo(target);
  let best = miss(arm);
  for (let delta = 0.4; delta > 0.002; delta /= 2) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const joint of JOINT_NAMES) {
        for (const sign of [1, -1]) {
          const [lo, hi] = LIMITS[joint];
          const value = Math.min(hi, Math.max(lo, arm[joint] + sign * delta));
          const tried = { ...arm, [joint]: value };
          const d = miss(tried);
          if (d < best - 1e-6) {
            arm = tried;
            best = d;
            improved = true;
          }
        }
      }
    }
  }
  return { arm, miss: best };
}

/** Busca la pose de brazo que lleva la palma a `target` (marco del torso). */
function reach(target: Vector3, side: number): ArmPose {
  let best: { arm: ArmPose; miss: number } | undefined;
  for (const [shoulder, shoulderRoll, elbow] of STARTS) {
    const found = descend({ shoulder, shoulderRoll, elbow, wrist: WRIST_BEND }, target, side);
    if (!best || found.miss < best.miss - 1e-4) best = found;
  }
  return (best as { arm: ArmPose }).arm;
}

const triple = (v: Vector3): Triple => [v.x, v.y, v.z];

/**
 * Cómo se lleva en brazos un objeto de este tamaño (siempre igual para el mismo tamaño): abrazado al pecho o, con
 * `out`, con los brazos tendidos (en primera persona, para verlo delante).
 */
export function carryGrip(size: CarrySize, out = false): CarryGrip {
  const { center, palm } = holdTargets(size, out);
  const torso = toBody(JOINTS.torso);
  const arms = ([-1, 1] as const).map((side) => reach(toBody(sided(palm, side)).sub(torso), side));
  const palms = ([-1, 1] as const).map((side, k) => palmOf(arms[k] as ArmPose, side));
  const miss = Math.max(
    ...([-1, 1] as const).map((side, k) =>
      (palms[k] as Vector3).distanceTo(toBody(sided(palm, side)).sub(torso)),
    ),
  );
  return {
    arms: [arms[0] as ArmPose, arms[1] as ArmPose],
    center: triple(toBody(center).sub(torso)),
    palms: [triple(palms[0] as Vector3), triple(palms[1] as Vector3)],
    miss,
  };
}
