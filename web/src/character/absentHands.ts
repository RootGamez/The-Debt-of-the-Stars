// Manos y pies de los Ausentes vivos (plan de finales, E3): la mano, una palma estrecha con tres dedos largos (como
// en los murales) de tres falanges de cerámica cada uno, un pulgar corto y el cobre por el dorso; el pie, largo y
// estrecho, con talón, empeine y tres dedos romos. Ella, dedos finos y largos; él, manos grandes y gruesas.
// Coordenadas absolutas de diseño (Z arriba, frente +Y); `side` +1 es la derecha y −1 la izquierda.
import { Color, Matrix4, Vector3, type BufferGeometry } from 'three';
import { ball, pieceMatrix } from '../worlds/procedural/kit';
import { loftGeometry, rowsBetween, type FullSection } from './absentLoft';
import type { Section } from './absentShape';
import { frostShard, trace, type AbsentContext, type AbsentSegment } from './absentParts';

/** Cómo es la mano de cada uno (m): grosor y anchura de la palma, su largo, y los dedos. */
interface HandSpec {
  palm: { thick: number; wide: number; long: number };
  /** Largo de las tres falanges del dedo de en medio y su grosor en la base. */
  phalanges: readonly [number, number, number];
  finger: number;
  /** Separación entre dedos (de delante atrás). */
  spacing: number;
  /** Cuánto dobla cada nudillo hacia la palma (rad). */
  curl: readonly [number, number, number];
  /** Giro de la mano sobre la vertical: la palma mira hacia dentro y un poco atrás. */
  yaw: number;
}

const HANDS: Record<'cientifica' | 'esceptico', HandSpec> = {
  cientifica: {
    palm: { thick: 0.017, wide: 0.031, long: 0.094 },
    phalanges: [0.05, 0.038, 0.03],
    finger: 0.0105,
    spacing: 0.019,
    curl: [0.18, 0.3, 0.26],
    yaw: 0.5,
  },
  esceptico: {
    palm: { thick: 0.029, wide: 0.05, long: 0.122 },
    phalanges: [0.062, 0.046, 0.034],
    finger: 0.0175,
    spacing: 0.031,
    curl: [0.24, 0.38, 0.3],
    yaw: 0.45,
  },
};

/** Una pieza de la mano: se teje en el marco de la mano y se lleva a la muñeca. */
function woven(s: AbsentSegment, geometry: BufferGeometry, frame: Matrix4): void {
  s.addWoven('ceramic', geometry.applyMatrix4(frame));
}

/** Un dedo colgando hacia abajo desde `base` (marco de la mano), doblado hacia la palma (−X del lado). */
function finger(
  s: AbsentSegment,
  c: AbsentContext,
  frame: Matrix4,
  base: Vector3,
  lengths: readonly number[],
  radius: number,
  curl: readonly number[],
  side: number,
): void {
  const sections: Section[] = [];
  let at = base.clone();
  let angle = 0;
  const joints: Vector3[] = [at.clone()];
  const tilts: number[] = [0];
  for (let k = 0; k < lengths.length; k++) {
    angle += curl[k] ?? 0;
    const step = lengths[k] ?? 0;
    at = at.clone().add(new Vector3(-side * Math.sin(angle) * step, 0, -Math.cos(angle) * step));
    joints.push(at.clone());
    tilts.push(angle);
  }
  // Secciones de la punta a la base, más gruesas en los nudillos. Cortadas en horizontal, una falange inclinada
  // es más ancha en el sentido en que se dobla: de ahí el 1/cos.
  const total = joints.length - 1;
  const radiusAt = (k: number): number => radius * (1 - 0.1 * k);
  joints.forEach((p, k) => {
    const r = radiusAt(k);
    const stretch = 1 / Math.cos(((tilts[k] ?? 0) + (tilts[k + 1] ?? tilts[k] ?? 0)) / 2);
    sections.push({ z: p.z, x: p.x, y: p.y, rx: r * stretch, front: r, back: r * 1.05 });
    if (k < total) {
      const next = joints[k + 1] ?? p;
      const mid = p.clone().lerp(next, 0.5);
      const rm = r * 0.88;
      const tilt = 1 / Math.cos(tilts[k + 1] ?? 0);
      sections.push({ z: mid.z, x: mid.x, y: mid.y, rx: rm * tilt, front: rm, back: rm });
    }
  });
  // La yema, roma y redonda (no una garra).
  const tip = joints[total] ?? base;
  const tipRadius = radiusAt(total);
  const pad = tip.z - tipRadius * 0.5;
  sections.push(
    {
      z: pad,
      x: tip.x,
      y: tip.y,
      rx: tipRadius * 0.78,
      front: tipRadius * 0.78,
      back: tipRadius * 0.8,
    },
    {
      z: tip.z - tipRadius * 0.85,
      x: tip.x,
      y: tip.y,
      rx: tipRadius * 0.25,
      front: tipRadius * 0.25,
      back: tipRadius * 0.25,
    },
  );
  sections.sort((a, b) => a.z - b.z);
  const top = base.z + radius * 0.6;
  sections.push({ z: top, x: base.x, y: base.y, rx: radius, front: radius, back: radius });
  const bottom = sections[0]?.z ?? tip.z;
  const knuckles = joints.slice(1, total).map((p) => p.z);
  const skin = new Color(c.look.ceramic);
  const seam = new Color(c.look.seam);
  const tipColor = new Color(c.look.ceramicShade);
  const geometry = loftGeometry(sections, {
    rows: rowsBetween(bottom, top, 0.036, [...knuckles, ...joints.map((p) => p.z), pad]),
    columns: 5,
    lift: (_, z) => (knuckles.some((k) => Math.abs(z - k) < 0.002) ? -0.0018 : 0),
    color: (_, z) =>
      knuckles.some((k) => Math.abs(z - k) < 0.002)
        ? seam
        : z < (joints[total - 1]?.z ?? z)
          ? tipColor
          : skin,
  });
  woven(s, geometry, frame);
}

