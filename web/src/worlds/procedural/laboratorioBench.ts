// El Banco del Contrapeso rehecho para contar a los dos (hito E4 de docs/plan-finales.md §6; 🟡 el aspecto): una mesa
// partida en dos mitades que no acaban de casar. La de ella, viva y ordenada: el Contrapeso en su peana, con su
// burbuja, la lámpara encendida, papeles en pilas por tamaños, un lápiz afilado, una taza en pie, su signo (un rombo
// con un punto) grabado en el canto y el prototipo en el suelo. La de él, vacía y con polvo: el tablero de sus
// herramientas con las siluetas de lo que falta, el hueco de otras en el polvo, la banqueta recogida, el cerco seco de
// una taza y su signo de antes de la Cámara (un triángulo con la punta hacia abajo, 🟡 D13/D19) rayado una y otra vez
// en la madera. En la rendija, entre las dos, una cucharilla (lab.mesa_partida).
import { ball, box, cone, cylinder, Frame, torus, type Triple } from './kit';
import { bubbleMesh } from './laboratorioBubble';
import { FLOOR, LabBuilder, PALETTE as P } from './laboratorioKit';

/** Del centro del Contrapeso (contrapeso.ts) a la base de su pie. */
const COUNTERWEIGHT_BASE = 0.425;
/** Dónde espera el Contrapeso, en la mitad de ella (m, marco del Banco). */
const COUNTERWEIGHT_AT = { x: -1.0, y: -0.4 } as const;
/** Radio de la burbuja visible (m). */
const BUBBLE_RADIUS = 0.78;
const TOP = FLOOR + 0.82;
const DEPTH = 1.1;
const Y = -0.4;
/** Dónde cruza la rendija la cucharilla (y, marco del Banco): cerca del canto de delante, a la vista desde la Sala. */
const SPOON_Y = -0.05;
const TAU = Math.PI * 2;

/** Una mitad de la mesa, de `x0` a `x1`: tablero con canto, faldón con cajón, patas con travesaños. */
function halfTable(b: LabBuilder, f: Frame, x0: number, x1: number, wood: string, drop = 0): void {
  const s = b.inside;
  const width = x1 - x0;
  const x = (x0 + x1) / 2;
  const top = TOP - drop;
  b.solid(s, wood, box(), f.at([x, Y, top - 0.04], undefined, [width, DEPTH, 0.08]));
  b.view(
    s,
    P.woodDark,
    box(),
    f.at([x, Y + DEPTH / 2 - 0.01, top - 0.045], undefined, [width, 0.025, 0.09]),
  );
  for (const dy of [-1, 1]) {
    b.view(
      s,
      P.woodDark,
      box(),
      f.at([x, Y + dy * (DEPTH / 2 - 0.08), top - 0.13], undefined, [width - 0.2, 0.04, 0.1]),
    );
  }
  // El cajón del frente, con su tirador de latón.
  b.view(s, wood, box(), f.at([x, Y + DEPTH / 2 - 0.06, top - 0.14], undefined, [0.5, 0.03, 0.11]));
  b.inside.add(
    P.brass,
    cylinder(0.018, 10),
    f.at([x, Y + DEPTH / 2 - 0.035, top - 0.14], [Math.PI / 2, 0, 0], [1, 1, 0.04]),
    'metal',
  );
  for (const lx of [x0 + 0.08, x1 - 0.08]) {
    for (const ly of [Y - DEPTH / 2 + 0.08, Y + DEPTH / 2 - 0.08]) {
      b.solid(
        s,
        P.grey,
        box(),
        f.at([lx, ly, FLOOR + (top - 0.08 - FLOOR) / 2], undefined, [
          0.07,
          0.07,
          top - 0.08 - FLOOR,
        ]),
      );
    }
    b.view(s, P.grey, box(), f.at([lx, Y, FLOOR + 0.16], undefined, [0.05, DEPTH - 0.16, 0.05]));
  }
}

