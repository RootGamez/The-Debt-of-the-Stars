// El Motor de Hogar (Fase 11G; ✅ Anthony 2026-11-03: un sitio llamativo con el motor que empezaban a desarrollar, y la
// Directora allí): sobre un cabo al este, frente al mar, la Puerta Mayor a medio hacer —un anillo de latón de catorce
// metros, de pie, con las rayas de reloj del símbolo de las Puertas y un trozo que aún cuelga de la grúa— y, a su lado,
// el generador de la sala de pruebas, con su volante girando. Se ve desde la plaza del Instituto. La Directora mira la
// Luna por encima de la colina, desde su tarima, con el informe en la mesa. Marco del lugar: +Y hacia el Instituto.
import { Matrix4, Quaternion, Vector3 } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  direction,
  headingTowards,
  pieceMatrix,
  torus,
  torusArc,
  type Frame,
  type Triple,
} from './kit';
import { HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';
import { SITES } from './hogarShape';

const DEG = Math.PI / 180;

/** La Puerta Mayor: su centro (en el marco del lugar), su radio y el grosor del aro. */
export const GREAT_RING = { center: [0, -5, 8.4] as Triple, radius: 7, tube: 0.6 };
/** El trozo que falta, en grados del aro (desde +X hacia arriba). */
const GAP: readonly [number, number] = [35, 75];

/** El rumbo que mira del Motor al Instituto. */
export function motorHeading(): number {
  const { motor, instituto } = SITES;
  return headingTowards(motor.lat, motor.lon, direction(instituto.lat, instituto.lon));
}

function ring(b: HogarBuilder, f: Frame): void {
  const { center, radius, tube } = GREAT_RING;
  const from = GAP[1] * DEG;
  const to = (GAP[0] + 360) * DEG;
  b.pieces.add(P.brass, torusArc(radius, tube, from, to, 56, 8), f.at(center), 'metal', {
    solid: true,
  });
  // Las rayas de reloj, en la cara que mira al Instituto.
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    const deg = (a / DEG + 360) % 360;
    if (deg > GAP[0] - 2 && deg < GAP[1] + 2) continue;
    const long = k % 3 === 0;
    b.pieces.add(
      P.brassDark,
      box(),
      f.at(
        [
          center[0] + Math.cos(a) * radius,
          center[1] + tube * 0.9,
          center[2] + Math.sin(a) * radius,
        ],
        [0, -a, 0],
        [long ? 0.9 : 0.5, 0.08, 0.12],
      ),
      'metal',
      { solid: false },
    );
  }
  // El trozo que falta, colgado de la grúa sobre el hueco.
  const mid = ((GAP[0] + GAP[1]) / 2) * DEG;
  const hang: Triple = [
    center[0] + Math.cos(mid) * (radius + 1.6),
    center[1],
    center[2] + Math.sin(mid) * (radius + 1.6),
  ];
  b.pieces.add(
    P.brass,
    torusArc(radius, tube, GAP[0] * DEG + 0.04, GAP[1] * DEG - 0.04, 10, 8),
    f.at(
      [hang[0] - Math.cos(mid) * radius, hang[1], hang[2] - Math.sin(mid) * radius],
      [0, 0.06, 0],
    ),
    'metal',
    { solid: false },
  );
  b.pieces.add(
    P.iron,
    cylinder(0.03, 4),
    f.at([hang[0], hang[1], hang[2] + 2.2], undefined, [1, 1, 3.4]),
    'metal',
    { solid: false },
  );
  // La cuna de piedra y los calzos.
  for (const x of [-3.6, 3.6]) {
    b.pieces.add(
      P.sandstone,
      box(),
      f.at([x, center[1], 0.9], [0, 0, 0], [2.4, 2.6, 1.8]),
      'stone',
      { solid: true },
    );
    b.pieces.add(
      P.brassDark,
      box(),
      f.at([x * 0.82, center[1], 1.95], [0, x > 0 ? 0.45 : -0.45, 0], [1.4, 1.6, 0.3]),
      'metal',
      { solid: false },
    );
  }
  // El hueco de dentro brilla un poco: las pruebas dejaron su luz pegada al latón.
  b.pieces.add(
    P.glow,
    torusArc(radius - tube - 0.05, 0.05, from, to, 56, 3),
    f.at(center),
    'light',
    { glow: 1.2, vary: 0 },
  );
}

