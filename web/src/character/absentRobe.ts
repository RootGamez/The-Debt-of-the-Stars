// La ropa de la científica (plan de finales, E3; 🟡 Anthony 2026-11-14): una túnica larga de tela pesada, añil, con
// pliegues que se ahondan hacia el dobladillo, ceñida en la cintura por una faja ocre con un broche de oro (su rombo
// con un punto), y un manto ocre sobre los hombros, abierto por delante para dejar ver la placa de su signo, que le
// cae por la espalda y lleva su signo bordado en oro. Las piezas cuelgan de sus huesos (absentCloth.ts).
import { Color, Vector3 } from 'three';
import { ball, box, pieceMatrix } from '../worlds/procedural/kit';
import {
  gridGeometry,
  loftGeometry,
  onSections,
  rowsBetween,
  sectionAt,
  smooth01,
  spread,
} from './absentLoft';
import type { Section } from './absentShape';
import {
  curve,
  drape,
  drapeFrame,
  drapePoint,
  flatStrip,
  folds,
  skirtPanel,
  type DrapeOptions,
} from './absentCloth';
import { surfaceMatrix } from './explorerParts';
import { frostShard, stud, type AbsentContext, type AbsentSegment } from './absentParts';

/** La falda entera, centrada en el cuerpo (su espalda junto a la cadera es lo que apoya al sentarse: 0,17 m). */
const SKIRT: readonly Section[] = [
  { z: 0.22, rx: 0.37, front: 0.262, back: 0.252 },
  { z: 0.45, rx: 0.345, front: 0.232, back: 0.215 },
  { z: 0.68, rx: 0.327, front: 0.206, back: 0.18 },
  { z: 0.95, rx: 0.317, front: 0.19, back: 0.172 },
  { z: 1.22, rx: 0.312, front: 0.174, back: 0.17 },
  { z: 1.26, rx: 0.305, front: 0.17, back: 0.17 },
];

/** De la cadera a la cintura, por encima de la falda. */
const WAIST: readonly Section[] = [
  { z: 1.2, rx: 0.313, front: 0.175, back: 0.174 },
  { z: 1.26, rx: 0.304, front: 0.17, back: 0.172 },
  { z: 1.31, rx: 0.27, front: 0.152, back: 0.158 },
  { z: 1.36, rx: 0.192, front: 0.122, back: 0.128 },
  { z: 1.41, rx: 0.146, front: 0.105, back: 0.111 },
  { z: 1.455, rx: 0.139, front: 0.101, back: 0.107 },
];

const HIP_LINE = 1.22;
const HEM = 0.22;

const shadeOf = (color: string, k: number): string =>
  `#${new Color(color).multiplyScalar(k).getHexString()}`;

/** La cintura y las caderas de la túnica, la faja y su broche. */
export function robePelvis(s: AbsentSegment, c: AbsentContext): void {
  const cloth = new Color(c.look.cloth);
  const shadeTone = new Color(c.look.clothShade);
  s.addWoven(
    'cloth',
    loftGeometry(WAIST, {
      rows: rowsBetween(HIP_LINE - 0.02, 1.455, 0.045),
      columns: 30,
      // Fruncida bajo la faja: pliegues que se abren hacia la cadera.
      lift: (az, z) => 0.007 * smooth01(1.44, 1.3, z) * folds(az, z, 9),
      color: (az, z) =>
        cloth.clone().lerp(shadeTone, 0.5 * (1 - folds(az, z, 9)) * smooth01(1.44, 1.3, z)),
    }),
  );
  // Sentada, el muslo gira bajo la cadera: este rodillo (redondo alrededor del eje de las caderas) tapa la juntura.
  s.add(
    'cloth',
    c.look.clothShade,
    ball(1, 1),
    pieceMatrix([0, 0, HIP_LINE], [0, 0, 0], [0.29, 0.168, 0.168]),
    0,
  );
  // La faja ocre y su broche de oro: un rombo con un punto, como su signo.
  const sash = new Color(c.look.drape);
  const sashShade = new Color(shadeOf(c.look.drape, 0.72));
  s.addWoven(
    'cloth',
    loftGeometry(WAIST, {
      rows: rowsBetween(1.392, 1.452, 0.02),
      columns: 28,
      lift: (az, z) => 0.008 + 0.003 * folds(az, z, 8),
      color: (az, z) => sash.clone().lerp(sashShade, 0.5 * (1 - folds(az, z, 8))),
    }),
  );
  const front = onSections(WAIST, 0, 1.422, 0.013);
  s.add('metal', c.look.gold, box(), surfaceMatrix(front, [0.034, 0.034, 0.008], Math.PI / 4), 0);
  stud(
    s,
    'metal',
    c.look.goldDark,
    front.point.clone().addScaledVector(front.normal, 0.006),
    0.006,
  );
}

