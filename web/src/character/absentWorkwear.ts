// La ropa del escéptico (plan de finales, E3; 🟡 Anthony 2026-11-14): forjaba las Puertas, así que viste de taller.
// Un chaleco de lona verde oliva con escote en pico (deja ver la placa de su signo) y una correa con hebilla, un
// cinturón ancho de cuero con la hebilla de oro de su signo (dos triángulos punta con punta) y dos bolsas, un
// delantal de forja de cuero partido en dos perneras que no llega a la rodilla, y una bandolera que cruza del hombro
// derecho a la cadera izquierda, por debajo de la placa, con sus herramientas: cincel, punzón y martillo. En la
// espalda del chaleco, su signo en un parche de cuero. Cada pieza cuelga de su hueso (absentCloth.ts).
import { Color, Matrix4 } from 'three';
import { box, cylinder, pieceMatrix } from '../worlds/procedural/kit';
import { loftGeometry, onSections, rowsBetween, smooth01 } from './absentLoft';
import type { Section } from './absentShape';
import {
  curve,
  drape,
  drapeFrame,
  flatStrip,
  leanBelow,
  skirtPanel,
  type DrapeOptions,
  type Lean,
} from './absentCloth';
import { surfaceMatrix, type SurfacePoint } from './explorerParts';
import { frostShard, stud, type AbsentContext, type AbsentSegment } from './absentParts';

/** El delantal entero, centrado en el cuerpo: sale de bajo el cinturón y cae sobre los muslos. */
const APRON: readonly Section[] = [
  { z: 0.94, rx: 0.335, front: 0.18, back: 0.14 },
  { z: 1.2, rx: 0.365, front: 0.21, back: 0.15 },
  { z: 1.42, rx: 0.372, front: 0.21, back: 0.16 },
  { z: 1.53, rx: 0.36, front: 0.2, back: 0.17 },
  // Arriba, por delante se mete bajo el cinturón; por los lados tapa lo alto del muslo.
  { z: 1.575, rx: 0.345, front: 0.172, back: 0.17 },
];
const APRON_TOP = 1.575;
const APRON_HEM = 0.95;

/**
 * La culera: el faldón de cuero que los mineros y fundidores llevan detrás para sentarse en la roca caliente. Sale de
 * bajo el cinturón y se abre hacia abajo, ancha y casi plana, por detrás de las nalgas y de lo alto de los muslos.
 */
const SEAT_FLAP: readonly Section[] = [
  { z: 1.33, rx: 0.42, front: 0.1, back: 0.215 },
  { z: 1.42, rx: 0.42, front: 0.12, back: 0.215 },
  { z: 1.5, rx: 0.38, front: 0.14, back: 0.208 },
  { z: 1.6, rx: 0.25, front: 0.16, back: 0.19 },
];
/** Media anchura de la culera (rad desde la espalda). */
const SEAT_FLAP_HALF = 0.95;

/** El cinturón (de abajo arriba) y lo que se separa del cuerpo. */
const BELT: readonly [number, number] = [1.55, 1.64];
const BELT_LIFT = 0.024;

/** Media abertura del escote del chaleco (rad desde el frente) y lo que se separa del cuerpo. */
const VEST_OPEN = 0.3;
/** Lo bajo del pico del escote: justo bajo la placa del signo. */
const VEST_V = 2.02;
const STRAP_LIFT = 0.034;
/**
 * Cuánto de su encorvamiento compensa lo que el pecho lleva por debajo de su articulación: entero, de pie quedaría
 * perfecto pero congelado (erguido) se despegaría de la barriga; así, de pie la tela asoma y erguido apenas se separa.
 */
const LEAN_SHARE = 0.7;

/** Lo que el pecho cuelga por debajo de su articulación, adelantado para que encorvado no se meta en la barriga. */
const chestLean = (c: AbsentContext): Lean => ({
  pivot: c.joints.chest[2],
  slope: LEAN_SHARE * Math.sin(Math.max(0, -c.skeleton.posture.chest)),
});

