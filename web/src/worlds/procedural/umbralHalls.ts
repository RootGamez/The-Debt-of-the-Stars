// Los edificios cerrados de Umbral (plan de la llegada, hito D, 🟡 el contenido): la Casa de Estudio junto al
// despertar, la Sala de Mando al norte de La Boca y el Taller del Tallista junto a las Casas. Por dentro cuentan que
// se fueron hace poco y con prisa: aparatos con su piloto en espera, tablillas a medio leer, un taburete volcado,
// herramientas sobre la mesa y un panel a medio tallar. Los murales y lo que se lee llegan en el hito E.
import { box, cylinder, torus, type Frame, type PieceSet, type Triple } from './kit';
import { seededRandom } from './noise';
import { PALETTE as P } from './umbralPalette';
import { hallShell, pilot } from './umbralHallsKit';
import { HALL, HALLS, type HallId } from './umbralHallsShape';
import type { LandmarkBuilder } from './umbralLandmarks';

const F = HALL.floor;

/** Una mesa de los Ausentes: tablero de piedra sobre dos pies de pizarra (alta para un Ool). */
function table(v: PieceSet, f: Frame, at: Triple, w: number, d: number, h = 1): void {
  v.add(P.sandstoneLight, box(), f.at([at[0], at[1], F + h - 0.06], undefined, [w, d, 0.12]));
  for (const side of [-1, 1]) {
    v.add(
      P.slate,
      box(),
      f.at([at[0] + side * (w / 2 - 0.2), at[1], F + (h - 0.12) / 2], undefined, [
        0.16,
        d * 0.8,
        h - 0.12,
      ]),
      'metal',
    );
  }
}

/** Tablillas sueltas sobre algo a la altura `z`, algunas torcidas. */
function tablets(
  v: PieceSet,
  f: Frame,
  x: number,
  y: number,
  z: number,
  count: number,
  seed: number,
): void {
  const random = seededRandom(seed);
  for (let k = 0; k < count; k++) {
    v.add(
      k % 3 ? P.paper : P.sandstoneLight,
      box(),
      f.at(
        [x + (random() - 0.5) * 1.4, y + (random() - 0.5) * 0.5, z + 0.012 + k * 0.004],
        [0, 0, (random() - 0.5) * 0.9],
        [0.32, 0.24, 0.02],
      ),
      'stone',
      { solid: false },
    );
  }
}

/** Un taburete alto; `tipped` lo deja volcado en el suelo. */
function stool(v: PieceSet, f: Frame, x: number, y: number, tipped = false): void {
  if (tipped) {
    v.add(
      P.slateLight,
      cylinder(0.22, 10),
      f.at([x, y, F + 0.22], [Math.PI / 2, 0, 0.6], [1, 1, 0.9]),
      'metal',
      { solid: false },
    );
    return;
  }
  v.add(P.slateLight, cylinder(0.08, 8), f.at([x, y, F + 0.42], undefined, [1, 1, 0.84]), 'metal', {
    solid: false,
  });
  v.add(P.copper, cylinder(0.26, 12), f.at([x, y, F + 0.88], undefined, [1, 1, 0.08]), 'metal', {
    solid: false,
  });
}

/** Una estantería alta contra un muro, con tablillas en baldas (algunas vacías: se llevaron lo que pudieron). */
function shelf(
  v: PieceSet,
  f: Frame,
  at: Triple,
  length: number,
  rotation: number,
  seed: number,
): void {
  const random = seededRandom(seed);
  v.add(P.sandstoneShade, box(), f.at([at[0], at[1], F + 1.5], [0, 0, rotation], [length, 0.5, 3]));
  for (let row = 0; row < 4; row++) {
    const z = F + 0.45 + row * 0.7;
    v.add(
      P.slate,
      box(),
      f.at([at[0], at[1], z], [0, 0, rotation], [length + 0.04, 0.54, 0.05]),
      'metal',
      { solid: false },
    );
    for (let k = 0; k < length / 0.12 - 1; k++) {
      if (random() < 0.35) continue; // huecos
      const s = -length / 2 + 0.12 + k * 0.12;
      const [dx, dy] = [Math.cos(rotation) * s, Math.sin(rotation) * s];
      v.add(
        random() < 0.5 ? P.paper : P.sandstoneLight,
        box(),
        f.at([at[0] + dx, at[1] + dy, z + 0.17], [0, 0, rotation], [0.05, 0.36, 0.3]),
        'stone',
        {
          solid: false,
          vary: 0.08,
        },
      );
    }
  }
}