/** La mitad de la falda que cuelga de un muslo: sentada, queda sobre el regazo. */
export function robeThigh(s: AbsentSegment, c: AbsentContext, side: number): void {
  skirtPanel(s, {
    sections: SKIRT,
    from: c.joints.knee[2] - 0.02,
    to: HIP_LINE + 0.03,
    side,
    // Pliegues suaves por delante y por fuera; por detrás, lisa (es lo que apoya en el asiento).
    depth: (z) => 0.004 + 0.006 * smooth01(1.2, 0.7, z),
    fade: (az) => 1 - smooth01(Math.PI * 0.55, Math.PI * 0.85, az),
    count: 14,
    colors: { base: c.look.cloth, shade: c.look.clothShade },
    step: 0.1,
  });
}

/**
 * Media falda redonda alrededor del eje de las rodillas: su sección, a cada distancia del centro, es la de la falda
 * a la altura de la rodilla. De pie queda dentro de la falda; sentada, cuando la caída gira bajo el regazo, redondea
 * la esquina como la tela doblada sobre la rodilla.
 */
function kneeRoll(s: AbsentSegment, c: AbsentContext, side: number): void {
  const [, ky, kz] = c.joints.knee;
  const skirt = sectionAt(SKIRT, kz);
  const half = skirt.rx - 0.012;
  const radius = Math.min(skirt.front - ky, skirt.back + ky) - 0.012;
  const color = new Color(c.look.cloth);
  s.addWoven(
    'cloth',
    gridGeometry({
      us: spread(0, Math.PI * 2, 14, true),
      vs: spread(0, Math.PI / 2, 6),
      closed: true,
      // Hacia +X la cara de fuera queda dentro: se da la vuelta en la mitad derecha.
      flip: side > 0,
      point: (u, v) => {
        const r = radius * Math.cos(v);
        return new Vector3(side * half * Math.sin(v), ky + r * Math.cos(u), kz + r * Math.sin(u));
      },
      color: () => color,
    }),
  );
}

/** La rodilla y la mitad de la falda que cae de ella hasta el dobladillo. */
export function robeShin(s: AbsentSegment, c: AbsentContext, side: number): void {
  const [, , kz] = c.joints.knee;
  kneeRoll(s, c, side);
  skirtPanel(s, {
    sections: SKIRT,
    from: HEM,
    to: kz + 0.04,
    side,
    depth: (z) => 0.006 + 0.03 * smooth01(0.7, HEM, z),
    count: 14,
    colors: { base: c.look.cloth, shade: c.look.clothShade, trim: c.look.trim },
    hem: 0.026,
    step: 0.075,
  });
  for (const [az, z] of [
    [side * 0.4, 0.3],
    [side * 1.4, 0.45],
    [side * 2.6, 0.36],
  ] as const) {
    const p = onSections(SKIRT, az, z, 0.02);
    frostShard(s, p.point, p.normal, 0.05);
  }
}

