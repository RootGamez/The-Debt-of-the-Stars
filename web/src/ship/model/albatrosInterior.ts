// El Albatros II por dentro (Fase 11, decisión D3): una sola sala redonda con suelo de tablas, forro de tela en
// gajos, el asiento del piloto con su tablero frente al ventanal, el atril con el cuaderno del Registro, la mesa del
// mapa de órbitas (con su planetario), la mesa de carga, el reloj doble de pared, estantes, plantas de musgo, una
// hamaca y lámparas de los Ool. En el suelo, hacia popa, la escotilla y la escalerilla (piezas aparte: se mueven).
import { Group, Vector3, type BufferGeometry } from 'three';
import { ball, box, cone, cylinder, torus, type PieceSet } from '../../worlds/procedural/kit';
import { ALBATROS_PALETTE as C, at, between, discWithHole, lathe } from './albatrosParts';
import {
  CARGO_TABLE,
  CARGO_TABLE_HEIGHT,
  DOME_BASE_RADIUS,
  DOME_BASE_Y,
  FLOOR_RADIUS,
  FLOOR_Y,
  LADDER_ANGLE,
  LADDER_HALF_WIDTH,
  LADDER_LENGTH,
  LADDER_TOP,
  LECTERN,
  MAP_TABLE,
  MAP_TABLE_HEIGHT,
  MAP_TABLE_RADIUS,
  SEAT,
  WALL_CLOCK,
  WELL,
  WINDOW_ARC,
  WINDOW_BOTTOM_Y,
  WINDOW_TOP_Y,
} from './albatrosShape';

/** Lo que el juego mueve o usa de dentro. */
export interface InteriorParts {
  /** La trampilla: gira sobre su bisagra (eje X, en el borde de proa del pozo). */
  door: Group;
  /** La escalerilla: gira sobre su cabeza (eje X) y se estira a lo largo de su Z. */
  ladder: Group;
  /** Las agujas del reloj doble (giran en su Z): la del reloj de Umbral y la tuya. */
  clockHands: { umbral: Group; yours: Group };
  /** El centro del planetario, sobre la mesa del mapa. */
  orrery: Group;
  /** Donde se deja la carga, sobre la mesa de carga. */
  cargo: Group;
}

/** Crea un grupo con sus propias mallas a partir de unas piezas (lo pone el ensamblador). */
export type PartFactory = (name: string, fill: (pieces: PieceSet) => void) => Group;

const FRONT = Math.PI;

/** El forro de la sala, de abajo arriba (radio, altura); se dibuja al revés para que mire hacia dentro. */
const LINING_LOW: [number, number][] = [
  [FLOOR_RADIUS, FLOOR_Y],
  [FLOOR_RADIUS, WINDOW_BOTTOM_Y],
];
const LINING_MID: [number, number][] = [
  [FLOOR_RADIUS, WINDOW_BOTTOM_Y],
  [3.72, 0.4],
  [3.55, WINDOW_TOP_Y],
];
const LINING_TOP: [number, number][] = [
  [3.55, WINDOW_TOP_Y],
  [3.15, 1.08],
  [DOME_BASE_RADIUS, DOME_BASE_Y],
];

const inward = (profile: [number, number][]): [number, number][] => [...profile].reverse();