/** Un trazo fino de `a` a `c` sobre la mesa (x, y) a la altura `z`. */
function groove(
  b: LabBuilder,
  f: Frame,
  a: [number, number],
  c: [number, number],
  z: number,
  color: string,
): void {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const length = Math.hypot(dx, dy);
  const turn = Math.atan2(dy, dx);
  b.view(
    b.inside,
    color,
    box(),
    f.at([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, z], [0, 0, turn], [length, 0.012, 0.004]),
  );
}

/**
 * Su signo rayado en la madera, el de antes de la Cámara: un triángulo con la punta hacia abajo (hacia quien mira la
 * mesa desde la Sala), repasado una y otra vez sin que las pasadas acaben de coincidir.
 */
function hisSign(b: LabBuilder, f: Frame, at: [number, number], size: number, z: number): void {
  const [x, y] = at;
  const w = size / 2;
  const h = size * 0.85;
  // [dx, dy, giro, color]: cada pasada un poco movida; la última, más clara (la madera recién rayada).
  const passes: readonly [number, number, number, string][] = [
    [0, 0, 0, P.woodDark],
    [0.007, -0.005, 0.06, P.woodDark],
    [-0.006, 0.004, -0.05, P.woodDark],
    [0.002, 0.008, 0.02, P.greyDark],
  ];
  for (const [dx, dy, turn, color] of passes) {
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    const corner = (u: number, v: number): [number, number] => [
      x + dx + u * c - v * s,
      y + dy + u * s + v * c,
    ];
    const left = corner(-w, -h / 2);
    const right = corner(w, -h / 2);
    const tip = corner(0, h / 2);
    groove(b, f, left, right, z, color);
    groove(b, f, left, tip, z, color);
    groove(b, f, right, tip, z, color);
  }
}

