// Las piezas de los dos Ausentes vivos (plan de finales, E3; aspecto ✅ Anthony 2026-11-06): piel cerámica con
// circuitos de cobre, la cabeza sin rostro (un óvalo de vidrio mineral oscuro con dibujos de luz: rombos y
// triángulos, nunca espirales ni hexágonos) y su signo brillando en el pecho (🟡 D13: ella, un rombo con un punto
// dentro; él, dos triángulos punta con punta). También la escarcha, que solo se ve congelada.
// Cada función llena el segmento de un hueso en coordenadas absolutas de diseño (Z arriba, frente +Y); el cuello y la
// cabeza están en absentHead.ts, y los brazos y las piernas, en absentLimbs.ts.
import { BufferAttribute, Color, Vector3, type BufferGeometry, type Matrix4 } from 'three';
import { ball, box, cone, cylinder, pieceMatrix, type Triple } from '../worlds/procedural/kit';
import { seededRandom, type Random } from '../worlds/procedural/noise';
import { ABSENT_BUILDS, ABSENT_JOINTS, hipSpread, type AbsentWho } from './absentSkeleton';
import { between, onEllipsoid, type Ellipsoid } from './explorerParts';

/** Cerámica, cobre, el vidrio de la cabeza, los dibujos que brillan, el signo del pecho y la escarcha. */
export type AbsentPartKind = 'ceramic' | 'copper' | 'glass' | 'glow' | 'sign' | 'frost';

export const ABSENT_PART_KINDS: readonly AbsentPartKind[] = [
  'ceramic',
  'copper',
  'glass',
  'glow',
  'sign',
  'frost',
];

/** Un hueso rígido: todo lo que cuelga de una articulación, por material (como Segment del explorador). */
export class AbsentSegment {
  readonly parts: Record<AbsentPartKind, BufferGeometry[]> = {
    ceramic: [],
    copper: [],
    glass: [],
    glow: [],
    sign: [],
    frost: [],
  };
  private readonly random: Random;

  constructor(seed: number) {
    this.random = seededRandom(seed);
  }

  /** Añade una copia de `geometry` (las primitivas del kit están en caché: nunca se tocan). */
  add(
    kind: AbsentPartKind,
    color: string,
    geometry: BufferGeometry,
    matrix: Matrix4,
    vary = 0.03,
  ): void {
    const g = geometry.clone().applyMatrix4(matrix);
    g.deleteAttribute('uv');
    const c = new Color(color);
    if (vary) c.offsetHSL(0, 0, (this.random() - 0.5) * vary);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    this.parts[kind].push(g);
  }

  next(): number {
    return this.random();
  }
}

/** Los colores de cada uno (🟡): ella, porcelana cálida y vidrio azul noche; él, gres gris y vidrio ahumado. */
export interface AbsentLook {
  ceramic: string;
  ceramicShade: string;
  copper: string;
  copperDark: string;
  glass: string;
  /** Los dibujos de la cabeza (la luz de los Ausentes, la de los murales de Umbral). */
  glow: string;
  /** Su signo. */
  sign: string;
}

export const ABSENT_LOOKS: Record<AbsentWho, AbsentLook> = {
  cientifica: {
    ceramic: '#e6dfd0',
    ceramicShade: '#cfc4ae',
    copper: '#b8733f',
    copperDark: '#8a4f2a',
    glass: '#141a2c',
    glow: '#8fe3e8',
    sign: '#b4f6ff',
  },
  esceptico: {
    ceramic: '#cdc5b6',
    ceramicShade: '#aea493',
    copper: '#a8643a',
    copperDark: '#784425',
    glass: '#1b1c22',
    glow: '#8fe3e8',
    sign: '#ffd9a0',
  },
};

export type AbsentJointName = keyof typeof ABSENT_JOINTS;

/** Lo que necesita cada pieza: quién, sus colores, su anchura y sus articulaciones. */
export interface AbsentContext {
  who: AbsentWho;
  look: AbsentLook;
  /** Ancho del tronco y grosor de los miembros. */
  width: number;
  limb: number;
  joints: Record<AbsentJointName, Triple>;
}

/** Las articulaciones de `who`: los hombros se separan con su anchura y las caderas, la mitad. */
export function absentContext(who: AbsentWho): AbsentContext {
  const { width, limb } = ABSENT_BUILDS[who];
  const hips = hipSpread(width);
  const spread = (t: Triple, k: number): Triple => [t[0] * k, t[1], t[2]];
  const J = ABSENT_JOINTS;
  return {
    who,
    look: ABSENT_LOOKS[who],
    width,
    limb,
    joints: {
      pelvis: J.pelvis,
      spine: J.spine,
      chest: J.chest,
      neck: J.neck,
      head: J.head,
      shoulder: spread(J.shoulder, width),
      elbow: spread(J.elbow, width),
      wrist: spread(J.wrist, width),
      hip: spread(J.hip, hips),
      knee: spread(J.knee, hips),
      ankle: spread(J.ankle, hips),
    },
  };
}