function lining(pieces: PieceSet): void {
  const bands: [[number, number][], number, number][] = [
    [LINING_LOW, 0, Math.PI * 2],
    [LINING_MID, FRONT + WINDOW_ARC / 2, Math.PI * 2 - WINDOW_ARC],
    [LINING_TOP, 0, Math.PI * 2],
  ];
  for (const [profile, from, length] of bands) {
    const count = Math.round((14 * length) / (Math.PI * 2));
    const step = length / count;
    for (let k = 0; k < count; k++) {
      pieces.add(
        k % 2 ? C.fabric : C.fabricLight,
        lathe(inward(profile), 3, from + k * step, step),
        at([0, 0, 0]),
        'stone',
        { solid: true, vary: 0.02 },
      );
    }
  }
  // Repisa y dintel del ventanal (planos que se ven desde arriba y desde abajo).
  const sill: [number, number][] = [
    [4.42, WINDOW_BOTTOM_Y],
    [FLOOR_RADIUS, WINDOW_BOTTOM_Y],
  ];
  const lintel: [number, number][] = [
    [3.55, WINDOW_TOP_Y],
    [4.0, WINDOW_TOP_Y],
  ];
  for (const ring of [sill, lintel]) {
    for (const profile of [ring, inward(ring)]) {
      pieces.add(
        C.wood,
        lathe(profile, 24, FRONT - WINDOW_ARC / 2, WINDOW_ARC),
        at([0, 0, 0]),
        'stone',
        {
          solid: false,
        },
      );
    }
  }
  // Costillas de madera en la pared de atrás.
  for (let k = 0; k < 10; k++) {
    const a = FRONT + WINDOW_ARC / 2 + ((k + 0.5) / 10) * (Math.PI * 2 - WINDOW_ARC);
    const r = FLOOR_RADIUS - 0.04;
    pieces.add(
      C.woodDark,
      cylinder(0.04, 5),
      between(
        [Math.sin(a) * r, FLOOR_Y, Math.cos(a) * r],
        [Math.sin(a) * (r - 0.05), WINDOW_TOP_Y - 0.1, Math.cos(a) * (r - 0.05)],
      ),
      'stone',
      { solid: false },
    );
  }
}

/** Las juntas de las tablas (de babor a estribor): sobre el pozo de la escotilla se cortan, que ahí no hay suelo. */
function plankJoints(pieces: PieceSet): void {
  const joint = (from: number, to: number, z: number): void => {
    if (to - from < 0.05) return;
    pieces.add(
      C.woodDark,
      box(),
      at([(from + to) / 2, FLOOR_Y + 0.004, z], undefined, [to - from, 0.005, 0.025]),
      'stone',
      { solid: false, vary: 0 },
    );
  };
  for (let z = -3.4; z <= 3.4; z += 0.45) {
    const half = Math.sqrt(Math.max(0, FLOOR_RADIUS ** 2 - z * z)) - 0.05;
    if (half < 0.3) continue;
    if (z > WELL.minZ && z < WELL.maxZ) {
      joint(-half, WELL.minX, z);
      joint(WELL.maxX, half, z);
    } else {
      joint(-half, half, z);
    }
  }
}

function floor(pieces: PieceSet): void {
  pieces.add(
    C.wood,
    discWithHole(FLOOR_RADIUS + 0.02, FLOOR_Y, WELL, 'up'),
    at([0, 0, 0]),
    'stone',
    {
      solid: true,
      vary: 0.03,
    },
  );
  plankJoints(pieces);
  // Una alfombra redonda de gajos en el centro.
  for (let k = 0; k < 8; k++) {
    pieces.add(
      k % 2 ? C.green : C.ochre,
      lathe(
        [
          [1.05, FLOOR_Y + 0.012],
          [0.05, FLOOR_Y + 0.012],
        ],
        3,
        (k * Math.PI) / 4,
        Math.PI / 4,
      ),
      at([0, 0, -0.55]),
      'stone',
      { solid: false, vary: 0.02 },
    );
  }
  // Marco de latón alrededor de la boca del pozo.
  const width = WELL.maxX - WELL.minX;
  for (const z of [WELL.minZ, WELL.maxZ]) {
    pieces.add(
      C.brass,
      box(),
      at([0, FLOOR_Y + 0.02, z], undefined, [width + 0.1, 0.04, 0.06]),
      'metal',
      {
        solid: false,
      },
    );
  }
  for (const x of [WELL.minX, WELL.maxX]) {
    pieces.add(
      C.brass,
      box(),
      at([x, FLOOR_Y + 0.02, (WELL.minZ + WELL.maxZ) / 2], undefined, [
        0.06,
        0.04,
        WELL.maxZ - WELL.minZ,
      ]),
      'metal',
      { solid: false },
    );
  }
}