/** Una taza de porcelana olvidada. */
function cup(v: PieceSet, f: Frame, at: Triple): void {
  v.add(
    P.porcelain,
    cylinder(0.05, 10),
    f.at([at[0], at[1], at[2] + 0.05], undefined, [1, 1, 0.1]),
    'stone',
    { solid: false },
  );
}

/** Un panel de aparato en la pared: marco de cobre, cristal oscuro y una fila de pilotos en espera. */
function wallDevice(v: PieceSet, f: Frame, at: Triple, rotation: number, lights: number): void {
  v.add(P.copper, box(), f.at(at, [0, 0, rotation], [1.3, 0.12, 0.9]), 'metal', { solid: false });
  v.add(P.violet, box(), f.at(at, [0, 0, rotation], [1.1, 0.14, 0.7]), 'metal', { solid: false });
  for (let k = 0; k < lights; k++) {
    const s = -0.4 + (0.8 * k) / Math.max(1, lights - 1);
    pilot(
      v,
      f,
      [at[0] + Math.cos(rotation) * s, at[1] + Math.sin(rotation) * s, at[2] - 0.55],
      0.04,
    );
  }
}

/** La Casa de Estudio: sala de estudio con dos mesas largas y, detrás del tabique, el archivo. */
function studyHall(v: PieceSet, f: Frame): void {
  table(v, f, [-3.6, -3.1, 0], 2.2, 0.9);
  table(v, f, [-1, -3.1, 0], 2.2, 0.9);
  tablets(v, f, -3.6, -3.1, F + 1, 6, 11);
  tablets(v, f, -1, -3.1, F + 1, 4, 12);
  cup(v, f, [-0.3, -2.9, F + 1]);
  stool(v, f, -3.8, -2.2);
  stool(v, f, -1.2, -1.9, true);
  // Una lámpara de mesa que sigue encendida, y aparatos de pared en espera.
  v.add(P.slate, cylinder(0.04, 6), f.at([-4.4, -3.4, F + 1.25], undefined, [1, 1, 0.5]), 'metal', {
    solid: false,
  });
  v.add(
    P.light,
    cylinder(0.14, 10),
    f.at([-4.4, -3.4, F + 1.52], undefined, [1, 1, 0.12]),
    'light',
    { glow: 2, solid: false },
  );
  wallDevice(v, f, [-5.45, 0.6, 2.2], Math.PI / 2, 4);
  // Tablillas caídas en el suelo, camino de la puerta.
  tablets(v, f, -1.6, 1.6, F, 5, 13);
  // El archivo: estanterías contra el muro y un atril.
  shelf(v, f, [5.2, -1.2, 0], 4.2, Math.PI / 2, 21);
  shelf(v, f, [3.6, -3.7, 0], 2.8, 0, 22);
  v.add(P.slate, box(), f.at([3.2, 1.8, F + 0.55], undefined, [0.3, 0.3, 1.1]), 'metal');
  v.add(
    P.sandstoneLight,
    box(),
    f.at([3.2, 1.8, F + 1.15], [0.5, 0, 0], [0.7, 0.5, 0.06]),
    'stone',
    { solid: false },
  );
  tablets(v, f, 3.8, 3.2, F, 3, 23);
  pilot(v, f, [5.45, 2.6, 1.6]);
}