/** La mano: palma estrecha y tres dedos largos un poco curvados hacia la palma, y el pulgar delante. */
export function buildHand(s: AbsentSegment, c: AbsentContext, side: number): void {
  const spec = HANDS[c.who];
  const [wx, wy, wz] = c.joints.wrist;
  const frame = new Matrix4()
    .makeTranslation(wx * side, wy, wz)
    .multiply(new Matrix4().makeRotationZ(side * spec.yaw));
  const { thick, wide, long } = spec.palm;
  // La palma: más ancha hacia los nudillos, se cierra en la muñeca.
  const palm: Section[] = [
    { z: -long - 0.008, rx: thick * 0.7, front: wide * 0.85, back: wide * 0.8 },
    { z: -long * 0.82, rx: thick, front: wide, back: wide * 0.95 },
    { z: -long * 0.4, rx: thick * 1.05, front: wide * 0.98, back: wide * 0.88 },
    { z: -long * 0.05, rx: thick * 0.85, front: wide * 0.7, back: wide * 0.68 },
    { z: 0.012, rx: thick * 0.5, front: wide * 0.45, back: wide * 0.45 },
  ].map((p) => ({ ...p, x: side * thick * 0.15 }));
  const skin = new Color(c.look.ceramic);
  woven(
    s,
    loftGeometry(palm, {
      rows: rowsBetween(-long - 0.008, 0.012, 0.03),
      columns: 10,
      color: () => skin,
    }),
    frame,
  );
  const [first, second, third] = spec.phalanges;
  for (const [k, y] of [
    [0, spec.spacing],
    [1, 0],
    [2, -spec.spacing],
  ] as const) {
    const scale = k === 1 ? 1 : 0.9;
    finger(
      s,
      c,
      frame,
      new Vector3(0, y, -long + 0.004),
      [first * scale, second * scale, third * scale],
      spec.finger * (k === 2 ? 0.92 : 1),
      spec.curl,
      side,
    );
  }
  thumb(s, c, frame, spec, side);
  backCircuit(s, c, frame, spec, side);
  s.add(
    'metal',
    c.look.copperDark,
    ball(1, 1),
    pieceMatrix([wx * side, wy, wz], [0, 0, 0], [thick * 1.1, wide * 0.7, thick * 1.1]),
    0.03,
  );
  frostShard(
    s,
    new Vector3(wx * side, wy, wz - long * 0.5).add(new Vector3(side * thick, 0, 0)),
    new Vector3(side, 0.2, 0).normalize(),
    0.03,
  );
}