/** El asiento del piloto, el tablero con su reloj doble pequeño y las palancas. */
function cockpit(pieces: PieceSet): void {
  const [x, y, z] = [SEAT.x, SEAT.y, SEAT.z];
  pieces.add(
    C.dark,
    cylinder(0.12, 8),
    at([x, y + 0.25, z], [Math.PI / 2, 0, 0], [1, 1, 0.5]),
    'metal',
  );
  pieces.add(C.green, box(), at([x, y + 0.55, z], undefined, [0.62, 0.14, 0.58]), 'stone');
  pieces.add(C.green, box(), at([x, y + 0.9, z + 0.3], [-0.15, 0, 0], [0.62, 0.6, 0.12]), 'stone');
  for (const side of [-1, 1]) {
    pieces.add(
      C.wood,
      box(),
      at([x + side * 0.35, y + 0.72, z - 0.02], undefined, [0.08, 0.06, 0.5]),
      'stone',
      {
        solid: false,
      },
    );
  }
  // El tablero, curvo como el ventanal, con su reloj doble y luces.
  const consoleProfile: [number, number][] = [
    [3.0, FLOOR_Y + 0.45],
    [3.35, FLOOR_Y + 0.62],
  ];
  pieces.add(C.woodDark, lathe(consoleProfile, 10, FRONT - 0.45, 0.9), at([0, 0, 0]), 'stone', {
    solid: false,
  });
  pieces.add(
    C.woodDark,
    lathe(inward(consoleProfile), 10, FRONT - 0.45, 0.9),
    at([0, 0, 0]),
    'stone',
    {
      solid: false,
    },
  );
  pieces.add(C.wood, box(), at([0, FLOOR_Y + 0.22, -3.15], undefined, [1.5, 0.44, 0.35]), 'stone', {
    solid: true,
  });
  pieces.add(
    C.paper,
    cylinder(0.1, 16),
    at([0, FLOOR_Y + 0.55, -3.2], [-1.15, 0, 0], [1, 1, 0.02]),
    'stone',
    {
      solid: false,
    },
  );
  pieces.add(
    C.brass,
    torus(0.1, 0.02, 16, 4),
    at([0, FLOOR_Y + 0.55, -3.2], [0.42, 0, 0]),
    'metal',
    {
      solid: false,
    },
  );
  for (let k = 0; k < 5; k++) {
    const a = FRONT - 0.35 + k * 0.175;
    if (k === 2) continue;
    pieces.add(
      k % 2 ? C.glow : C.glowWarm,
      ball(0.035, 0),
      at([Math.sin(a) * 3.22, FLOOR_Y + 0.58, Math.cos(a) * 3.22]),
      'light',
      { glow: 1.4, vary: 0 },
    );
  }
  for (const side of [-1, 1]) {
    pieces.add(
      C.dark,
      cylinder(0.02, 5),
      between([side * 0.3, FLOOR_Y + 0.5, -2.75], [side * 0.3, FLOOR_Y + 0.78, -2.8]),
      'metal',
      {
        solid: false,
      },
    );
    pieces.add(C.ochre, ball(0.045, 1), at([side * 0.3, FLOOR_Y + 0.8, -2.8]), 'stone', {
      solid: false,
    });
  }
}

