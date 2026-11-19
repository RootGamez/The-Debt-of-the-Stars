// Los actores de la llegada del final bueno a lo largo del tiempo (F4; 🟡 cada gesto): la nave que baja recta al nido
// y abre la escotilla, el explorador que baja la escalerilla y anda hasta la Maestra con el cuaderno, la Maestra (qué
// mira y qué hace con las manos) y el cuaderno (quién lo lleva, si está abierto, qué doble página se ve y si pasa una
// hoja). Puro: game/homeEarlierRig.ts lo aplica a los modelos. Marco del nido (game/homeEarlier.ts).
import type { Vec3 } from '../cinematic/cameraTrack';
import { clamp01, smoothstep } from '../cinematic/easing';
import { HATCH_OPEN_SECONDS } from '../ship/hatch';
import {
  blendPose,
  bookLoweredPose,
  lookUpPose,
  nod,
  reachPose,
  readingPose,
  REST_POSE,
  type OolPose,
} from '../character/oolPoses';
import { beatAt, headingTo, meetSpot, NEST, SECONDS, type EarlierTimeline } from './homeEarlier';

/** De dónde viene la nave sin más datos (respecto a donde se posa, m): del noroeste y muy alto, desde el espacio. */
export const ARRIVAL_OFFSET: Vec3 = [-70, 150, 520];
/** Lo que gira la nave mientras baja (rad, se endereza al posarse). */
const ARRIVAL_YAW = 0.55;
/** Cómo frena: cuanto mayor, más despacio acaba. */
const BRAKE = 3;
/** Con qué velocidad entra en escena (parte de la media): ya viene volando, pero sin prisa. */
const GLIDE = 0.6;

/**
 * El camino de la llegada (marco del nido): una curva de Bézier cúbica desde `from` hasta la nave posada, con dos
 * puntos de control. Si el segundo está en la vertical del nido, la nave acaba bajando recta.
 */
export interface ArrivalPath {
  from: Vec3;
  via: readonly [Vec3, Vec3];
}

const mixPoint = (a: Vec3, b: Vec3, k: number): Vec3 => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

/** La recta desde lo alto (ARRIVAL_OFFSET) hasta el nido. */
export const STRAIGHT_ARRIVAL: ArrivalPath = (() => {
  const from: Vec3 = [
    NEST.ship[0] + ARRIVAL_OFFSET[0],
    NEST.ship[1] + ARRIVAL_OFFSET[1],
    NEST.ship[2] + ARRIVAL_OFFSET[2],
  ];
  return { from, via: [mixPoint(from, NEST.ship, 1 / 3), mixPoint(from, NEST.ship, 2 / 3)] };
})();

/** El punto del camino a `s` (0 al empezar, 1 posada). */
export function pathPoint(path: ArrivalPath, s: number): Vec3 {
  const u = clamp01(s);
  const v = 1 - u;
  const [a, b, c, d] = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u];
  const at = (axis: 0 | 1 | 2): number =>
    path.from[axis] * a + path.via[0][axis] * b + path.via[1][axis] * c + NEST.ship[axis] * d;
  return [at(0), at(1), at(2)];
}

export interface ShipState {
  position: Vec3;
  /** Giro sobre su vertical (rad). */
  yaw: number;
  /** Cuánto empujan las toberas de abajo (0–1). */
  burn: number;
  /** La escotilla, de cerrada (0) a abierta (1). */
  hatch: number;
}

/**
 * Cuánto le queda de camino (1 al empezar, 0 posada): entra planeando (GLIDE), acelera y frena largo, hasta parar en
 * el nido sin pasarse.
 */
export function descentLeft(timeline: EarlierTimeline, t: number): number {
  const u = clamp01(t / timeline.marks.touchdown);
  return (1 - u) ** BRAKE * (1 + (BRAKE - GLIDE) * u);
}

export function shipAt(
  timeline: EarlierTimeline,
  t: number,
  path: ArrivalPath = STRAIGHT_ARRIVAL,
): ShipState {
  const left = descentLeft(timeline, t);
  const { touchdown, hatch } = timeline.marks;
  const s = clamp01(t / touchdown);
  const burn =
    t < touchdown ? 0.5 + 0.5 * smoothstep(0.55, 0.92, s) : Math.max(0, 1 - (t - touchdown) / 0.8);
  return {
    position: left <= 0 ? NEST.ship : pathPoint(path, 1 - left),
    yaw: ARRIVAL_YAW * left,
    burn,
    hatch: clamp01((t - hatch) / HATCH_OPEN_SECONDS),
  };
}

export interface WalkerState {
  visible: boolean;
  /** Los pies (marco del nido). */
  position: Vec3;
  /** Rumbo (rad desde +Y hacia +X). */
  heading: number;
  /** Lo deprisa que anda (m/s), para el paso. */
  speed: number;
  /** El brazo derecho tendido con el cuaderno (0–1). */
  offer: number;
  holdsBook: boolean;
}

const flat = (a: Vec3, b: Vec3): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Lo que gira el rumbo de `a` a `b` por el camino corto. */
function turnBetween(a: number, b: number, k: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}