/** El manto sobre los hombros (en el hueso del pecho): abierto por delante, más largo por detrás. */
function mantle(c: AbsentContext): DrapeOptions {
  const { center, radii } = c.shape.shoulder;
  const front = 0.55;
  const fromFront = (az: number): number => Math.abs(Math.atan2(Math.sin(az), Math.cos(az)));
  return {
    body: c.shape.torso,
    // Por detrás cae separándose de la espalda, con vuelo (la tela pesada no se pega a la cintura).
    lift: (az, z) => 0.016 + 0.075 * smooth01(1.82, 1.38, z) * smooth01(1.4, 2.6, fromFront(az)),
    // La tela pasa por encima de los dos hombros.
    avoid: [1, -1].map(
      (side) => ({ center: [center[0] * side, center[1], center[2]], radii }) as const,
    ),
    clearance: 0.016,
    arc: [front, Math.PI * 2 - front],
    hem: (az) =>
      curve(
        [
          [front, 1.6],
          [1.15, 1.71],
          [1.57, 1.772],
          [2.05, 1.6],
          [2.6, 1.42],
          [Math.PI, 1.36],
        ],
        fromFront(az),
      ),
    top: (az) =>
      curve(
        [
          [front, 1.895],
          [1.2, 1.916],
          [2.0, 1.93],
          [Math.PI, 1.935],
        ],
        fromFront(az),
      ),
    columns: 32,
    rows: 8,
    colors: { base: c.look.drape, shade: shadeOf(c.look.drape, 0.62), trim: c.look.trim },
    trim: 0.022,
    foldDepth: (drop) => 0.045 * drop ** 1.3,
    foldCount: 10,
  };
}

/** Un rombo hueco con un punto (su signo), de hilo de oro, sobre un punto de la tela. */
function embroidered(
  s: AbsentSegment,
  c: AbsentContext,
  at: Vector3,
  normal: Vector3,
  size: number,
): void {
  const up = new Vector3(0, 0, 1);
  const across = new Vector3().crossVectors(up, normal).normalize();
  const tangentUp = new Vector3().crossVectors(normal, across).normalize();
  const corner = (dx: number, dy: number): Vector3 =>
    at
      .clone()
      .addScaledVector(across, dx * size)
      .addScaledVector(tangentUp, dy * size)
      .addScaledVector(normal, 0.003);
  const corners = [corner(0, 0.5), corner(0.5, 0), corner(0, -0.5), corner(-0.5, 0)];
  corners.forEach((p, k) => {
    flatStrip(s, 'metal', c.look.gold, p, corners[(k + 1) % 4] ?? p, normal, 0.014, 0.004);
  });
  stud(s, 'metal', c.look.gold, at.clone().addScaledVector(normal, 0.005), 0.014);
}

/** El manto, su broche delante (sobre la placa del signo) y su signo bordado en la espalda. */
export function robeChest(s: AbsentSegment, c: AbsentContext): void {
  const options = mantle(c);
  drape(s, options);
  const back = drapeFrame(options, Math.PI, 0.45);
  embroidered(s, c, back.point, back.normal, 0.13);
  // Dos broches en los bordes de delante, unidos por una cadena fina que cuelga por encima de la placa.
  const edges = [options.arc[0] + 0.03, options.arc[1] - 0.03].map((az) =>
    drapeFrame(options, az, 0.18),
  );
  const [a, b] = edges;
  if (a && b) {
    for (const p of edges) {
      s.add('metal', c.look.gold, box(), surfaceMatrix(p, [0.024, 0.024, 0.007], Math.PI / 4), 0);
    }
    const sag = onSections(c.shape.torso, 0, a.point.z - 0.035, 0.02).point;
    const toward = new Vector3(0, 1, 0);
    flatStrip(s, 'metal', c.look.goldDark, a.point, sag, toward, 0.005, 0.004);
    flatStrip(s, 'metal', c.look.goldDark, sag, b.point, toward, 0.005, 0.004);
  }
  for (const [az, drop] of [
    [2.2, 0.6],
    [-2.5, 0.8],
    [Math.PI, 0.9],
    [1.3, 0.3],
  ] as const) {
    const p = drapePoint(options, az, drop);
    frostShard(s, p, new Vector3(p.x, p.y, 0.4).normalize(), 0.045);
  }
}