/** El atril con el cuaderno del Registro abierto y una luz para leer. */
function lectern(pieces: PieceSet): void {
  const { x, z } = LECTERN;
  pieces.add(
    C.woodDark,
    cylinder(0.06, 6),
    at([x, FLOOR_Y + 0.42, z], [Math.PI / 2, 0, 0], [1, 1, 0.84]),
    'stone',
  );
  pieces.add(
    C.woodDark,
    cylinder(0.22, 8),
    at([x, FLOOR_Y + 0.02, z], [Math.PI / 2, 0, 0], [1, 1, 0.04]),
    'stone',
  );
  // El tablero inclinado hacia el centro de la sala (mira a +X).
  pieces.add(C.wood, box(), at([x, FLOOR_Y + 0.88, z], [0, 0, 0.45], [0.42, 0.04, 0.55]), 'stone');
  for (const side of [-1, 1]) {
    pieces.add(
      C.paper,
      box(),
      at([x + 0.01, FLOOR_Y + 0.915, z + side * 0.13], [side * 0.08, 0, 0.45], [0.32, 0.02, 0.24]),
      'stone',
      { solid: false, vary: 0 },
    );
  }
  pieces.add(
    C.ochre,
    box(),
    at([x - 0.02, FLOOR_Y + 0.9, z], [0, 0, 0.45], [0.35, 0.025, 0.04]),
    'stone',
    {
      solid: false,
    },
  );
  pieces.add(
    C.dark,
    cylinder(0.012, 4),
    between([x - 0.15, FLOOR_Y + 0.9, z - 0.25], [x + 0.05, FLOOR_Y + 1.35, z - 0.25]),
    'metal',
    {
      solid: false,
    },
  );
  pieces.add(C.glow, ball(0.06, 1), at([x + 0.07, FLOOR_Y + 1.36, z - 0.25]), 'light', {
    glow: 1.5,
    vary: 0,
  });
}

/** La mesa redonda del mapa de órbitas: madera, tapa azul de noche y aros del planetario. */
function mapTable(pieces: PieceSet): void {
  const { x, z } = MAP_TABLE;
  const top = FLOOR_Y + MAP_TABLE_HEIGHT;
  pieces.add(
    C.woodDark,
    cylinder(0.09, 8),
    at([x, (FLOOR_Y + top) / 2, z], [Math.PI / 2, 0, 0], [1, 1, top - FLOOR_Y]),
    'stone',
  );
  pieces.add(
    C.wood,
    cylinder(MAP_TABLE_RADIUS, 20),
    at([x, top - 0.03, z], [Math.PI / 2, 0, 0], [1, 1, 0.06]),
    'stone',
    {
      solid: true,
    },
  );
  pieces.add(
    C.map,
    cylinder(MAP_TABLE_RADIUS - 0.06, 20),
    at([x, top + 0.002, z], [Math.PI / 2, 0, 0], [1, 1, 0.01]),
    'stone',
    {
      solid: false,
      vary: 0,
    },
  );
  pieces.add(C.brass, torus(MAP_TABLE_RADIUS, 0.025, 24, 4), at([x, top, z]), 'metal', {
    solid: false,
  });
}

/** La mesa de carga: tablero con baranda baja y correas, un rollo de cuerda y un hatillo. */
function cargoTable(pieces: PieceSet): void {
  const { x, z } = CARGO_TABLE;
  const top = FLOOR_Y + CARGO_TABLE_HEIGHT;
  pieces.add(C.wood, box(), at([x, top - 0.03, z], [0, 0.6, 0], [0.9, 0.06, 0.65]), 'stone', {
    solid: true,
  });
  for (const [dx, dz] of [
    [-0.38, -0.26],
    [0.38, -0.26],
    [-0.38, 0.26],
    [0.38, 0.26],
  ] as const) {
    const c = Math.cos(0.6);
    const s = Math.sin(0.6);
    const px = x + dx * c + dz * s;
    const pz = z - dx * s + dz * c;
    pieces.add(
      C.woodDark,
      box(),
      at([px, (FLOOR_Y + top) / 2, pz], [0, 0.6, 0], [0.06, top - FLOOR_Y, 0.06]),
      'stone',
    );
  }
  pieces.add(C.woodDark, box(), at([x, top + 0.04, z], [0, 0.6, 0], [0.94, 0.05, 0.69]), 'stone', {
    solid: false,
  });
  pieces.add(C.green, box(), at([x, top + 0.005, z], [0, 0.6, 0], [0.92, 0.012, 0.08]), 'stone', {
    solid: false,
  });
  pieces.add(
    C.fabricLight,
    torus(0.12, 0.04, 10, 4),
    at([x + 0.28, top + 0.03, z - 0.15]),
    'stone',
    { solid: false },
  );
  pieces.add(
    C.ochre,
    ball(0.12, 1),
    at([x - 0.3, top + 0.08, z + 0.12], undefined, [1, 0.7, 1]),
    'stone',
    {
      solid: false,
    },
  );
}