/** El explorador: dentro de la nave, por la escalerilla, andando hasta ella y, quieto, tendiéndole el cuaderno. */
export function explorerAt(timeline: EarlierTimeline, t: number): WalkerState {
  const { ladderStart, ladderEnd, handOver } = timeline.marks;
  const meet = meetSpot();
  const offer =
    smoothstep(handOver - 1.1, handOver - 0.35, t) *
    (1 - smoothstep(handOver + 0.2, handOver + 0.9, t));
  const holdsBook = t < handOver;
  const down = Math.PI; // la escalerilla baja hacia el sur
  if (t < ladderStart) {
    return {
      visible: t > ladderStart - 0.4,
      position: NEST.ladderTop,
      heading: down,
      speed: 0,
      offer: 0,
      holdsBook,
    };
  }
  if (t < ladderEnd) {
    const k = (t - ladderStart) / SECONDS.ladder;
    const length = Math.hypot(
      NEST.ladderBottom[1] - NEST.ladderTop[1],
      NEST.ladderBottom[2] - NEST.ladderTop[2],
    );
    return {
      visible: true,
      position: mixPoint(NEST.ladderTop, NEST.ladderBottom, k),
      heading: down,
      speed: length / SECONDS.ladder,
      offer: 0,
      holdsBook,
    };
  }
  const first = flat(NEST.ladderBottom, NEST.ladderFoot);
  const second = flat(NEST.ladderFoot, meet);
  const walked = Math.min(first + second, (t - ladderEnd) * SECONDS.walk);
  const facing = headingTo(meet, NEST.maestra);
  if (walked < first) {
    return {
      visible: true,
      position: mixPoint(NEST.ladderBottom, NEST.ladderFoot, walked / first),
      heading: turnBetween(down, headingTo(NEST.ladderFoot, meet), smoothstep(0.2, first, walked)),
      speed: SECONDS.walk,
      offer,
      holdsBook,
    };
  }
  const along = walked - first;
  const arrived = along >= second - 1e-6;
  return {
    visible: true,
    position: mixPoint(NEST.ladderFoot, meet, along / second),
    heading: turnBetween(
      headingTo(NEST.ladderFoot, meet),
      facing,
      smoothstep(second - 0.5, second, along),
    ),
    speed: arrived ? 0 : SECONDS.walk,
    offer,
    holdsBook,
  };
}

/** Adónde mira la Maestra: la nave que llega, a ti, tu cuaderno o el cielo. */
export type Attention = 'nave' | 'explorador' | 'cuaderno' | 'cielo';

export interface MaestraState {
  /** La postura de los brazos y el cuerpo (la cabeza la apunta el montaje según `attention`, salvo leyendo). */
  pose: OolPose;
  attention: Attention;
  /** Cuánto pesa la mirada apuntada sobre la de la postura (0–1). */
  aim: number;
  /** Rumbo hacia donde está vuelta (rad). */
  heading: number;
}

/** La Maestra: espera mirando la nave, te recibe, tiende las manos, lee, baja el cuaderno, asiente y mira al cielo. */
export function maestraAt(timeline: EarlierTimeline, t: number): MaestraState {
  const {
    touchdown,
    handOver,
    bookOpen,
    bookClose,
    nod: nodAt,
    lookUp,
    ladderStart,
  } = timeline.marks;
  const heading = headingTo(NEST.maestra, NEST.ladderFoot);
  const reading = timeline.phases.find((span) => span.phase === 'lectura');
  const readingEnd = reading?.end ?? bookClose;
  let pose = REST_POSE;
  let attention: Attention = t < ladderStart ? 'nave' : 'explorador';
  // Las manos: tenderlas, sostener el cuaderno y leer; al acabar, bajarlo y cerrarlo contra el pecho.
  pose = blendPose(pose, reachPose(), smoothstep(handOver - 1.2, handOver - 0.2, t));
  pose = blendPose(pose, readingPose(), smoothstep(handOver + 0.2, bookOpen, t));
  pose = blendPose(pose, bookLoweredPose(), smoothstep(readingEnd, readingEnd + 1.2, t));
  if (t >= bookOpen && t < readingEnd) attention = 'cuaderno';
  if (t >= lookUp) attention = 'cielo';
  const sky = smoothstep(lookUp, lookUp + 1.6, t);
  pose = blendPose(pose, { ...lookUpPose(0.85), armL: pose.armL, armR: pose.armR }, sky);
  pose = { ...pose, headPitch: pose.headPitch + nod(t - nodAt) };
  // Mientras baja la nave, el cuerpo también se echa algo atrás.
  const watching = 1 - smoothstep(touchdown - 1, touchdown + 1, t);
  pose = { ...pose, lean: pose.lean - 0.12 * watching };
  const aim = attention === 'cuaderno' ? 0 : 1 - 0.6 * sky;
  return { pose, attention, aim, heading };
}

export interface BookState {
  holder: 'explorador' | 'maestra';
  /** De cerrado (0) a abierto (1). */
  open: number;
  /** La doble página a la vista (registry/notebookPages `spreadOf`). */
  spread: number;
  /** Una hoja pasando: de qué doble página a cuál y cuánto lleva (0–1). */
  turning?: { from: number; to: number; progress: number };
}

/** El cuaderno: en tu mano hasta que se lo das; ella lo abre, pasa las hojas de lo que lee y lo cierra al final. */
export function bookAt(timeline: EarlierTimeline, t: number): BookState {
  const { handOver, bookOpen, bookClose } = timeline.marks;
  if (t < handOver) return { holder: 'explorador', open: 0, spread: 0 };
  const open =
    smoothstep(bookOpen - SECONDS.open, bookOpen, t) *
    (1 - smoothstep(bookClose, bookClose + 1, t));
  const current = beatAt(timeline, t);
  const spread = current?.spread ?? 0;
  const index = current ? timeline.beats.indexOf(current) : -1;
  const previous = index > 0 ? timeline.beats[index - 1] : undefined;
  if (current && previous && previous.spread !== current.spread) {
    const progress = (t - current.start) / SECONDS.pageTurn;
    if (progress < 1) {
      return {
        holder: 'maestra',
        open,
        spread,
        turning: { from: previous.spread, to: current.spread, progress: clamp01(progress) },
      };
    }
  }
  return { holder: 'maestra', open, spread };
}
