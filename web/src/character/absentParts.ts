// Las piezas comunes de los dos Ausentes vivos (plan de finales, E3; aspecto ✅ Anthony 2026-11-06): piel cerámica
// con circuitos de cobre en relieve, la cabeza sin rostro (un óvalo de vidrio mineral oscuro con dibujos de luz:
// rombos y triángulos, nunca espirales ni hexágonos), su signo en el pecho (🟡 D13), y lo 🟡 de 2026-11-14: su ropa
// de tela pesada y cuero y sus aros de oro viejo. También la escarcha, que solo se ve congelada.
// Cada pieza se escribe en coordenadas absolutas de diseño (Z arriba, frente +Y). El tronco está en absentTorso.ts,
// el cuello y la cabeza en absentHead.ts, los miembros en absentLimbs.ts y absentHands.ts, el oro en absentGold.ts y
// la ropa en absentRobe.ts (ella) y absentWorkwear.ts (él).
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  PlaneGeometry,
  Vector3,
  type BufferGeometry,
  type Matrix4,
} from 'three';
import { ball, cone, pieceMatrix } from '../worlds/procedural/kit';
import { seededRandom, type Random } from '../worlds/procedural/noise';
import {
  ABSENT_SKELETONS,
  type AbsentJoints,
  type AbsentSkeleton,
  type AbsentWho,
} from './absentSkeleton';
import { ABSENT_SHAPES, type AbsentBodyShape, type Section } from './absentShape';
import { onSections } from './absentLoft';
import {
  between,
  onEllipsoid,
  surfaceMatrix,
  type Ellipsoid,
  type SurfacePoint,
} from './explorerParts';

/** Cerámica, metal (cobre y oro), tela y cuero, el vidrio, los dibujos que brillan, el signo y la escarcha. */
export type AbsentPartKind = 'ceramic' | 'metal' | 'cloth' | 'glass' | 'glow' | 'sign' | 'frost';

export const ABSENT_PART_KINDS: readonly AbsentPartKind[] = [
  'ceramic',
  'metal',
  'cloth',
  'glass',
  'glow',
  'sign',
  'frost',
];

/** Un hueso rígido: todo lo que cuelga de una articulación, por material (como Segment del explorador). */
export class AbsentSegment {
  readonly parts: Record<AbsentPartKind, BufferGeometry[]> = {
    ceramic: [],
    metal: [],
    cloth: [],
    glass: [],
    glow: [],
    sign: [],
    frost: [],
  };
  private readonly random: Random;

  constructor(seed: number) {
    this.random = seededRandom(seed);
  }

  /** Añade una copia de `geometry` de un color (las primitivas del kit están en caché: nunca se tocan). */
  add(
    kind: AbsentPartKind,
    color: string | Color,
    geometry: BufferGeometry,
    matrix: Matrix4,
    vary = 0.03,
  ): void {
    const g = geometry.clone().applyMatrix4(matrix);
    if (g.hasAttribute('uv')) g.deleteAttribute('uv');
    const c = new Color(color);
    if (vary) c.offsetHSL(0, 0, (this.random() - 0.5) * vary);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    this.parts[kind].push(g);
  }

  /** Añade una superficie ya tejida con su color por vértice (absentLoft.ts): se queda tal cual. */
  addWoven(kind: AbsentPartKind, geometry: BufferGeometry): void {
    this.parts[kind].push(geometry);
  }

  next(): number {
    return this.random();
  }
}

/** Los colores de cada uno (🟡). */
export interface AbsentLook {
  ceramic: string;
  ceramicShade: string;
  /** El fondo de las ranuras entre placas. */
  seam: string;
  copper: string;
  copperDark: string;
  /** Oro viejo, algo gastado. */
  gold: string;
  goldDark: string;
  glass: string;
  /** Los dibujos de la cabeza (la luz de los Ausentes, la de los murales de Umbral). */
  glow: string;
  /** Su signo. */
  sign: string;
  /** La ropa: lo principal, su sombra, un segundo paño y el hilo o el cuero de los bordes. */
  cloth: string;
  clothShade: string;
  drape: string;
  trim: string;
}

/** Ella, porcelana cálida, túnica añil y manto ocre; él, gres gris, chaleco de lona y cuero de forja. */
export const ABSENT_LOOKS: Record<AbsentWho, AbsentLook> = {
  cientifica: {
    ceramic: '#ebe4d6',
    ceramicShade: '#cdc2ad',
    seam: '#8f8472',
    copper: '#bd7742',
    copperDark: '#8a4f2a',
    gold: '#c9a44f',
    goldDark: '#9b7b35',
    glass: '#121829',
    glow: '#8fe3e8',
    sign: '#b4f6ff',
    cloth: '#2c3b60',
    clothShade: '#1f2a46',
    drape: '#b08552',
    trim: '#d9c08a',
  },
  esceptico: {
    ceramic: '#cbc3b4',
    ceramicShade: '#a99f8e',
    seam: '#7a7164',
    copper: '#ad683c',
    copperDark: '#784425',
    gold: '#b59140',
    goldDark: '#86692c',
    glass: '#1a1b21',
    glow: '#8fe3e8',
    sign: '#ffd9a0',
    cloth: '#5e3d26',
    clothShade: '#432a19',
    drape: '#6f6446',
    trim: '#2f2117',
  },
};

/** Lo que necesita cada pieza: quién, sus colores, sus medidas y su silueta. */
export interface AbsentContext {
  who: AbsentWho;
  look: AbsentLook;
  joints: AbsentJoints;
  skeleton: AbsentSkeleton;
  shape: AbsentBodyShape;
}