/** La Sala de Mando: un arco de consolas alrededor de la mesa de proyección, con diales de anillo en el muro. */
function commandHall(v: PieceSet, f: Frame): void {
  // La mesa redonda del centro (la proyección llega en el hito E).
  v.add(P.slate, cylinder(1.3, 24), f.at([0, -0.5, F + 0.45], undefined, [1, 1, 0.9]), 'metal');
  v.add(
    P.copper,
    torus(1.3, 0.06, 32, 4),
    f.at([0, -0.5, F + 0.92], [Math.PI / 2, 0, 0]),
    'metal',
    { solid: false },
  );
  v.add(P.violet, cylinder(1.1, 24), f.at([0, -0.5, F + 0.92], undefined, [1, 1, 0.02]), 'metal', {
    solid: false,
  });
  pilot(v, f, [0, -0.5, F + 0.95], 0.12);
  // El arco de consolas, de cara a la mesa, por detrás.
  for (let k = 0; k < 7; k++) {
    const a = Math.PI + (Math.PI * (k + 0.5)) / 7;
    const [x, y] = [Math.cos(a) * 3.7, -0.5 + Math.sin(a) * 3.7];
    const turn = a + Math.PI / 2;
    v.add(P.slate, box(), f.at([x, y, F + 0.55], [0, 0, turn], [1.4, 0.7, 1.1]), 'metal');
    v.add(
      P.copper,
      box(),
      f.at([x * 0.97, -0.5 + (y + 0.5) * 0.97, F + 1.15], [0.45, 0, turn], [1.4, 0.55, 0.08]),
      'metal',
      {
        solid: false,
      },
    );
    for (let l = 0; l < 3; l++) {
      const s = -0.4 + l * 0.4;
      pilot(
        v,
        f,
        [x * 0.95 + Math.cos(turn) * s, -0.5 + (y + 0.5) * 0.95 + Math.sin(turn) * s, F + 1.24],
        0.035,
      );
    }
  }
  // Un asiento alto, apartado de su consola de golpe.
  v.add(P.slateLight, box(), f.at([2.1, -3.0, F + 0.45], [0, 0, 0.7], [0.6, 0.6, 0.9]), 'metal');
  v.add(P.copper, box(), f.at([2.35, -3.25, F + 1.3], [0, 0, 0.7], [0.6, 0.1, 0.9]), 'metal', {
    solid: false,
  });
  // Diales de anillo en el muro del fondo, con sus marcas de reloj.
  for (const x of [-3, 0, 3]) {
    v.add(P.copper, torus(0.6, 0.05, 28, 4), f.at([x, -4.95, 2.6]), 'metal', { solid: false });
    for (let k = 0; k < 12; k++) {
      const a = (Math.PI * 2 * k) / 12;
      v.add(
        P.verdigris,
        box(),
        f.at(
          [x + Math.cos(a) * 0.45, -4.93, 2.6 + Math.sin(a) * 0.45],
          [0, -a, 0],
          [0.12, 0.04, 0.03],
        ),
        'metal',
        {
          solid: false,
        },
      );
    }
    pilot(v, f, [x, -4.9, 2.6], 0.05);
  }
  wallDevice(v, f, [-4.95, -1, 2.2], Math.PI / 2, 5);
  wallDevice(v, f, [4.95, -1, 2.2], Math.PI / 2, 3);
}