const shadeOf = (color: string, k: number): string =>
  `#${new Color(color).multiplyScalar(k).getHexString()}`;
const fromFront = (az: number): number => Math.abs(Math.atan2(Math.sin(az), Math.cos(az)));

/** Su signo en metal: dos triángulos llenos que se tocan por la punta (como el del pecho). */
function hourglassBadge(
  s: AbsentSegment,
  color: string,
  frame: Matrix4,
  radius: number,
  thick: number,
): void {
  for (const [y, turn] of [
    [radius, 0],
    [-radius, Math.PI],
  ] as const) {
    s.add(
      'metal',
      color,
      cylinder(1, 3),
      frame.clone().multiply(pieceMatrix([0, y, 0], [0, 0, turn], [radius, radius, thick])),
      0,
    );
  }
}

const raised = (at: SurfacePoint, by: number): SurfacePoint => ({
  point: at.point.clone().addScaledVector(at.normal, by),
  normal: at.normal,
});

/** El cinturón ancho con su hebilla, los remaches y las dos bolsas de atrás. */
export function workwearPelvis(s: AbsentSegment, c: AbsentContext): void {
  const torso = c.shape.torso;
  const [from, to] = BELT;
  const leather = new Color(c.look.trim);
  s.addWoven(
    'cloth',
    loftGeometry(torso, {
      rows: rowsBetween(from, to, 0.03),
      columns: 28,
      // Bordes redondeados: más pegado arriba y abajo.
      lift: (_az, z) =>
        0.008 + (BELT_LIFT - 0.008) * Math.sin((Math.PI * (z - from)) / (to - from)),
      color: () => leather,
    }),
  );
  const middle = (from + to) / 2;
  const front = onSections(torso, 0, middle, BELT_LIFT);
  s.add('metal', c.look.goldDark, box(), surfaceMatrix(front, [0.082, 0.07, 0.01]), 0);
  hourglassBadge(s, c.look.gold, surfaceMatrix(raised(front, 0.008), [1, 1, 1]), 0.022, 0.007);
  for (const az of [-2.3, -1.25, -0.6, 0.6, 1.25, 2.3]) {
    stud(s, 'metal', c.look.copper, onSections(torso, az, middle, BELT_LIFT + 0.002).point, 0.008);
  }
  for (const side of [-1, 1]) {
    const at = onSections(torso, side * 1.95, middle - 0.035, BELT_LIFT + 0.026);
    s.add('cloth', c.look.cloth, box(), surfaceMatrix(at, [0.1, 0.12, 0.05]), 0.03);
    const flap = onSections(torso, side * 1.95, middle + 0.01, BELT_LIFT + 0.03);
    s.add('cloth', c.look.trim, box(), surfaceMatrix(flap, [0.106, 0.045, 0.054]), 0.02);
    stud(s, 'metal', c.look.gold, raised(flap, 0.027).point, 0.007);
  }
  seatFlap(s, c);
}

/** La culera de cuero, con el borde más oscuro (sentado, lo de abajo queda sobre el asiento). */
function seatFlap(s: AbsentSegment, c: AbsentContext): void {
  const side = Math.PI - SEAT_FLAP_HALF;
  drape(s, {
    body: SEAT_FLAP,
    lift: () => 0.004,
    arc: [side, Math.PI * 2 - side],
    top: () => 1.6,
    hem: (az) =>
      curve(
        [
          [side, 1.42],
          [Math.PI - 0.5, 1.365],
          [Math.PI, 1.345],
        ],
        fromFront(az),
      ),
    columns: 12,
    rows: 4,
    colors: { base: c.look.cloth, shade: c.look.clothShade, trim: c.look.trim },
    trim: 0.018,
    foldDepth: (drop) => 0.006 * drop,
    foldCount: 7,
  });
}

