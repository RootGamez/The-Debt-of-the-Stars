// La Sala de las Fluctuaciones del Observatorio (🟡, pedido de Anthony 2026-11-05): el cuarto donde los Ausentes
// estudiaban el temblor de la luz que llegaba por el telescopio. Pegada al oeste de la cúpula y cerrada al vacío.
// Dentro: el registrador (un tambor de papel que gira bajo una aguja, con rollos y rollos en el suelo), la curva de
// las fluctuaciones en la pared, la mesa de las placas de cristal (una por noche), los dos relojes que se separan
// y, en la mesa del centro, la carta sellada del Consejo. Cuatro fuentes del Registro.
import { ball, box, cylinder, pieceMatrix, torus, type Frame, type Triple } from './kit';
import { ObsBuilder, PALETTE as P } from './observatorioKit';

const TOP = 0.35;
const WALL = 0.3;
const HEIGHT = 3.0;
/** El cuarto, en el mapa: desde el tambor (x = −4,3, dentro de su pared) hasta el fondo, y de pared a pared. */
export const STUDY = { near: -4.3, far: -13.2, half: 3.2 } as const;

function shell(b: ObsBuilder, f: Frame): void {
  const { near, far, half } = STUDY;
  const length = near - far;
  const cx = (near + far) / 2;
  const roof = TOP + HEIGHT;
  b.solid(
    P.sandstoneShade,
    box(),
    f.at([cx, 0, TOP - 0.3], undefined, [length, half * 2 + 0.4, 0.6]),
  );
  for (const side of [-1, 1]) {
    b.solid(
      side > 0 ? P.sandstone : P.sandstoneLight,
      box(),
      f.at([cx, side * (half + WALL / 2), TOP + HEIGHT / 2], undefined, [length, WALL, HEIGHT]),
    );
  }
  b.solid(
    P.sandstone,
    box(),
    f.at([far - WALL / 2, 0, TOP + HEIGHT / 2], undefined, [WALL, half * 2 + 0.6, HEIGHT]),
  );
  b.solid(
    P.slate,
    box(),
    f.at([cx - 0.15, 0, roof + 0.12], undefined, [length + 0.3, half * 2 + 0.8, 0.24]),
  );
  // Costillas de latón por fuera y por dentro: el cuarto es de los Ausentes, de anillos y estratos.
  for (let k = 0; k < 4; k++) {
    const x = near - 1.6 - k * 2.3;
    for (const side of [-1, 1]) {
      b.solid(
        P.slate,
        box(),
        f.at([x, side * (half + WALL + 0.12), TOP + HEIGHT / 2], undefined, [
          0.35,
          0.25,
          HEIGHT + 0.2,
        ]),
      );
      // Ventanas altas, con la luz de dentro.
      b.lamp(
        box(),
        f.at([x + 1.15, side * (half + WALL + 0.02), TOP + 2.3], undefined, [0.9, 0.04, 0.35]),
      );
    }
    b.brass(box(), f.at([x, 0, roof - 0.05], undefined, [0.12, half * 2, 0.1]));
  }
  for (const x of [near - 2.4, far + 2.4]) b.lamp(ball(0.13, 1), f.at([x, 0, roof - 0.3]));
}