/** Dos torres de andamio a los lados, con plataformas, escaleras y la grúa. */
function scaffolds(b: HogarBuilder, f: Frame): void {
  const { center } = GREAT_RING;
  for (const side of [-1, 1]) {
    const x = side * 9.6;
    const y = center[1];
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      b.pieces.add(
        P.wood,
        box(),
        f.at([x + dx * 1.1, y + dy * 1.1, 7.5], undefined, [0.18, 0.18, 15]),
        'stone',
        { solid: true },
      );
    }
    for (const z of [4, 8, 12]) {
      b.pieces.add(P.woodDark, box(), f.at([x, y, z], undefined, [2.6, 2.6, 0.12]), 'stone', {
        solid: false,
      });
      b.pieces.add(
        P.wood,
        box(),
        f.at([x, y + 1.1, z + 0.5], undefined, [2.4, 0.08, 0.08]),
        'stone',
        { solid: false },
      );
    }
    // Riostras en aspa.
    for (let k = 0; k < 3; k++) {
      b.pieces.add(
        P.wood,
        box(),
        f.at([x, y - 1.1, 2 + k * 4.5], [0.7, 0, 0], [0.08, 0.08, 5]),
        'stone',
        { solid: false },
      );
    }
    // La escalera de mano.
    b.pieces.add(
      P.woodDark,
      box(),
      f.at([x - side * 1.3, y, 6], [0, 0, 0], [0.08, 0.6, 12]),
      'stone',
      { solid: false },
    );
  }
  // La grúa: un brazo desde la torre de la derecha hasta encima del hueco.
  const mid = ((GAP[0] + GAP[1]) / 2) * DEG;
  const top: Triple = [
    center[0] + Math.cos(mid) * (GREAT_RING.radius + 1.6),
    center[1],
    center[2] + Math.sin(mid) * (GREAT_RING.radius + 1.6) + 4,
  ];
  b.pieces.add(P.iron, box(), f.at([9.6, center[1], 16], undefined, [0.35, 0.35, 2]), 'metal', {
    solid: false,
  });
  const arm = new Vector3(top[0] - 9.6, 0, top[2] - 16.8);
  b.pieces.add(
    P.iron,
    box(),
    f.at(
      [(top[0] + 9.6) / 2, center[1], (top[2] + 16.8) / 2],
      [0, Math.atan2(-arm.z, arm.x), 0],
      [arm.length(), 0.25, 0.25],
    ),
    'metal',
    { solid: false },
  );
}