/** La pernera del delantal de un muslo: por delante y por fuera, de bajo el cinturón a encima de la rodilla. */
export function workwearThigh(s: AbsentSegment, c: AbsentContext, side: number): void {
  skirtPanel(s, {
    sections: APRON,
    from: APRON_HEM,
    to: APRON_TOP,
    side,
    arc: [-0.12, 1.15],
    // El cuero no hace casi pliegues: solo unas ondas suaves abajo.
    depth: (z) => 0.003 + 0.004 * smooth01(1.45, 1.0, z),
    count: 10,
    colors: { base: c.look.cloth, shade: c.look.clothShade, trim: c.look.trim },
    hem: 0.022,
    step: 0.1,
    columns: 14,
  });
  const scorch = onSections(APRON, side * 0.45, 1.08, 0.006);
  frostShard(s, scorch.point, scorch.normal, 0.045);
}

/** El chaleco sobre el pecho: abierto en pico por delante, con sisas hondas para los brazos. */
function vest(c: AbsentContext): DrapeOptions {
  return {
    body: c.shape.torso,
    // Algo más suelto abajo, donde ya no lo sujetan los hombros.
    lift: (_az, z) => 0.016 + 0.008 * smooth01(1.95, 1.75, z),
    arc: [VEST_OPEN, Math.PI * 2 - VEST_OPEN],
    hem: (az) =>
      curve(
        [
          [VEST_OPEN, 1.7],
          [1.2, 1.745],
          [Math.PI, 1.725],
        ],
        fromFront(az),
      ),
    top: (az) =>
      curve(
        [
          [VEST_OPEN, VEST_V],
          [0.6, 2.3],
          [0.95, 2.4],
          [1.3, 2.2],
          [Math.PI / 2, 2.0],
          [1.85, 2.2],
          [2.2, 2.42],
          [Math.PI, 2.41],
        ],
        fromFront(az),
      ),
    columns: 32,
    rows: 6,
    colors: { base: c.look.drape, shade: shadeOf(c.look.drape, 0.64), trim: c.look.trim },
    trim: 0.02,
    foldDepth: (drop) => 0.005 * drop,
    foldCount: 9,
    lean: chestLean(c),
  };
}

/** La bandolera: del hombro derecho a la cadera izquierda por delante (bajo la placa) y de vuelta por la espalda. */
const STRAP_ROUTE: readonly (readonly [number, number])[] = [
  [0.72, 2.37],
  [0.62, 2.2],
  [0.55, 2.05],
  [0.25, 1.935],
  [-0.3, 1.86],
  [-0.9, 1.8],
  [-1.45, 1.775],
  [-2.0, 1.8],
  [-2.6, 1.92],
  [-Math.PI, 2.05],
  [-3.7, 2.2],
  [-4.1, 2.32],
  [-4.4, 2.37],
  [-4.8, 2.378],
  [-5.2, 2.378],
  [0.72 - Math.PI * 2, 2.37],
];
const STRAP_STEP = 0.12;

function bandolier(s: AbsentSegment, c: AbsentContext): void {
  const lean = chestLean(c);
  const at = (az: number, z: number): SurfacePoint => {
    const p = onSections(c.shape.torso, az, z, STRAP_LIFT);
    return { point: leanBelow(p.point, lean), normal: p.normal };
  };
  for (let k = 1; k < STRAP_ROUTE.length; k++) {
    const [a0, z0] = STRAP_ROUTE[k - 1] ?? [0, 0];
    const [a1, z1] = STRAP_ROUTE[k] ?? [0, 0];
    const span = at(a0, z0).point.distanceTo(at(a1, z1).point);
    const steps = Math.max(1, Math.ceil(span / STRAP_STEP));
    for (let j = 0; j < steps; j++) {
      const p = at(a0 + ((a1 - a0) * j) / steps, z0 + ((z1 - z0) * j) / steps);
      const q = at(a0 + ((a1 - a0) * (j + 1)) / steps, z0 + ((z1 - z0) * (j + 1)) / steps);
      const normal = p.normal.clone().add(q.normal).normalize();
      flatStrip(s, 'cloth', c.look.trim, p.point, q.point, normal, 0.052, 0.009);
    }
  }
  tools(s, c, at);
}