/** Una raya grabada en el canto de delante de la mesa (cara vertical que mira a +Y), de `a` a `c` en (x, z). */
function carve(
  b: LabBuilder,
  f: Frame,
  a: [number, number],
  c: [number, number],
  y: number,
  color: string,
): void {
  const dx = c[0] - a[0];
  const dz = c[1] - a[1];
  b.view(
    b.inside,
    color,
    box(),
    f.at(
      [(a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2],
      [0, -Math.atan2(dz, dx), 0],
      [Math.hypot(dx, dz), 0.004, 0.006],
    ),
  );
}

/** Su signo grabado en el canto de su mitad: un rombo con un punto dentro. */
function herSign(b: LabBuilder, f: Frame, x: number, z: number): void {
  const y = Y + DEPTH / 2 + 0.004;
  const w = 0.026;
  const h = 0.034;
  const corners: [number, number][] = [
    [x, z + h],
    [x + w, z],
    [x, z - h],
    [x - w, z],
  ];
  corners.forEach((p, k) => {
    carve(b, f, p, corners[(k + 1) % corners.length] ?? p, y, P.woodPale);
  });
  b.view(
    b.inside,
    P.woodPale,
    cylinder(0.0065, 8),
    f.at([x, y, z], [Math.PI / 2, 0, 0], [1, 1, 0.005]),
  );
}

/** Los papeles de ella, en pilas por tamaños y bien cuadrados, con el lápiz afilado al lado. */
function herPapers(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  // [x, y, ancho, fondo, hojas]: de la pila grande a la pequeña.
  const piles: readonly [number, number, number, number, number][] = [
    [-0.23, -0.5, 0.25, 0.33, 7],
    [-0.23, -0.12, 0.18, 0.24, 5],
    [-0.23, 0.07, 0.12, 0.15, 4],
  ];
  for (const [x, y, w, d, sheets] of piles) {
    for (let k = 0; k < sheets; k++) {
      // Apenas movidas: alguien las cuadra cada vez que las deja.
      const nudge = ((k * 37) % 5) * 0.0012 - 0.0024;
      b.view(
        s,
        k % 3 === 2 ? P.white : P.paper,
        box(),
        f.at([x + nudge, y - nudge, TOP + 0.004 + k * 0.004], [0, 0, nudge * 2], [w, d, 0.004]),
      );
    }
  }
  // El lápiz: cuerpo de seis caras, la madera del corte y la mina, paralelo a las pilas.
  const px = -0.07;
  const py = -0.38;
  const lie = (dy: number, scale: Triple): ReturnType<Frame['at']> =>
    f.at([px, py + dy, TOP + 0.005], [-Math.PI / 2, 0, 0], scale);
  b.view(s, P.seal, cylinder(0.005, 6), lie(0, [1, 1, 0.15]));
  b.view(s, P.woodPale, cone(0.005, 0.0016, 6), lie(0.088, [1, 1, 0.026]));
  b.view(s, P.greyDark, cone(0.0016, 0, 6), lie(0.105, [1, 1, 0.008]));
  b.view(s, P.brass, cylinder(0.0052, 6), lie(-0.079, [1, 1, 0.008]));
}

/**
 * La cucharilla, cruzada en la rendija y apoyada en los dos cantos (el de él, un dedo más bajo): se alcanzaba desde
 * los dos lados. La pala cae del lado de él.
 */
function spoon(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  const yaw = -0.95;
  // Se apoya en dos cantos a 4 cm (en x): a lo largo de la cucharilla, a 4 cm ÷ cos(yaw).
  const tilt = Math.atan2(0.012, 0.04 / Math.cos(yaw));
  const g = new Frame(f.at([0, SPOON_Y, TOP - 0.002], [0, tilt, yaw]));
  s.add(P.white, box(), g.at([-0.03, 0, 0], undefined, [0.075, 0.008, 0.0025]), 'metal');
  s.add(P.white, box(), g.at([-0.071, 0, 0], [0, 0, 0], [0.02, 0.013, 0.0025]), 'metal');
  s.add(P.white, box(), g.at([0.017, 0, -0.0005], undefined, [0.024, 0.005, 0.0025]), 'metal');
  s.add(P.white, ball(1, 1), g.at([0.046, 0, -0.001], undefined, [0.022, 0.015, 0.0045]), 'metal');
}

/** El hueco que dejaron en el polvo sus herramientas: la madera limpia con la forma de lo que se llevó. */
function dustHollows(b: LabBuilder, f: Frame, z: number): void {
  // [x, y, ancho, fondo, giro]: el mazo (mango y cabeza), una regla larga, una caja y unas tenazas.
  const hollows: readonly [number, number, number, number, number][] = [
    [0.42, -0.38, 0.028, 0.26, 0.35],
    [0.37, -0.25, 0.11, 0.04, 0.35],
    [1.72, -0.42, 0.032, 0.5, -0.06],
    [0.95, -0.72, 0.2, 0.13, 0.1],
    [1.42, -0.78, 0.016, 0.19, 0.3],
    [1.48, -0.78, 0.016, 0.19, -0.3],
  ];
  for (const [x, y, w, d, turn] of hollows) {
    b.view(b.inside, P.woodPale, box(), f.at([x, y, z], [0, 0, turn], [w, d, 0.002]));
  }
}

/** La mitad de ella: el Contrapeso en su peana, con la lámpara, los papeles y una taza en pie. */
function herSide(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  const { x, y } = COUNTERWEIGHT_AT;
  b.view(s, P.board, cylinder(0.3, 32), f.at([x, y, TOP + 0.01], undefined, [1, 1, 0.02]));
  s.add(P.brass, torus(0.3, 0.014, 40, 6), f.at([x, y, TOP + 0.022], [Math.PI / 2, 0, 0]), 'metal');
  for (const dx of [-0.55, 0.55]) {
    b.view(s, P.grey, box(), f.at([x + dx, y, TOP + 0.17], undefined, [0.07, 0.42, 0.34]));
    s.add(P.brass, box(), f.at([x + dx, y, TOP + 0.35], undefined, [0.09, 0.44, 0.03]), 'metal');
  }
  // La lámpara de latón, encendida.
  const lamp: Triple = [-1.8, -0.78, TOP];
  s.add(
    P.brass,
    cylinder(0.09, 20),
    f.at([lamp[0], lamp[1], TOP + 0.02], undefined, [1, 1, 0.04]),
    'metal',
  );
  s.add(
    P.brass,
    cylinder(0.015, 8),
    f.at([lamp[0], lamp[1], TOP + 0.24], undefined, [1, 1, 0.44]),
    'metal',
  );
  s.add(
    P.brass,
    cone(0.17, 0.05, 20),
    f.at([lamp[0], lamp[1] + 0.06, TOP + 0.44], [0.35, 0, 0], [1, 1, 0.16]),
    'metal',
  );
  b.lamp(s, ball(0.05, 2), f.at([lamp[0], lamp[1] + 0.08, TOP + 0.4]));
  herPapers(b, f);
  herSign(b, f, -0.3, TOP - 0.045);
  // El cuaderno abierto, la taza en pie y unas piezas de latón en fila, delante de la peana.
  for (const side of [-1, 1]) {
    b.view(
      s,
      P.paper,
      box(),
      f.at(
        [-1.6 + side * 0.11, -0.05, TOP + 0.012 + 0.01 * (side + 1)],
        [0, side * 0.08, 0.15],
        [0.22, 0.3, 0.012],
      ),
    );
  }
  b.view(s, P.white, cylinder(0.045, 16), f.at([-0.25, -0.78, TOP + 0.05], undefined, [1, 1, 0.1]));
  b.view(s, P.white, torus(0.03, 0.008, 12, 4), f.at([-0.19, -0.78, TOP + 0.05], [0, 0, 0]));
  for (let k = 0; k < 4; k++) {
    s.add(
      P.brass,
      torus(0.04 + 0.01 * k, 0.01, 16, 4),
      f.at([-1.35 + k * 0.14, 0.04, TOP + 0.01], [Math.PI / 2, 0, 0]),
      'metal',
    );
  }
  // El prototipo del motor, tumbado en el suelo bajo su mitad, con su rollo de cable.
  b.view(
    s,
    P.grey,
    cylinder(0.26, 24),
    f.at([-1.2, -0.55, FLOOR + 0.26], [0, Math.PI / 2, 0], [1, 1, 0.8]),
  );
  s.add(
    P.brass,
    cylinder(0.17, 20),
    f.at([-1.2, -0.55, FLOOR + 0.26], [0, Math.PI / 2, 0], [1, 1, 0.92]),
    'metal',
  );
  b.view(
    s,
    P.greyDark,
    torus(0.3, 0.04, 20, 6),
    f.at([-0.3, 0.6, FLOOR + 0.04], [Math.PI / 2, 0, 0]),
  );
  b.view(
    s,
    P.greyDark,
    torus(0.22, 0.04, 20, 6),
    f.at([-0.2, 0.68, FLOOR + 0.11], [Math.PI / 2, 0, 0.3]),
  );
}

/** El tablero de sus herramientas: solo quedan las siluetas, más claras, de lo que colgaba. */
function toolBoard(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  const y = -1.05;
  const z = FLOOR + 1.45;
  for (const x of [0.2, 1.9])
    b.solid(s, P.greyDark, box(), f.at([x, y, FLOOR + 0.95], undefined, [0.07, 0.07, 1.9]));
  b.view(s, '#3B4A44', box(), f.at([1.05, y, z], undefined, [1.7, 0.04, 0.9]));
  b.view(s, P.woodDark, box(), f.at([1.05, y + 0.005, z + 0.47], undefined, [1.74, 0.05, 0.04]));
  const face = y + 0.022;
  // [x, z, ancho, alto, giro]: martillo, llave, compás, lima, escuadra.
  const shapes: readonly [number, number, number, number, number][] = [
    [0.45, 0.0, 0.035, 0.36, 0],
    [0.45, 0.17, 0.16, 0.055, 0],
    [0.8, -0.02, 0.032, 0.4, 0.1],
    [1.1, 0.0, 0.022, 0.42, 0.13],
    [1.18, 0.0, 0.022, 0.42, -0.13],
    [1.45, 0.0, 0.03, 0.44, 0],
    [1.72, -0.08, 0.025, 0.3, 0],
    [1.65, 0.06, 0.16, 0.025, 0],
  ];
  for (const [x, dz, w, h, turn] of shapes) {
    b.view(s, P.woodPale, box(), f.at([x, face, z + dz], [0, turn, 0], [w, 0.004, h]));
  }
  b.view(s, P.woodPale, torus(0.05, 0.012, 16, 4), f.at([0.8, face, z + 0.2]));
  for (const [x, dz] of [
    [0.45, 0.27],
    [0.8, 0.27],
    [1.14, 0.27],
    [1.45, 0.27],
    [1.69, 0.27],
  ] as const) {
    s.add(
      P.brass,
      cylinder(0.012, 8),
      f.at([x, face + 0.03, z + dz], [Math.PI / 2, 0, 0], [1, 1, 0.06]),
      'metal',
    );
  }
}

/** La mitad de él: vacía, con polvo, su banqueta recogida, el cerco de una taza y su signo rayado. */
function hisSide(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  const top = TOP - 0.012;
  b.view(s, P.dust, box(), f.at([1.05, Y, top + 0.002], undefined, [1.9, DEPTH - 0.1, 0.003]));
  dustHollows(b, f, top + 0.0045);
  hisSign(b, f, [1.05, -0.15], 0.3, top + 0.005);
  b.view(
    s,
    P.woodDark,
    torus(0.045, 0.006, 20, 3),
    f.at([0.55, -0.7, top + 0.005], [Math.PI / 2, 0, 0]),
  );
  toolBoard(b, f);
  // La banqueta, metida bajo la mesa: nadie la ha sacado en mucho tiempo.
  b.view(
    s,
    P.woodPale,
    cylinder(0.19, 24),
    f.at([1.2, -0.2, FLOOR + 0.5], undefined, [1, 1, 0.05]),
  );
  for (let k = 0; k < 3; k++) {
    const a = (TAU * k) / 3;
    b.view(
      s,
      P.grey,
      box(),
      f.at(
        [1.2 + Math.cos(a) * 0.12, -0.2 + Math.sin(a) * 0.12, FLOOR + 0.24],
        [Math.sin(a) * 0.12, -Math.cos(a) * 0.12, 0],
        [0.04, 0.04, 0.5],
      ),
    );
  }
}

/** El Banco: la mesa partida, el Contrapeso con su burbuja y la marca de lectura (`lab.contrapeso`). */
export function buildBench(b: LabBuilder, f: Frame): void {
  b.platform(f, 5.5, 4.0);
  // Dos mitades que no casan: la de él, un dedo más baja y de otra madera, con una rendija en medio.
  halfTable(b, f, -2.05, -0.02, P.wood);
  halfTable(b, f, 0.02, 2.05, P.woodPale, 0.012);
  herSide(b, f);
  hisSide(b, f);
  spoon(b, f);
  b.lantern(b.inside, f, -2.45, 0.9);
  const centre: Triple = [COUNTERWEIGHT_AT.x, COUNTERWEIGHT_AT.y, TOP + 0.02 + COUNTERWEIGHT_BASE];
  b.extras.push(bubbleMesh(f.point(centre), BUBBLE_RADIUS));
  // La marca es el propio Contrapeso: su centro, mirando hacia la Sala (por donde se llega).
  b.mark('INT_contrapeso', f, centre, { clue_id: 'lab.contrapeso', kind: 'objeto' });
  // La mesa partida es la rendija entre sus dos mitades.
  b.mark('INT_mesa_partida', f, [0, Y, TOP + 0.3], { clue_id: 'lab.mesa_partida', kind: 'objeto' });
}