/** El generador de la sala de pruebas: un tambor tumbado con bobinas, ventanas de luz y su volante girando. */
function generator(b: HogarBuilder, f: Frame): void {
  const g: Triple = [-8, -13, 0];
  b.pieces.add(P.sandstone, box(), f.at([g[0], g[1], 0.5], undefined, [6, 3.6, 1]), 'stone', {
    solid: true,
  });
  b.pieces.add(
    P.iron,
    cylinder(1.9, 16),
    f.at([g[0], g[1], 2.9], [0, Math.PI / 2, 0], [1, 1, 4.6]),
    'metal',
    { solid: true },
  );
  for (let k = 0; k < 4; k++) {
    b.pieces.add(
      P.brass,
      torus(1.98, 0.14, 24, 5),
      f.at([g[0] - 1.6 + k * 1.05, g[1], 2.9], [0, 0, Math.PI / 2]),
      'metal',
      { solid: false },
    );
  }
  // Ventanas por donde se ve el núcleo, verde vivo.
  for (let k = 0; k < 3; k++) {
    b.pieces.add(
      P.glow,
      box(),
      f.at([g[0] - 1.05 + k * 1.05, g[1] + 1.7, 3.4], [0.5, 0, 0], [0.5, 0.06, 0.35]),
      'light',
      { glow: 1.7, vary: 0 },
    );
  }
  // Aletas y tubos.
  for (let k = 0; k < 6; k++) {
    b.pieces.add(
      P.iron,
      box(),
      f.at([g[0] - 1.8 + k * 0.72, g[1], 4.9], undefined, [0.08, 2.2, 0.5]),
      'metal',
      { solid: false },
    );
  }
  for (const side of [-1, 1]) {
    b.pieces.add(
      P.ironRust,
      cylinder(0.18, 8),
      f.at([g[0] + 1.2, g[1] + side * 1.6, 1.6], [side * 0.3, 0, 0], [1, 1, 2.6]),
      'metal',
      { solid: false },
    );
  }
  // El volante, en la punta del eje (ANIM_: gira sobre su Y, aquí el eje del tambor).
  const axis = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
  const wheel = b.spinner('ANIM_Motor_Volante', f, [g[0] + 3.1, g[1], 2.9], axis, 0.9);
  wheel.add(P.brassDark, torus(1.5, 0.16, 28, 6), pieceMatrix(), 'metal', { solid: false });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    wheel.add(P.iron, box(), pieceMatrix([0, 0, 0], [0, a, 0], [2.9, 0.12, 0.14]), 'metal', {
      solid: false,
    });
  }
  wheel.add(
    P.brass,
    cylinder(0.22, 10),
    pieceMatrix([0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 0.5]),
    'metal',
    { solid: false },
  );
  // Los cables al aro, combados.
  for (const side of [-0.6, 0.6]) {
    const from = new Vector3(g[0] + 1.5, g[1] + 1.6, 3.2 + side);
    const to = new Vector3(-3.6, GREAT_RING.center[1] - 1.3, 1.9 + side * 0.5);
    let prev = from;
    for (let k = 1; k <= 5; k++) {
      const t = k / 5;
      const p = from.clone().lerp(to, t);
      p.z -= Math.sin(t * Math.PI) * 1.4;
      const along = p.clone().sub(prev);
      const mid = prev.clone().add(p).multiplyScalar(0.5);
      b.pieces.add(
        P.rust,
        cylinder(1, 5),
        f.base.clone().multiply(cableMatrix(mid, along, 0.07)),
        'stone',
        { solid: false },
      );
      prev = p;
    }
  }
}

/** Matriz de un cable recto: centro, dirección y grosor. */
function cableMatrix(mid: Vector3, along: Vector3, radius: number): Matrix4 {
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), along.clone().normalize());
  return new Matrix4().compose(mid, q, new Vector3(radius, radius, along.length()));
}