export function absentContext(who: AbsentWho): AbsentContext {
  const skeleton = ABSENT_SKELETONS[who];
  return {
    who,
    look: ABSENT_LOOKS[who],
    joints: skeleton.joints,
    skeleton,
    shape: ABSENT_SHAPES[who],
  };
}

export const v3 = (t: readonly [number, number, number]): Vector3 => new Vector3(...t);

/** Una superficie donde poner cosas: el punto y la normal en (acimut, z), separado `lift` metros. */
export type Surface = (azimuth: number, z: number, lift?: number) => SurfacePoint;

export const ellipsoidSurface =
  (e: Ellipsoid): Surface =>
  (azimuth, z, lift = 0) =>
    onEllipsoid(e, azimuth, z, lift);

export const sectionsSurface =
  (sections: readonly Section[]): Surface =>
  (azimuth, z, lift = 0) =>
    onSections(sections, azimuth, z, lift);

/** Lo más largo (m) de un tramo recto de circuito sobre una superficie curva. */
const CIRCUIT_STEP = 0.12;
/** El relieve del cobre: sobresale de la cerámica y lleva pastillas redondas en los extremos. */
const TRACE_HEIGHT = 0.6;

let traceGeometry: BufferGeometry | undefined;

/**
 * El tramo de un circuito: un prisma de tres caras sin tapas (con normales suaves se ve como un cordón en relieve y
 * tiene la mitad de triángulos que una caja). Las puntas quedan dentro del tramo vecino o bajo la pastilla.
 */
function traceBar(): BufferGeometry {
  if (!traceGeometry) {
    const open = new CylinderGeometry(1, 1, 1, 3, 1, true).rotateX(Math.PI / 2);
    traceGeometry = open.toNonIndexed();
    traceGeometry.deleteAttribute('uv');
    open.dispose();
  }
  return traceGeometry;
}

/** Una línea de circuito de cobre de `a` a `b`. */
export function trace(
  s: AbsentSegment,
  color: string,
  a: Vector3,
  b: Vector3,
  width = 0.014,
): void {
  s.add('metal', color, traceBar(), between(a, b, width * 0.58, width * 0.58 * TRACE_HEIGHT), 0.04);
}

let padGeometry: BufferGeometry | undefined;

/** Una pastilla de cobre: una lámina cuadrada (dos triángulos) a ras del relieve, como las de una placa de circuito. */
export function pad(s: AbsentSegment, color: string, at: SurfacePoint, radius: number): void {
  if (!padGeometry) {
    const square = new PlaneGeometry(1, 1);
    padGeometry = square.toNonIndexed();
    padGeometry.deleteAttribute('uv');
    square.dispose();
  }
  const raised = {
    point: at.point.clone().addScaledVector(at.normal, PAD_LIFT),
    normal: at.normal,
  };
  s.add('metal', color, padGeometry, surfaceMatrix(raised, [radius * 1.3, radius * 1.3, 1]), 0.04);
}

/** Lo que sobresale la pastilla de la superficie (m), a la altura del cobre. */
const PAD_LIFT = 0.004;

/** Un circuito sobre una superficie: tramos rectos entre puntos (acimut, z), partidos para seguir la curva. */
export function circuit(
  s: AbsentSegment,
  color: string,
  surface: Surface,
  route: readonly (readonly [number, number])[],
  width = 0.014,
): void {
  const lift = width * 0.2;
  const at = (az: number, z: number): Vector3 => surface(az, z, lift).point;
  for (let k = 1; k < route.length; k++) {
    const [a0, z0] = route[k - 1] ?? [0, 0];
    const [a1, z1] = route[k] ?? [0, 0];
    const span = at(a0, z0).distanceTo(at(a1, z1));
    const steps = Math.max(1, Math.ceil(span / CIRCUIT_STEP));
    for (let j = 0; j < steps; j++) {
      const t0 = j / steps;
      const t1 = (j + 1) / steps;
      // Un poco más largo para que los tramos se solapen en los codos del circuito.
      const a = at(a0 + (a1 - a0) * t0, z0 + (z1 - z0) * t0);
      const b = at(a0 + (a1 - a0) * t1, z0 + (z1 - z0) * t1);
      const extra = b
        .clone()
        .sub(a)
        .normalize()
        .multiplyScalar(width * 0.5);
      trace(s, color, a.sub(extra), b.add(extra), width);
    }
  }
  for (const end of [route[0], route[route.length - 1]]) {
    if (!end) continue;
    pad(s, color, surface(end[0], end[1], 0.001), width * 1.25);
  }
}

/** Una bolita (un remache, un punto de oro) en un punto: tan pequeña que basta con veinte caras. */
export function stud(
  s: AbsentSegment,
  kind: AbsentPartKind,
  color: string,
  at: Vector3,
  radius: number,
): void {
  s.add(
    kind,
    color,
    ball(1, 0),
    pieceMatrix([at.x, at.y, at.z], [0, 0, 0], [radius, radius, radius]),
    0.03,
  );
}

/** Una astilla de escarcha que sale de `at` hacia `normal`. */
export function frostShard(s: AbsentSegment, at: Vector3, normal: Vector3, size: number): void {
  const tip = at.clone().addScaledVector(normal, size);
  s.add('frost', '#eef7ff', cone(1, 0, 4), between(at, tip, size * 0.35), 0.05);
}

/** Unas astillas de escarcha esparcidas por una superficie, alrededor de (acimut, z). */
export function frostOn(
  s: AbsentSegment,
  surface: Surface,
  spots: readonly (readonly [number, number])[],
  size = 0.05,
): void {
  for (const [az, z] of spots) {
    const { point, normal } = surface(az + (s.next() - 0.5) * 0.3, z, -0.004);
    frostShard(s, point, normal, size * (0.65 + s.next() * 0.7));
  }
}