/** El reloj doble de pared: esfera de papel, aro de latón y dos agujas que giran (piezas aparte). */
function wallClock(make: PartFactory, parent: Group): InteriorParts['clockHands'] {
  const clock = make('nave_Reloj', (p) => {
    // En sus ejes: la esfera en el plano XY, mirando a +Z.
    p.add(C.paper, cylinder(0.38, 24), at([0, 0, 0], undefined, [1, 1, 0.03]), 'stone', {
      vary: 0,
    });
    p.add(C.brass, torus(0.38, 0.04, 24, 5), at([0, 0, 0], [Math.PI / 2, 0, 0]), 'metal');
    p.add(C.green, torus(0.24, 0.012, 24, 3), at([0, 0, 0.02], [Math.PI / 2, 0, 0]), 'stone');
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      p.add(
        C.ink,
        box(),
        at([Math.sin(a) * 0.32, Math.cos(a) * 0.32, 0.02], [0, 0, -a], [0.02, 0.06, 0.01]),
        'stone',
        {
          vary: 0,
        },
      );
    }
  });
  clock.position.copy(WALL_CLOCK);
  // Mira al centro de la sala.
  clock.rotation.y = Math.atan2(-WALL_CLOCK.x, -WALL_CLOCK.z);
  parent.add(clock);
  const hand = (
    name: string,
    color: string,
    length: number,
    width: number,
    depth: number,
  ): Group => {
    const group = make(name, (p) => {
      p.add(
        color,
        box(),
        at([0, length / 2 - 0.04, 0], undefined, [width, length, 0.012]),
        'stone',
        { vary: 0 },
      );
      p.add(C.brass, ball(0.03, 0), at([0, 0, 0]), 'metal');
    });
    group.position.z = depth;
    clock.add(group);
    return group;
  };
  return {
    umbral: hand('nave_Reloj_Umbral', C.ochre, 0.32, 0.03, 0.035),
    yours: hand('nave_Reloj_Tuyo', C.greenDark, 0.22, 0.04, 0.05),
  };
}

