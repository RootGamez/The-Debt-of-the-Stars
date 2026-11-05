// El Albatros II por fuera (Fase 11): un disco de tela cosida en gajos sobre costillas, con la franja verde del
// Instituto en el borde, la cúpula de cristal, el ventanal delantero, las patas, el mástil con su farol y las toberas
// (los motores de popa, la sustentación de la panza y los cuatro grupos de maniobra del borde).
import type { BufferGeometry } from 'three';
import { SphereGeometry } from 'three';
import { ball, box, cone, cylinder, torus } from '../../worlds/procedural/kit';
import { THRUSTERS, type Thruster } from '../thrusters';
import {
  ALBATROS_PALETTE as C,
  at,
  between,
  discWithHole,
  lathe,
  prepared,
  type PieceSet,
} from './albatrosParts';
import {
  BELLY_FLAT_RADIUS,
  BELLY_Y,
  bellyY,
  CLEARANCE,
  DOME_BASE_RADIUS,
  DOME_BASE_Y,
  DOME_TOP_Y,
  FLOOR_Y,
  RIM_BOTTOM,
  RIM_RADIUS,
  RIM_TOP,
  WELL,
  WINDOW_ARC,
  WINDOW_BOTTOM_Y,
  WINDOW_TOP_Y,
} from './albatrosShape';

const SEGMENTS = 48;
/** Gajos de tela del casco (alternan dos tonos). */
const GORES = 16;
const FRONT = Math.PI;

/** El perfil del casco por encima del borde, de abajo arriba (radio, altura). */
const LOWER_BAND: [number, number][] = [
  [RIM_RADIUS, RIM_TOP],
  [4.42, WINDOW_BOTTOM_Y],
];
const WINDOW_BAND: [number, number][] = [
  [4.42, WINDOW_BOTTOM_Y],
  [4.3, 0.35],
  [4.0, WINDOW_TOP_Y],
];
const TOP_BAND: [number, number][] = [
  [4.0, WINDOW_TOP_Y],
  [3.55, 1.12],
  [3.05, 1.28],
  [DOME_BASE_RADIUS + 0.07, DOME_BASE_Y + 0.08],
];

/** Gajos alternos de una banda del casco entre dos ángulos. */
function gores(
  pieces: PieceSet,
  profile: [number, number][],
  from: number,
  length: number,
  colors: [string, string],
): void {
  const count = Math.max(1, Math.round((GORES * length) / (Math.PI * 2)));
  const step = length / count;
  for (let k = 0; k < count; k++) {
    const segments = Math.max(2, Math.round(SEGMENTS / GORES));
    pieces.add(
      colors[k % 2] ?? colors[0],
      lathe(profile, segments, from + k * step, step),
      at([0, 0, 0]),
      'stone',
      { solid: true, vary: 0.015 },
    );
  }
}

function shell(pieces: PieceSet, glass: BufferGeometry[]): void {
  // El borde con la franja verde del Instituto.
  pieces.add(
    C.green,
    lathe(
      [
        [RIM_RADIUS - 0.02, RIM_BOTTOM],
        [RIM_RADIUS + 0.06, (RIM_BOTTOM + RIM_TOP) / 2],
        [RIM_RADIUS, RIM_TOP],
      ],
      SEGMENTS,
    ),
    at([0, 0, 0]),
    'stone',
    { solid: true },
  );
  gores(pieces, LOWER_BAND, 0, Math.PI * 2, [C.cream, C.creamDark]);
  // El ventanal delantero: cristal en la proa, tela en el resto.
  gores(pieces, WINDOW_BAND, FRONT + WINDOW_ARC / 2, Math.PI * 2 - WINDOW_ARC, [
    C.cream,
    C.creamDark,
  ]);
  glass.push(lathe(WINDOW_BAND, 24, FRONT - WINDOW_ARC / 2, WINDOW_ARC));
  pieces.addCollider(lathe(WINDOW_BAND, 24, FRONT - WINDOW_ARC / 2, WINDOW_ARC));
  for (const side of [-1, 1]) {
    const a = FRONT + (side * WINDOW_ARC) / 2;
    pieces.add(
      C.ochre,
      cylinder(0.06, 6),
      between(
        [Math.sin(a) * 4.44, WINDOW_BOTTOM_Y, Math.cos(a) * 4.44],
        [Math.sin(a) * 4.02, WINDOW_TOP_Y, Math.cos(a) * 4.02],
      ),
      'metal',
      { solid: false },
    );
  }
  gores(pieces, TOP_BAND, 0, Math.PI * 2, [C.ochre, C.cream]);
  // Los aros de latón del ventanal y de la cúpula.
  pieces.add(C.brass, torus(4.42, 0.05, SEGMENTS, 5), at([0, WINDOW_BOTTOM_Y, 0]), 'metal', {
    solid: false,
  });
  pieces.add(C.brass, torus(4.0, 0.05, SEGMENTS, 5), at([0, WINDOW_TOP_Y, 0]), 'metal', {
    solid: false,
  });
  pieces.add(
    C.brass,
    torus(DOME_BASE_RADIUS + 0.04, 0.08, SEGMENTS, 6),
    at([0, DOME_BASE_Y + 0.06, 0]),
    'metal',
    { solid: true },
  );
  // La cúpula: un casquete de esfera sobre el anillo del techo.
  const rise = DOME_TOP_Y - DOME_BASE_Y;
  const radius = (DOME_BASE_RADIUS ** 2 + rise ** 2) / (2 * rise);
  const theta = Math.asin(DOME_BASE_RADIUS / radius);
  const dome = prepared(new SphereGeometry(radius, 32, 8, 0, Math.PI * 2, 0, theta));
  dome.translate(0, DOME_TOP_Y - radius, 0);
  glass.push(dome);
  pieces.addCollider(dome);
  for (let k = 0; k < 6; k++) {
    // Las costillas de la cúpula.
    const a = (k / 6) * Math.PI * 2;
    const ribs = 5;
    for (let j = 0; j < ribs; j++) {
      const t0 = (j / ribs) * theta;
      const t1 = ((j + 1) / ribs) * theta;
      const p = (t: number): [number, number, number] => [
        Math.sin(a) * Math.sin(t) * radius,
        DOME_TOP_Y - radius + Math.cos(t) * radius + 0.01,
        Math.cos(a) * Math.sin(t) * radius,
      ];
      pieces.add(C.brass, cylinder(0.035, 5), between(p(t0), p(t1)), 'metal', { solid: false });
    }
  }
}