/** La tarima de la Directora, mirando la Luna por encima de la colina, con su mesa y el informe. */
function directora(b: HogarBuilder, f: Frame): void {
  b.pieces.add(P.wood, cylinder(3, 16), f.at([1.5, 9, 0.015], undefined, [1, 1, 0.03]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    if (Math.cos(a) < -0.6) continue; // la entrada, desde el aro
    b.pieces.add(
      P.woodDark,
      cylinder(0.05, 4),
      f.at([1.5 + Math.sin(a) * 3, 9 + Math.cos(a) * 3, 0.5], undefined, [1, 1, 1]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.woodDark,
    torusArc(3, 0.04, -0.6 * Math.PI, 0.6 * Math.PI, 18, 3),
    f.at([1.5, 9, 1], [Math.PI / 2, 0, Math.PI / 2]),
    'stone',
    { solid: false },
  );
  // La mesa de dibujo inclinada, con el informe y una lámpara.
  const desk: Triple = [3.4, 7.6, 0];
  b.pieces.add(
    P.woodDark,
    box(),
    f.at([desk[0], desk[1], 0.45], undefined, [1.2, 0.8, 0.9]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.wood,
    box(),
    f.at([desk[0], desk[1], 0.98], [0.3, 0, 0], [1.3, 0.9, 0.05]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.cream,
    box(),
    f.at([desk[0] - 0.15, desk[1], 1.03], [0.3, 0, 0.1], [0.4, 0.55, 0.01]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.cream,
    box(),
    f.at([desk[0] + 0.3, desk[1] + 0.05, 1.03], [0.3, 0, -0.2], [0.4, 0.55, 0.01]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.glowWarm, ball(0.1, 1), f.at([desk[0] + 0.55, desk[1] - 0.3, 1.4]), 'light', {
    glow: 1.6,
    vary: 0,
  });
  b.source('instituto.informe_deuda', 'texto', f, [desk[0], desk[1], 1.05]);
  b.ool({ id: 'directora', age: 0.7, outfit: 'directora', seed: 41 }, f, [1.2, 10, 0], 0);
  b.source('instituto.directora', 'charla', f, [1.2, 10, 1.2]);
  // El calendario de la prueba: cuarenta rayas, las primeras tachadas.
  const board: Triple = [-2.8, 8.4, 0];
  b.pieces.add(
    P.woodDark,
    cylinder(0.06, 5),
    f.at([board[0] - 0.7, board[1], 0.9], undefined, [1, 1, 1.8]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.woodDark,
    cylinder(0.06, 5),
    f.at([board[0] + 0.7, board[1], 0.9], undefined, [1, 1, 1.8]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.slate,
    box(),
    f.at([board[0], board[1], 1.45], undefined, [1.6, 0.05, 0.8]),
    'stone',
    { solid: false },
  );
  for (let k = 0; k < 40; k++) {
    const row = Math.floor(k / 10);
    b.pieces.add(
      P.cream,
      box(),
      f.at(
        [board[0] - 0.65 + (k % 10) * 0.145, board[1] + 0.03, 1.72 - row * 0.18],
        undefined,
        [0.02, 0.01, 0.12],
      ),
      'stone',
      { solid: false },
    );
  }
}

/** La caseta de mando y lo que hay alrededor: farolas, cajas y la valla del aro. */
function surroundings(b: HogarBuilder, f: Frame): void {
  b.house(f, [-10, 4, 0], { radius: 2.2, height: 2.6, fabrics: [P.ochre, P.cream], door: 90 });
  for (const [x, y] of [
    [-5, 6],
    [6, 6],
    [-12, -6],
    [12, -9],
  ] as const) {
    b.bulbLamp(f, [x, y, 0], 2.8);
  }
  for (let k = 0; k < 9; k++) {
    const x = -6 + k * 1.5;
    b.pieces.add(
      P.woodDark,
      cylinder(0.05, 4),
      f.at([x, GREAT_RING.center[1] + 2.6, 0.5], undefined, [1, 1, 1]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.rust,
    box(),
    f.at([0, GREAT_RING.center[1] + 2.6, 0.85], undefined, [12, 0.04, 0.06]),
    'stone',
    { solid: false },
  );
  for (const [x, y, s] of [
    [7, -12, 0.9],
    [8.2, -11.2, 0.7],
    [-2, -14, 0.8],
  ] as const) {
    b.pieces.add(P.wood, box(), f.at([x, y, s / 2], [0, 0, s], [s, s, s]), 'stone', {
      solid: true,
    });
  }
  b.pieces.add(P.rock, cone(1.4, 0.4, 7), f.at([13, 3, 0.7], undefined, [1, 1, 1.4]), 'stone', {
    solid: true,
  });
}

export function buildMotor(b: HogarBuilder): void {
  const f = b.site('motor', motorHeading());
  ring(b, f);
  scaffolds(b, f);
  generator(b, f);
  directora(b, f);
  surroundings(b, f);
}