export const v3 = (t: Triple): Vector3 => new Vector3(...t);

/** Lo más largo (m) de un tramo recto de circuito sobre una superficie curva. */
const CIRCUIT_STEP = 0.13;

/** Una línea de circuito de cobre de `a` a `b` (sección casi cuadrada: da igual cómo gire sobre sí). */
export function trace(
  s: AbsentSegment,
  color: string,
  a: Vector3,
  b: Vector3,
  width = 0.016,
): void {
  s.add('copper', color, box(), between(a, b, width, width * 0.8), 0.04);
}

/** Un circuito sobre un elipsoide: tramos rectos entre puntos (acimut, z), partidos para seguir la curva. */
export function circuit(
  s: AbsentSegment,
  color: string,
  e: Ellipsoid,
  route: readonly (readonly [number, number])[],
  width = 0.016,
): void {
  const at = (az: number, z: number): Vector3 => onEllipsoid(e, az, z, 0.005).point;
  for (let k = 1; k < route.length; k++) {
    const [a0, z0] = route[k - 1] ?? [0, 0];
    const [a1, z1] = route[k] ?? [0, 0];
    const from = at(a0, z0);
    const span = from.distanceTo(at(a1, z1));
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
  const [lastAz, lastZ] = route[route.length - 1] ?? [0, 0];
  const end = onEllipsoid(e, lastAz, lastZ, 0.008).point;
  s.add('copper', color, ball(width * 0.9, 0), pieceMatrix([end.x, end.y, end.z]), 0.04);
}

/** Una astilla de escarcha que sale de `at` hacia `normal`. */
export function frostShard(s: AbsentSegment, at: Vector3, normal: Vector3, size: number): void {
  const tip = at.clone().addScaledVector(normal, size);
  s.add('frost', '#eef7ff', cone(1, 0, 4), between(at, tip, size * 0.35), 0.05);
}

/** Unas astillas de escarcha esparcidas por un elipsoide, alrededor de (acimut, z). */
export function frostOn(
  s: AbsentSegment,
  e: Ellipsoid,
  spots: readonly (readonly [number, number])[],
  size = 0.06,
): void {
  for (const [az, z] of spots) {
    const { point, normal } = onEllipsoid(e, az + (s.next() - 0.5) * 0.3, z, -0.004);
    frostShard(s, point, normal, size * (0.65 + s.next() * 0.7));
  }
}

// ---- Cadera y tronco -------------------------------------------------------------------------------------------

export function buildPelvis(s: AbsentSegment, c: AbsentContext): void {
  const depth = (1 + c.width) / 2;
  const hips: Ellipsoid = { center: [0, -0.01, 1.37], radii: [0.22 * c.width, 0.15 * depth, 0.13] };
  s.add('ceramic', c.look.ceramic, ball(1, 1), pieceMatrix(hips.center, [0, 0, 0], hips.radii));
  for (const side of [-1, 1]) {
    const [x, y, z] = c.joints.hip;
    s.add(
      'copper',
      c.look.copper,
      ball(1, 0),
      pieceMatrix([side * (x + 0.06 * c.limb), y, z + 0.01], [0, 0, 0], [0.03, 0.07, 0.07]),
    );
    circuit(s, c.look.copperDark, hips, [
      [side * 0.75, 1.43],
      [side * 0.35, 1.36],
      [0, 1.3],
    ]);
  }
}

/** La cintura: un cono de cerámica con su junta y el cobre que baja por delante y por los lados. */
export function buildSpine(s: AbsentSegment, c: AbsentContext): void {
  const depth = (1 + c.width) / 2;
  const from = new Vector3(0, 0, 1.43);
  const to = new Vector3(0, 0, 1.8);
  s.add('ceramic', c.look.ceramic, cone(0.15, 0.205, 8), between(from, to, c.width, 0.75 * depth));
  s.add(
    'ceramic',
    c.look.ceramicShade,
    cylinder(1, 8),
    pieceMatrix([0, 0, 1.6], [0, 0, 0], [0.183 * c.width, 0.137 * depth, 0.02]),
  );
  const waist: Ellipsoid = { center: [0, 0, 1.6], radii: [0.18 * c.width, 0.135 * depth, 0.4] };
  circuit(s, c.look.copper, waist, [
    [0, 1.47],
    [0, 1.76],
  ]);
  for (const side of [-1, 1]) {
    circuit(s, c.look.copperDark, waist, [
      [side * 1.4, 1.48],
      [side * 1.4, 1.66],
      [side * 1.0, 1.74],
    ]);
  }
}

/** El pecho: el tronco ancho arriba, los hombros, la placa oscura con el signo y los circuitos. */
export function buildChest(s: AbsentSegment, c: AbsentContext): void {
  const depth = (1 + c.width) / 2;
  const chest: Ellipsoid = { center: [0, 0, 1.95], radii: [0.3 * c.width, 0.2 * depth, 0.24] };
  s.add('ceramic', c.look.ceramic, ball(1, 1), pieceMatrix(chest.center, [0, 0, 0], chest.radii));
  s.add(
    'ceramic',
    c.look.ceramicShade,
    ball(1, 1),
    pieceMatrix([0, -0.01, 2.09], [0, 0, 0], [0.38 * c.width, 0.14 * depth, 0.075]),
  );
  // La placa de vidrio donde brilla el signo: un óvalo (un disco de doce lados; nunca un hexágono).
  const plate = onEllipsoid(chest, 0, 1.96, 0.004).point;
  s.add(
    'glass',
    c.look.glass,
    cylinder(1, 12),
    pieceMatrix([0, plate.y - 0.004, plate.z], [Math.PI / 2, 0, 0], [0.095, 0.11, 0.03]),
    0,
  );
  const front = plate.y + 0.016;
  if (c.who === 'cientifica') diamondWithDot(s, c.look.sign, [0, front, plate.z], 0.075);
  else hourglass(s, c.look.sign, [0, front, plate.z], 0.05);
  for (const side of [-1, 1]) {
    circuit(s, c.look.copper, chest, [
      [0, 2.06],
      [0, 2.12],
      [side * 0.5, 2.12],
      [side * 0.95, 2.06],
    ]);
    circuit(s, c.look.copper, chest, [
      [0, 1.86],
      [0, 1.8],
      [side * 0.42, 1.8],
      [side * 0.42, 1.74],
    ]);
    if (c.who === 'esceptico') {
      // Él, que forjaba las Puertas, lleva más cobre: dos ramas más a los costados.
      circuit(s, c.look.copperDark, chest, [
        [side * 0.3, 1.98],
        [side * 0.62, 1.98],
        [side * 0.62, 1.86],
      ]);
    }
  }
  circuit(s, c.look.copperDark, chest, [
    [Math.PI, 1.76],
    [Math.PI, 2.12],
  ]);
  frostOn(s, chest, [
    [-0.9, 2.12],
    [0.85, 2.13],
    [0.3, 2.15],
    [Math.PI - 0.4, 2.14],
  ]);
}

/** Su signo (🟡 D13): un rombo de luz, hueco, con un punto en medio. */
function diamondWithDot(s: AbsentSegment, color: string, at: Triple, size: number): void {
  const [x, y, z] = at;
  const half = size / 2;
  // Cuatro lados de largo `size`, girados 45°.
  for (const [dx, dz, turn] of [
    [half / 2, half / 2, -Math.PI / 4],
    [-half / 2, half / 2, Math.PI / 4],
    [half / 2, -half / 2, Math.PI / 4],
    [-half / 2, -half / 2, -Math.PI / 4],
  ] as const) {
    s.add(
      'sign',
      color,
      box(),
      pieceMatrix([x + dx * Math.SQRT2, y, z + dz * Math.SQRT2], [0, turn, 0], [0.016, 0.01, size]),
      0,
    );
  }
  s.add('sign', color, ball(0.016, 0), pieceMatrix([x, y + 0.004, z]), 0);
}

/** Su signo (🟡 D13, D19): dos triángulos llenos que se tocan por la punta, como un reloj de arena. */
function hourglass(s: AbsentSegment, color: string, at: Triple, radius: number): void {
  const [x, y, z] = at;
  // Un prisma de tres lados de frente: con el giro π/2 su vértice mira abajo; con −π/2, arriba.
  s.add(
    'sign',
    color,
    cylinder(1, 3),
    pieceMatrix([x, y, z + radius], [Math.PI / 2, 0, 0], [radius, radius, 0.012]),
    0,
  );
  s.add(
    'sign',
    color,
    cylinder(1, 3),
    pieceMatrix([x, y, z - radius], [-Math.PI / 2, 0, 0], [radius, radius, 0.012]),
    0,
  );
}