function belly(pieces: PieceSet): void {
  pieces.add(
    C.creamDark,
    discWithHole(BELLY_FLAT_RADIUS, BELLY_Y, WELL, 'down'),
    at([0, 0, 0]),
    'stone',
    { solid: true },
  );
  const curve: [number, number][] = [];
  for (let k = 0; k <= 5; k++) {
    const r = BELLY_FLAT_RADIUS + ((RIM_RADIUS - BELLY_FLAT_RADIUS) * k) / 5;
    curve.push([r, bellyY(r)]);
  }
  curve[curve.length - 1] = [RIM_RADIUS - 0.02, RIM_BOTTOM];
  gores(pieces, curve, 0, Math.PI * 2, [C.creamDark, C.fabric]);
  // El pozo de la escotilla: sus cuatro paredes, del suelo a la panza.
  const depth = FLOOR_Y - BELLY_Y;
  const midY = (FLOOR_Y + BELLY_Y) / 2;
  const width = WELL.maxX - WELL.minX;
  const length = WELL.maxZ - WELL.minZ;
  for (const z of [WELL.minZ, WELL.maxZ]) {
    pieces.add(C.dark, box(), at([0, midY, z], undefined, [width, depth, 0.05]), 'stone', {
      solid: true,
    });
  }
  for (const x of [WELL.minX, WELL.maxX]) {
    pieces.add(
      C.dark,
      box(),
      at([x, midY, (WELL.minZ + WELL.maxZ) / 2], undefined, [0.05, depth, length]),
      'stone',
      { solid: true },
    );
  }
  // Un marco de latón alrededor de la boca, por debajo.
  pieces.add(
    C.brass,
    box(),
    at([0, BELLY_Y - 0.02, WELL.minZ], undefined, [width + 0.2, 0.05, 0.1]),
    'metal',
  );
  pieces.add(
    C.brass,
    box(),
    at([0, BELLY_Y - 0.02, WELL.maxZ], undefined, [width + 0.2, 0.05, 0.1]),
    'metal',
  );
}

/** Las cuatro patas, en diagonal, con rodilla de latón y zapata. */
function legs(pieces: PieceSet): void {
  const ground = -CLEARANCE;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const hip: [number, number, number] = [s * 2.3, BELLY_Y, c * 2.3];
    const knee: [number, number, number] = [s * 2.95, BELLY_Y - 0.9, c * 2.95];
    const foot: [number, number, number] = [s * 3.05, ground + 0.12, c * 3.05];
    pieces.add(C.dark, cylinder(0.11, 8), between(hip, knee), 'metal', { solid: true });
    pieces.add(C.dark, cylinder(0.09, 8), between(knee, foot), 'metal', { solid: true });
    pieces.add(C.brass, ball(0.16, 1), at(knee), 'metal', { solid: false });
    pieces.add(
      C.dark,
      cylinder(0.38, 10),
      at([foot[0], ground + 0.05, foot[2]], [Math.PI / 2, 0, 0], [1, 1, 0.1]),
      'metal',
      {
        solid: true,
      },
    );
  }
}