/** El registrador: un banco largo con el tambor que gira bajo la aguja, y el papel que se amontona. */
function recorder(b: ObsBuilder, f: Frame): void {
  const y = STUDY.half - 0.55;
  b.solid(P.slate, box(), f.at([-9.0, y, TOP + 0.85], undefined, [4.4, 0.8, 0.08]));
  for (const x of [-7.0, -11.0]) {
    b.solid(P.slateDark, box(), f.at([x, y, TOP + 0.42], undefined, [0.12, 0.7, 0.84]));
  }
  const drum: Triple = [-8.0, y, TOP + 0.89];
  b.solid(
    P.slateDark,
    cylinder(0.3, 10),
    f.at([drum[0], drum[1], drum[2] + 0.04], undefined, [1, 1, 0.08]),
  );
  b.spinning('ANIM_registrador', f, [drum[0], drum[1], drum[2] + 0.08], { spin: 0.35 }, (set) => {
    set.add(
      P.paper,
      cylinder(0.24, 12),
      pieceMatrix([0, 0.25, 0], [Math.PI / 2, 0, 0], [1, 1, 0.5]),
      'stone',
      {
        solid: false,
      },
    );
    // La traza de tinta, que da la vuelta al tambor subiendo y bajando cada vez más.
    for (let k = 0; k < 16; k++) {
      const a = (Math.PI * 2 * k) / 16;
      const swing = 0.04 + (k / 16) * 0.14;
      set.add(
        P.slateDark,
        box(),
        pieceMatrix(
          [Math.cos(a) * 0.245, 0.25 + Math.sin(k * 2.1) * swing, Math.sin(a) * 0.245],
          [0, -a, 0],
          [0.012, 0.03, 0.1],
        ),
        'stone',
        { solid: false },
      );
    }
  });
  // La aguja con su brazo de latón.
  b.brass(
    box(),
    f.at([drum[0] + 0.45, drum[1] - 0.05, drum[2] + 0.4], [0, 0, 0.5], [0.6, 0.03, 0.03]),
  );
  b.brass(
    cylinder(0.04, 6),
    f.at([drum[0] + 0.7, drum[1] + 0.05, drum[2] + 0.2], undefined, [1, 1, 0.4]),
  );
  // El papel: una tira que cae del banco y rollos por el suelo, muchos.
  b.view(
    P.paper,
    box(),
    f.at([drum[0] - 0.5, y - 0.42, TOP + 0.45], [0.15, 0, 0], [0.3, 0.01, 0.85]),
  );
  const rolls: readonly [number, number, number][] = [
    [-7.4, 1.3, 0.2],
    [-8.6, 1.5, 1.1],
    [-9.3, 1.1, 0.4],
    [-10.1, 1.6, 2.0],
    [-10.6, 1.2, 0.7],
    [-9.9, 2.0, 1.5],
  ];
  for (const [x, yy, turn] of rolls) {
    b.view(
      P.paper,
      cylinder(0.12, 8),
      f.at([x, yy, TOP + 0.12], [Math.PI / 2, 0, turn], [1, 1, 0.5]),
    );
  }
  for (let k = 0; k < 5; k++) {
    b.view(
      P.paper,
      box(),
      f.at([-11.6, 2.1 - k * 0.08, TOP + 0.06 + k * 0.1], [0, 0, k * 0.4], [0.55, 0.4, 0.09]),
    );
  }
  // La curva de las fluctuaciones en la pared: una traza que empieza casi recta y acaba saltando de lado a lado.
  const board: Triple = [-9.4, STUDY.half - 0.06, TOP + 1.85];
  b.view(P.slateDark, box(), f.at(board, undefined, [3.0, 0.05, 1.0]));
  b.brass(box(), f.at([board[0], board[1] - 0.03, board[2]], undefined, [2.8, 0.02, 0.015]));
  for (let k = 0; k < 40; k++) {
    const t = k / 39;
    const swing = 0.02 + 0.4 * t ** 3;
    const z = Math.sin(k * 1.9) * swing;
    b.lamp(
      ball(0.022, 0),
      f.at([board[0] - 1.35 + t * 2.7, board[1] - 0.05, board[2] + z]),
      t > 0.75 ? P.amber : P.amberSoft,
      1.2,
    );
  }
  b.mark('INT_registrador', f, [drum[0], 1.6, TOP + 1.2], {
    clue_id: 'observatorio.registrador',
    kind: 'objeto',
  });
}

/** La mesa de las placas: cristales de una noche cada uno, todos del mismo trozo de cielo, con luz por detrás. */
function plates(b: ObsBuilder, f: Frame): void {
  const y = -STUDY.half + 0.08;
  const cx = -9.2;
  const columns = 9;
  const rows = 4;
  b.view(
    P.slateDark,
    box(),
    f.at([cx, y, TOP + 1.5], undefined, [columns * 0.36 + 0.2, 0.06, rows * 0.3 + 0.2]),
  );
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = cx + (col - (columns - 1) / 2) * 0.36;
      const z = TOP + 1.5 + (row - (rows - 1) / 2) * 0.3;
      b.lamp(box(), f.at([x, y + 0.05, z], undefined, [0.3, 0.02, 0.24]), P.plate, 0.7);
      // Las estrellas cambian de una placa a otra; el punto de la izquierda está siempre en el mismo sitio.
      const seed = row * columns + col;
      for (let s = 0; s < 3; s++) {
        b.lamp(
          ball(0.01, 0),
          f.at([
            x + Math.sin(seed * 3.1 + s * 1.7) * 0.11,
            y + 0.065,
            z + Math.cos(seed * 2.3 + s) * 0.08,
          ]),
          '#ffffff',
          1.3,
        );
      }
      b.lamp(ball(0.014, 0), f.at([x - 0.07, y + 0.065, z + 0.04]), P.amber, 1.6);
    }
  }
  // Una placa suelta en la mesa de abajo, con su lupa de latón.
  b.solid(P.slate, box(), f.at([cx, y + 0.5, TOP + 0.8], undefined, [2.4, 0.7, 0.07]));
  for (const x of [cx - 1.0, cx + 1.0]) {
    b.solid(P.slateDark, box(), f.at([x, y + 0.5, TOP + 0.4], undefined, [0.1, 0.6, 0.8]));
  }
  b.lamp(
    box(),
    f.at([cx + 0.3, y + 0.5, TOP + 0.85], [0, 0, 0.2], [0.3, 0.24, 0.02]),
    P.plate,
    0.8,
  );
  b.brass(torus(0.08, 0.012, 14, 4), f.at([cx + 0.35, y + 0.45, TOP + 0.88]));
  b.mark('INT_placas', f, [cx, y + 1.2, TOP + 1.2], {
    clue_id: 'observatorio.placas',
    kind: 'objeto',
  });
}