/** Estantes con tarros, plantas de musgo con su bulbo, una hamaca y las lámparas del techo. */
function furnishings(pieces: PieceSet): void {
  // Estante curvo a babor, detrás del atril.
  const shelf: [number, number][] = [
    [FLOOR_RADIUS - 0.02, 0.15],
    [FLOOR_RADIUS - 0.32, 0.15],
  ];
  for (const profile of [shelf, inward(shelf)]) {
    pieces.add(C.wood, lathe(profile, 6, -Math.PI / 2 - 0.55, 0.5), at([0, 0, 0]), 'stone', {
      solid: false,
    });
  }
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 - 0.5 + k * 0.1;
    const r = FLOOR_RADIUS - 0.17;
    pieces.add(
      k % 2 ? C.glow : C.ochre,
      cylinder(0.05, 6),
      at([Math.sin(a) * r, 0.24, Math.cos(a) * r], [Math.PI / 2, 0, 0], [1, 1, 0.16]),
      k % 2 ? 'light' : 'stone',
      { solid: false, glow: k % 2 ? 0.9 : 1 },
    );
  }
  // Plantas de musgo en macetas, junto a la pared.
  for (const a of [-2.1, 2.05, 0.75]) {
    const r = FLOOR_RADIUS - 0.35;
    const [px, pz] = [Math.sin(a) * r, Math.cos(a) * r];
    pieces.add(
      C.ochre,
      cone(0.18, 0.24, 8),
      at([px, FLOOR_Y + 0.15, pz], [-Math.PI / 2, 0, 0], [1, 1, 0.3]),
      'stone',
      {
        solid: true,
      },
    );
    pieces.add(
      C.green,
      ball(0.25, 1),
      at([px, FLOOR_Y + 0.42, pz], undefined, [1, 0.8, 1]),
      'stone',
      {
        solid: false,
      },
    );
    pieces.add(C.glow, ball(0.05, 0), at([px + 0.08, FLOOR_Y + 0.62, pz]), 'light', {
      glow: 1.3,
      vary: 0,
    });
  }
  // La hamaca, entre dos costillas a estribor y popa.
  const a0 = 1.15;
  const a1 = 1.75;
  const r = FLOOR_RADIUS - 0.1;
  const p0: [number, number, number] = [Math.sin(a0) * r, FLOOR_Y + 0.75, Math.cos(a0) * r];
  const p1: [number, number, number] = [Math.sin(a1) * r, FLOOR_Y + 0.75, Math.cos(a1) * r];
  const mid: [number, number, number] = [
    ((p0[0] + p1[0]) / 2) * 0.93,
    FLOOR_Y + 0.5,
    ((p0[2] + p1[2]) / 2) * 0.93,
  ];
  pieces.add(
    C.fabricLight,
    cylinder(0.2, 6),
    between(p0, mid, 1).multiply(at([0, 0, 0], undefined, [1, 0.25, 1])),
    'stone',
    {
      solid: false,
    },
  );
  pieces.add(
    C.fabricLight,
    cylinder(0.2, 6),
    between(mid, p1, 1).multiply(at([0, 0, 0], undefined, [1, 0.25, 1])),
    'stone',
    {
      solid: false,
    },
  );
  // Lámparas de los Ool colgadas del anillo del techo.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const rr = DOME_BASE_RADIUS - 0.25;
    const top: [number, number, number] = [Math.sin(a) * rr, DOME_BASE_Y, Math.cos(a) * rr];
    const bulb: [number, number, number] = [top[0], DOME_BASE_Y - 0.4, top[2]];
    pieces.add(C.dark, cylinder(0.01, 4), between(top, bulb), 'metal', { solid: false });
    pieces.add(C.glowWarm, ball(0.08, 1), at(bulb), 'light', { glow: 1.5, vary: 0 });
  }
}

/** La trampilla (cerrada: tapa el pozo a ras de suelo). Su origen es la bisagra. */
function door(make: PartFactory): Group {
  const width = WELL.maxX - WELL.minX;
  const length = WELL.maxZ - WELL.minZ;
  const group = make('nave_Trampilla', (p) => {
    p.add(
      C.wood,
      box(),
      at([0, -0.03, length / 2], undefined, [width - 0.02, 0.05, length - 0.02]),
      'stone',
      {
        solid: false,
      },
    );
    p.add(C.brass, torus(0.12, 0.02, 10, 4), at([0, 0.0, length * 0.75]), 'metal', {
      solid: false,
    });
    for (let k = 1; k < 5; k++) {
      p.add(
        C.woodDark,
        box(),
        at([0, -0.002, (k * length) / 5], undefined, [width - 0.04, 0.005, 0.02]),
        'stone',
        {
          solid: false,
          vary: 0,
        },
      );
    }
  });
  group.position.set(0, FLOOR_Y, WELL.minZ);
  return group;
}

/** La escalerilla, modelada a lo largo de +Z desde su cabeza; el juego la gira y la estira. */
/** Altura del pasamanos sobre los largueros, en vertical (m). */
const HANDRAIL_HEIGHT = 0.85;
/** Postes de cada baranda, por fracción del largo (el primero, en la boca del pozo, sirve de agarre al subir). */
const HANDRAIL_POSTS = [0, 1 / 3, 2 / 3, 1];

/**
 * Una baranda en los ejes de la escalerilla bajada (Z a lo largo, hacia abajo): postes en vertical de verdad y el
 * pasamanos paralelo a los largueros, a la misma altura en toda su longitud.
 */