/** Dónde se ve la boca de una tobera (m): las del borde, un poco por fuera del casco. */
export function nozzleExit(thruster: Thruster): [number, number, number] {
  const p = thruster.position;
  const out = thruster.direction.clone().negate();
  if (thruster.group === 'rcs') {
    const r = Math.hypot(p.x, p.z);
    const k = (RIM_RADIUS + 0.22) / r;
    return [p.x * k + out.x * 0.12, p.y + out.y * 0.12, p.z * k + out.z * 0.12];
  }
  if (thruster.group === 'main') return [p.x, p.y, RIM_RADIUS + 0.05];
  if (thruster.group === 'retro') return [p.x, p.y, -(RIM_RADIUS - 0.05)];
  return [p.x, BELLY_Y - 0.12, p.z];
}

function nozzles(pieces: PieceSet): void {
  // Los cuatro grupos de maniobra: una caja de latón en el borde con sus cuatro toberas.
  for (const t of THRUSTERS) {
    const exit = nozzleExit(t);
    const back = t.direction.clone().multiplyScalar(t.group === 'rcs' ? 0.16 : 0.45);
    const inner: [number, number, number] = [exit[0] + back.x, exit[1] + back.y, exit[2] + back.z];
    const size =
      t.group === 'rcs' ? 0.07 : t.group === 'main' ? 0.32 : t.group === 'retro' ? 0.14 : 0.2;
    pieces.add(C.dark, cone(size, size * 0.55, 8), between(exit, inner), 'metal', { solid: false });
    if (t.group === 'rcs' && t.id.endsWith('_arriba')) {
      const p = t.position;
      const r = Math.hypot(p.x, p.z);
      const k = (RIM_RADIUS + 0.12) / r;
      pieces.add(
        C.brass,
        box(),
        at([p.x * k, p.y, p.z * k], undefined, [0.32, 0.3, 0.32]),
        'metal',
        {
          solid: true,
        },
      );
    }
  }
  // Las carcasas de los motores de popa.
  for (const x of [-1.35, 1.35]) {
    pieces.add(
      C.ochre,
      cylinder(0.42, 10),
      between([x, -0.35, 3.6], [x, -0.35, RIM_RADIUS - 0.2]),
      'stone',
      {
        solid: true,
      },
    );
    pieces.add(
      C.brass,
      torus(0.42, 0.05, 12, 5),
      at([x, -0.35, RIM_RADIUS - 0.2], [Math.PI / 2, 0, 0]),
      'metal',
      {
        solid: false,
      },
    );
  }
}

/** El mástil de popa con su farol, los faros de proa y los ojos de buey. */
function lights(pieces: PieceSet): void {
  const mastFoot: [number, number, number] = [0, 1.2, 3.05];
  const mastTop: [number, number, number] = [0, 2.55, 3.05];
  pieces.add(C.woodDark, cylinder(0.06, 6), between(mastFoot, mastTop), 'stone', { solid: false });
  pieces.add(C.brass, cone(0.2, 0.05, 8), at([0, 2.82, 3.05], undefined, [1, 1, 0.18]), 'metal', {
    solid: false,
  });
  pieces.add(C.glowWarm, ball(0.15, 1), at([0, 2.68, 3.05]), 'light', { glow: 1.6, vary: 0 });
  for (const x of [-0.9, 0.9]) {
    pieces.add(C.glowWarm, ball(0.11, 1), at([x, -0.45, -RIM_RADIUS - 0.02]), 'light', {
      glow: 1.5,
      vary: 0,
    });
  }
  // Ojos de buey en la popa (la parte de tela de la banda del ventanal).
  for (let k = 0; k < 7; k++) {
    const a = FRONT + WINDOW_ARC / 2 + ((k + 0.5) / 7) * (Math.PI * 2 - WINDOW_ARC);
    const r = 4.33;
    const y = 0.32;
    // El toro de kit.ts tiene el eje en Y: se tumba hacia Z y se gira hacia fuera.
    pieces.add(
      C.brass,
      torus(0.2, 0.04, 12, 4),
      at([Math.sin(a) * r, y, Math.cos(a) * r], [Math.PI / 2, a, 0]),
      'metal',
      { solid: false },
    );
    pieces.add(
      C.glow,
      cylinder(0.17, 10),
      at([Math.sin(a) * (r - 0.02), y, Math.cos(a) * (r - 0.02)], [0, a, 0], [1, 1, 0.04]),
      'light',
      {
        glow: 0.8,
        vary: 0,
      },
    );
  }
}

/** Todo lo de fuera: va a `pieces` (con su colisión) y el cristal a `glass`. */
export function buildHull(pieces: PieceSet, glass: BufferGeometry[]): void {
  shell(pieces, glass);
  belly(pieces);
  legs(pieces);
  nozzles(pieces);
  lights(pieces);
}