/** El Taller del Tallista: banco con herramientas, un panel a medio tallar y, detrás, el almacén. */
function carverHall(v: PieceSet, f: Frame): void {
  table(v, f, [-3.6, 1.3, 0], 1.1, 3);
  // Cinceles y una maza sobre el banco, como si fuera a volver.
  for (let k = 0; k < 5; k++) {
    v.add(
      P.slate,
      box(),
      f.at([-3.7 + k * 0.08, 0.4 + k * 0.25, F + 1.02], [0, 0, 0.3 * k], [0.04, 0.38, 0.03]),
      'metal',
      { solid: false },
    );
  }
  v.add(
    P.rockDark,
    cylinder(0.12, 8),
    f.at([-3.5, 2.2, F + 1.12], [Math.PI / 2, 0, 0.4], [1, 1, 0.3]),
    'stone',
    { solid: false },
  );
  v.add(
    P.ochre,
    cylinder(0.025, 6),
    f.at([-3.35, 2.45, F + 1.08], [Math.PI / 2, 0, 0.4], [1, 1, 0.5]),
    'stone',
    { solid: false },
  );
  cup(v, f, [-3.3, 0.1, F + 1]);
  // El panel en su caballete: abajo, tallado en estratos; arriba, la piedra lisa marcada para seguir.
  v.add(P.sandstone, box(), f.at([1.8, 0.6, F + 1.5], undefined, [2.2, 0.25, 2.8]));
  for (let k = 0; k < 5; k++) {
    v.add(
      k % 2 ? P.sandstoneShade : P.sandstoneLight,
      box(),
      f.at([1.8, 0.75, F + 0.4 + k * 0.22], undefined, [2.0, 0.08, 0.12]),
      'stone',
      {
        solid: false,
      },
    );
  }
  v.add(P.slate, box(), f.at([1.3, 0.74, F + 1.6], undefined, [1.2, 0.02, 0.02]), 'metal', {
    solid: false,
  });
  v.add(P.slate, box(), f.at([1.8, 0.74, F + 2.2], undefined, [0.02, 0.02, 1.0]), 'metal', {
    solid: false,
  });
  for (const side of [-1, 1]) {
    v.add(
      P.slate,
      box(),
      f.at([1.8 + side * 1.0, 0.35, F + 1.4], [0.25, 0, 0], [0.1, 0.1, 2.9]),
      'metal',
      { solid: false },
    );
  }
  // Esquirlas y polvo de piedra al pie del panel.
  const random = seededRandom(31);
  for (let k = 0; k < 14; k++) {
    v.add(
      P.sandstoneLight,
      box(),
      f.at(
        [1.8 + (random() - 0.5) * 2, 1.2 + random() * 0.6, F + 0.03],
        [random(), random(), random()],
        [0.08, 0.06, 0.05],
      ),
      'stone',
      {
        solid: false,
        vary: 0.1,
      },
    );
  }
  wallDevice(v, f, [4.45, 1.5, 2.2], Math.PI / 2, 2);
  pilot(v, f, [-4.45, 2.9, 1.8]);
  // El almacén: cajas y paneles en blanco apoyados.
  for (const [x, y, s] of [
    [-3.8, -2.6, 0.9],
    [-2.7, -2.8, 0.7],
    [3.6, -2.5, 1.0],
  ] as const) {
    v.add(P.ochreLight, box(), f.at([x, y, F + s / 2], undefined, [s, s, s]));
  }
  for (let k = 0; k < 3; k++) {
    v.add(
      P.sandstoneLight,
      box(),
      f.at([1 + k * 0.3, -3.2, F + 1.2], [0.15, 0, 0], [1.6, 0.18, 2.4]),
    );
  }
}

const CONTENTS: Record<HallId, (v: PieceSet, f: Frame) => void> = {
  study: studyHall,
  command: commandHall,
  carver: carverHall,
};

/** Construye el edificio `id` mirando a `heading` (grados): el armazón y lo que se dejaron dentro. */
export function closedHall(b: LandmarkBuilder, id: HallId, heading: number): Frame {
  const shape = HALLS[id];
  const f = b.place({
    lat: shape.lat,
    lon: shape.lon,
    heading,
    footprint: Math.min(shape.width, shape.depth) / 2,
    ground: 'mean',
  });
  hallShell(b.pieces, f, shape);
  CONTENTS[id](b.pieces, f);
  return f;
}