/** El pulgar: un dedo de dos falanges que sale de delante de la palma, inclinado hacia delante y abajo. */
function thumb(
  s: AbsentSegment,
  c: AbsentContext,
  frame: Matrix4,
  spec: HandSpec,
  side: number,
): void {
  const base = new Vector3(
    -side * spec.palm.thick * 0.25,
    spec.palm.wide * 0.72,
    -spec.palm.long * 0.32,
  );
  // En su propio marco, «abajo» es algo hacia delante de la mano: el pulgar cuelga junto a la palma, no de punta.
  const tilted = frame
    .clone()
    .multiply(new Matrix4().makeTranslation(base.x, base.y, base.z))
    .multiply(new Matrix4().makeRotationX(THUMB_TILT));
  finger(
    s,
    c,
    tilted,
    new Vector3(0, 0, 0),
    [spec.phalanges[0] * 0.62, spec.phalanges[1] * 0.68],
    spec.finger * 1.08,
    [0.22, 0.3],
    side,
  );
}

/** Lo que se inclina el pulgar hacia delante (rad). */
const THUMB_TILT = 0.32;

/** El cobre del dorso: de la muñeca a cada dedo. */
function backCircuit(
  s: AbsentSegment,
  c: AbsentContext,
  frame: Matrix4,
  spec: HandSpec,
  side: number,
): void {
  const x = side * (spec.palm.thick * 1.12 + 0.001);
  const start = new Vector3(x * 0.8, 0, -0.012).applyMatrix4(frame);
  for (const y of [spec.spacing, 0, -spec.spacing]) {
    const end = new Vector3(x * 0.85, y * 0.9, -spec.palm.long * 0.88).applyMatrix4(frame);
    const mid = new Vector3(x, y * 0.5, -spec.palm.long * 0.45).applyMatrix4(frame);
    trace(s, c.look.copper, start, mid, 0.006);
    trace(s, c.look.copper, mid, end, 0.006);
  }
}

/** El pie: largo y estrecho, tejido a lo largo (de talón a puntera), con tres dedos romos. */
export function buildFoot(s: AbsentSegment, c: AbsentContext, side: number): void {
  const big = c.who === 'esceptico';
  const [ax, ay] = c.joints.ankle;
  const x = ax * side;
  const width = big ? 0.068 : 0.044;
  const high = big ? 0.085 : 0.066;
  const heel = big ? -0.085 : -0.064;
  const toe = big ? 0.27 : 0.215;
  const axis = big ? 0.048 : 0.04;
  // Secciones a lo largo del pie (z local = hacia delante): media anchura, alto sobre el eje y bajo él.
  const length: FullSection[] = [
    { z: heel - 0.012, x: 0, y: 0, rx: width * 0.4, front: high * 0.3, back: axis * 0.5 },
    { z: heel + 0.01, x: 0, y: 0, rx: width * 0.8, front: high * 0.72, back: axis },
    { z: 0.03, x: 0, y: 0, rx: width * 0.9, front: high, back: axis },
    { z: toe * 0.55, x: 0, y: 0, rx: width, front: high * 0.55, back: axis },
    {
      z: toe * 0.82,
      x: 0,
      y: -axis * 0.25,
      rx: width * 0.95,
      front: axis * 0.6,
      back: axis * 0.75,
    },
  ];
  // Del marco del pie al de diseño: z local → +Y, y local → +Z (arriba), x local → −X.
  const frame = new Matrix4()
    .makeBasis(new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0))
    .setPosition(x, ay, axis);
  const skin = new Color(c.look.ceramic);
  const shadeTone = new Color(c.look.ceramicShade);
  s.addWoven(
    'ceramic',
    loftGeometry(length, {
      rows: rowsBetween(heel - 0.012, toe * 0.82, 0.05, [heel + 0.01]),
      columns: 10,
      color: (_, z) => (z < heel + 0.02 ? shadeTone : skin),
    }).applyMatrix4(frame),
  );
  // Tres dedos romos, el de en medio delante.
  for (const k of [-1, 0, 1]) {
    const tx = x + k * width * 0.62;
    const ty = toe * 0.86 + (k === 0 ? 0.03 : 0.012);
    s.add(
      'ceramic',
      c.look.ceramicShade,
      ball(1, 1),
      pieceMatrix([tx, ty, axis * 0.72], [0, 0, 0], [width * 0.36, 0.05, axis * 0.7]),
      0.02,
    );
  }
  s.add(
    'metal',
    c.look.copperDark,
    ball(1, 1),
    pieceMatrix([x, ay, c.joints.ankle[2]], [0, 0, 0], [width * 0.75, width * 0.75, width * 0.6]),
    0.03,
  );
  frostShard(
    s,
    new Vector3(x, toe * 0.4, high + 0.02),
    new Vector3(side * 0.2, 0.3, 1).normalize(),
    0.035,
  );
}