function handrail(p: PieceSet, x: number): void {
  // La vertical del mundo vista desde los ejes de la escalerilla (girada LADDER_ANGLE en X).
  const upY = Math.cos(LADDER_ANGLE) * HANDRAIL_HEIGHT;
  const upZ = -Math.sin(LADDER_ANGLE) * HANDRAIL_HEIGHT;
  const top = (s: number): [number, number, number] => [x, upY, s + upZ];
  p.add(C.dark, cylinder(0.03, 6), between(top(0), top(LADDER_LENGTH)), 'metal', {
    solid: false,
  });
  for (const t of HANDRAIL_POSTS) {
    const s = LADDER_LENGTH * t;
    p.add(C.dark, cylinder(0.02, 5), between([x, 0, s], top(s)), 'metal', { solid: false });
  }
}

function ladder(make: PartFactory): Group {
  const group = make('nave_Escalerilla', (p) => {
    for (const side of [-1, 1]) {
      p.add(
        C.brass,
        box(),
        at([side * LADDER_HALF_WIDTH, 0, LADDER_LENGTH / 2], undefined, [
          0.05,
          0.08,
          LADDER_LENGTH,
        ]),
        'metal',
        {
          solid: false,
        },
      );
      handrail(p, side * (LADDER_HALF_WIDTH + 0.02));
    }
    const steps = 9;
    for (let k = 0; k < steps; k++) {
      const zz = ((k + 0.5) / steps) * LADDER_LENGTH;
      // Peldaños horizontales: deshacen la inclinación de la escalerilla.
      p.add(
        C.wood,
        box(),
        at([0, 0.02, zz], [-LADDER_ANGLE, 0, 0], [LADDER_HALF_WIDTH * 2 - 0.04, 0.05, 0.3]),
        'stone',
        {
          solid: false,
        },
      );
    }
  });
  group.position.copy(LADDER_TOP);
  return group;
}

/** La rampa de colisión de la escalerilla bajada: un plano inclinado que se sube andando (máx. 45°). */
function rampCollider(pieces: PieceSet): void {
  const direction = new Vector3(0, -Math.sin(LADDER_ANGLE), Math.cos(LADDER_ANGLE));
  const normal = new Vector3(0, Math.cos(LADDER_ANGLE), Math.sin(LADDER_ANGLE));
  const center = LADDER_TOP.clone()
    .addScaledVector(direction, LADDER_LENGTH / 2 + 0.15)
    .addScaledVector(normal, -0.05);
  const ramp: BufferGeometry = box()
    .clone()
    .applyMatrix4(
      at(
        center.toArray(),
        [LADDER_ANGLE, 0, 0],
        [LADDER_HALF_WIDTH * 2 + 0.1, 0.1, LADDER_LENGTH + 0.3],
      ),
    );
  pieces.addCollider(ramp);
}

/** Todo lo de dentro: va a `pieces` (con su colisión); lo que se mueve, a grupos propios colgados de `parent`. */
export function buildInterior(pieces: PieceSet, make: PartFactory, parent: Group): InteriorParts {
  lining(pieces);
  floor(pieces);
  cockpit(pieces);
  lectern(pieces);
  mapTable(pieces);
  cargoTable(pieces);
  furnishings(pieces);
  rampCollider(pieces);
  const hatchDoor = door(make);
  const hatchLadder = ladder(make);
  parent.add(hatchDoor, hatchLadder);
  const orrery = new Group();
  orrery.name = 'nave_Planetario';
  orrery.position.set(MAP_TABLE.x, FLOOR_Y + MAP_TABLE_HEIGHT + 0.12, MAP_TABLE.z);
  const cargo = new Group();
  cargo.name = 'nave_Carga';
  cargo.position.set(CARGO_TABLE.x, FLOOR_Y + CARGO_TABLE_HEIGHT + 0.02, CARGO_TABLE.z);
  parent.add(orrery, cargo);
  return {
    door: hatchDoor,
    ladder: hatchLadder,
    clockHands: wallClock(make, parent),
    orrery,
    cargo,
  };
}