/** Cincel, punzón y martillo, metidos en sus presillas de la bandolera (a la derecha de la placa). */
function tools(
  s: AbsentSegment,
  c: AbsentContext,
  at: (az: number, z: number) => SurfacePoint,
): void {
  const steel = '#8d918f';
  const wood = '#6b4a2c';
  const onStrap = (az: number, z: number, by: number): SurfacePoint => raised(at(az, z), by);
  // Cincel: una barra cuadrada con la boca afilada abajo.
  const chisel = onStrap(0.69, 2.22, 0.018);
  s.add('metal', steel, box(), surfaceMatrix(chisel, [0.016, 0.15, 0.016]), 0.03);
  s.add(
    'metal',
    shadeOf(steel, 0.8),
    box(),
    surfaceMatrix(onStrap(0.69, 2.135, 0.018), [0.024, 0.03, 0.008]),
    0.02,
  );
  // Punzón: redondo, con la cabeza ancha.
  const punch = onStrap(0.59, 2.15, 0.016);
  // (El cilindro del kit va a lo largo de Z: se tumba hacia el «arriba» del marco antes de escalarlo.)
  const upright = new Matrix4().makeRotationX(Math.PI / 2);
  s.add(
    'metal',
    steel,
    cylinder(1, 8),
    surfaceMatrix(punch, [0.009, 0.12, 0.009]).multiply(upright),
    0.03,
  );
  // Martillo: el mango de madera hacia abajo y la cabeza de acero arriba, de lado.
  const handle = onStrap(0.5, 2.0, 0.02);
  s.add(
    'cloth',
    wood,
    cylinder(1, 8),
    surfaceMatrix(handle, [0.012, 0.2, 0.012]).multiply(upright),
    0.03,
  );
  const head = onStrap(0.53, 2.105, 0.026);
  s.add('metal', steel, box(), surfaceMatrix(head, [0.08, 0.03, 0.03], 0.5), 0.02);
  // Las presillas, encima de cada herramienta.
  for (const [az, z] of [
    [0.69, 2.26],
    [0.59, 2.17],
    [0.51, 2.04],
  ] as const) {
    s.add(
      'cloth',
      shadeOf(c.look.trim, 1.25),
      box(),
      surfaceMatrix(onStrap(az, z, 0.03), [0.05, 0.018, 0.012], 0.25),
      0.02,
    );
  }
}

/** El chaleco, su correa de delante, el parche de la espalda, la bandolera y la escarcha. */
export function workwearChest(s: AbsentSegment, c: AbsentContext): void {
  const options = vest(c);
  drape(s, options);
  // Por debajo del pico, el chaleco se cierra con una tapeta y tres botones de cobre.
  const bottom = options.hem(VEST_OPEN);
  drape(s, {
    ...options,
    arc: [-VEST_OPEN - 0.04, VEST_OPEN + 0.04],
    top: () => VEST_V,
    hem: () => bottom,
    lift: (az, z) => options.lift(az, z) + 0.003,
    columns: 8,
    rows: 4,
  });
  for (const z of [1.76, 1.83, 1.99]) {
    const button = onSections(c.shape.torso, 0, z, options.lift(0, z) + 0.008).point;
    stud(s, 'metal', c.look.copper, leanBelow(button, options.lean), 0.009);
  }
  // Su signo en un parche de cuero en la espalda.
  const back = drapeFrame(options, Math.PI, 0.4);
  s.add(
    'cloth',
    c.look.trim,
    cylinder(1, 14),
    surfaceMatrix(raised(back, 0.002), [0.085, 0.1, 0.006]),
    0,
  );
  hourglassBadge(s, c.look.gold, surfaceMatrix(raised(back, 0.007), [1, 1, 1]), 0.034, 0.004);
  bandolier(s, c);
  for (const [az, drop] of [
    [1.0, 0.5],
    [-1.3, 0.7],
    [2.6, 0.35],
    [-2.2, 0.8],
  ] as const) {
    const p = drapeFrame(options, az, drop);
    frostShard(s, p.point, p.normal, 0.05);
  }
}