/** Los dos relojes de la pared del fondo («Umbral» y «Aquí»), y las rayas de la diferencia, día tras día. */
function clocks(b: ObsBuilder, f: Frame): void {
  const x = STUDY.far + 0.08;
  const z = TOP + 1.9;
  [-0.9, 0.9].forEach((y, k) => {
    b.view(P.paper, cylinder(0.42, 16), f.at([x + 0.03, y, z], [0, Math.PI / 2, 0], [1, 1, 0.05]));
    b.brass(torus(0.43, 0.03, 20, 4), f.at([x + 0.06, y, z], [0, Math.PI / 2, 0]));
    for (let h = 0; h < 12; h++) {
      const a = (Math.PI * 2 * h) / 12;
      b.view(
        P.slateDark,
        box(),
        f.at(
          [x + 0.07, y + Math.sin(a) * 0.34, z + Math.cos(a) * 0.34],
          [-a, 0, 0],
          [0.01, 0.025, 0.06],
        ),
      );
    }
    // Las agujas: el de «Aquí» va por delante.
    const hand = k === 0 ? 0.3 : 1.15;
    b.view(
      P.slateDark,
      box(),
      f.at(
        [x + 0.09, y + Math.sin(hand) * 0.13, z + Math.cos(hand) * 0.13],
        [-hand, 0, 0],
        [0.012, 0.03, 0.26],
      ),
    );
    b.view(
      P.slateDark,
      box(),
      f.at(
        [x + 0.1, y + Math.sin(hand * 12) * 0.16, z + Math.cos(hand * 12) * 0.16],
        [-hand * 12, 0, 0],
        [0.012, 0.02, 0.32],
      ),
    );
    b.brass(ball(0.03, 0), f.at([x + 0.11, y, z]));
    b.brass(box(), f.at([x + 0.05, y, z - 0.6], undefined, [0.02, 0.5, 0.12]), P.brassLight);
  });
  // Las rayas: columnas de marcas cada vez más largas bajo los relojes.
  for (let k = 0; k < 28; k++) {
    const length = 0.04 + k * 0.012;
    b.view(
      P.slateDark,
      box(),
      f.at([x + 0.04, -1.3 + (k % 14) * 0.2, TOP + 0.95 - Math.floor(k / 14) * 0.35], undefined, [
        0.01,
        0.02,
        length,
      ]),
    );
  }
  b.mark('INT_relojes', f, [x + 1.2, 0, TOP + 1.4], {
    clue_id: 'observatorio.relojes',
    kind: 'objeto',
  });
}

/** La mesa del centro, con sus taburetes y la carta del Consejo, abierta y doblada muchas veces. */
function councilLetter(b: ObsBuilder, f: Frame): void {
  const at: Triple = [-10.2, 0.1, TOP];
  b.solid(
    P.sandstoneShade,
    cylinder(0.75, 12),
    f.at([at[0], at[1], TOP + 0.76], undefined, [1, 1, 0.08]),
  );
  b.solid(
    P.slateDark,
    cylinder(0.12, 8),
    f.at([at[0], at[1], TOP + 0.38], undefined, [1, 1, 0.76]),
  );
  for (const a of [0.4, 2.5, 4.4]) {
    b.solid(
      P.slate,
      cylinder(0.22, 8),
      f.at(
        [at[0] + Math.cos(a) * 1.05, at[1] + Math.sin(a) * 1.05, TOP + 0.25],
        undefined,
        [1, 1, 0.5],
      ),
    );
  }
  b.view(
    P.paper,
    box(),
    f.at([at[0] + 0.1, at[1] - 0.15, TOP + 0.82], [0, 0, 0.3], [0.32, 0.42, 0.01]),
  );
  b.view(
    P.paper,
    box(),
    f.at([at[0] - 0.2, at[1] + 0.2, TOP + 0.83], [0, 0, -0.5], [0.3, 0.2, 0.012]),
  );
  b.view(
    P.seal,
    cylinder(0.05, 8),
    f.at([at[0] + 0.15, at[1] - 0.3, TOP + 0.835], undefined, [1, 1, 0.02]),
  );
  b.lamp(ball(0.08, 1), f.at([at[0] - 0.45, at[1] - 0.3, TOP + 0.95]));
  b.mark('INT_carta', f, [at[0] + 0.9, at[1] - 0.6, TOP + 1.2], {
    clue_id: 'observatorio.carta',
    kind: 'texto',
  });
}

/** La Sala de las Fluctuaciones entera. */
export function buildStudy(b: ObsBuilder, f: Frame): void {
  shell(b, f);
  recorder(b, f);
  plates(b, f);
  clocks(b, f);
  councilLetter(b, f);
}
