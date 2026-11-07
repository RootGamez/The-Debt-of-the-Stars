// La Cisterna del Fondo del Cañón (P4) y la Sala Cerrada con sus péndulos (P3) del Archivo (plan de historia y puzzles
// físicos, T7; 🟡): la pila de piedra con sus tres marcas y los montones de bloques y tablones; la cámara sellada del
// pasillo de los cajones, con su viga de cobre, sus tres fuentes y el anillo de su trampilla (una Puerta plegada con
// cerradura). El agua, la barcaza, los bloques y los péndulos se mueven: los dibuja render/archivoDepthsView.ts.
import type { ARCHIVO_PALETTE, MarkerSpec } from './archivoGallery';
import { PENDULUMS } from '../../puzzles/pendulums';
import { CISTERN } from '../../puzzles/cistern';
import { DEPTHS } from '../../game/depthsPlay';
import {
  BASIN,
  BEAM,
  CELL,
  CELL_AT,
  CELL_RING,
  CELL_SOURCES,
  CISTERN_AT,
  PILE_HOMES,
  TRAPDOOR_AT,
  pendulumX,
  waterHeight,
} from './archivoDepthsShape';
import { box, cylinder, torus, type Frame, type PieceSet } from './kit';

export interface DepthsContext {
  pieces: PieceSet;
  palette: typeof ARCHIVO_PALETTE;
  markers: MarkerSpec[];
  at: (lat: number, lon: number, heading?: number) => Frame;
}

export function buildArchivoDepths(ctx: DepthsContext): void {
  cistern(ctx);
  piles(ctx);
  cell(ctx);
  trapdoor(ctx);
}

/** La pila de piedra con sus tres marcas de oro en la pared. */
function cistern({ pieces: v, palette: P, markers, at }: DepthsContext): void {
  const f = at(CISTERN_AT.lat, CISTERN_AT.lon);
  const sides = 14;
  // La pared de la pila, en tramos, y su fondo.
  v.add(
    P.pearlShade,
    cylinder(BASIN.radius + 0.25, 16),
    f.at([0, 0, 0.08], undefined, [1, 1, 0.16]),
  );
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * Math.PI * 2;
    const x = Math.cos(a) * (BASIN.radius + 0.12);
    const y = Math.sin(a) * (BASIN.radius + 0.12);
    v.add(
      P.pearlShade,
      box(),
      f.at(
        [x, y, BASIN.height / 2],
        [0, 0, a],
        [0.24, ((2 * Math.PI * BASIN.radius) / sides) * 1.05, BASIN.height],
      ),
    );
  }
  // Las tres marcas, dentro de la pared, a la altura del agua con 3, 5 y 7 partes de piedra.
  for (const mark of CISTERN.marks) {
    v.add(
      P.gold,
      box(),
      f.at([BASIN.radius - 0.02, 0, waterHeight(mark)], undefined, [0.05, 0.45, 0.05]),
      'metal',
      { solid: false, vary: 0 },
    );
  }
  // El aliviadero: una boca en el borde, por la que rebosa.
  v.add(
    P.ink,
    box(),
    f.at([0, -BASIN.radius - 0.12, BASIN.height - 0.05], undefined, [0.3, 0.26, 0.1]),
    'stone',
    {
      solid: false,
      vary: 0,
    },
  );
  markers.push({
    name: 'INT_cisterna',
    frame: f,
    at: [0, 0, BASIN.height + 0.6],
    props: { clue_id: DEPTHS.cistern, kind: 'observacion' },
  });
}

/** Los cuatro montones: bloques de tres tamaños y tablones, cada uno en su base de piedra. */
function piles({ pieces: v, palette: P, markers, at }: DepthsContext): void {
  for (const [id, home] of Object.entries(PILE_HOMES)) {
    const f = at(home.lat, home.lon);
    v.add(P.pearlShade, box(), f.at([0, 0, 0.18], undefined, [1.1, 0.8, 0.36]));
    markers.push({
      name: `INT_monton_${id}`,
      frame: f,
      at: [0, 0, 1.0],
      props: { clue_id: DEPTHS.piles[id as keyof typeof DEPTHS.piles], kind: 'objeto' },
    });
  }
}

/** La Sala Cerrada: una cámara sellada con la viga de los péndulos y las tres fuentes del secreto. */
function cell({ pieces: v, palette: P, markers, at }: DepthsContext): void {
  const f = at(CELL_AT.lat, CELL_AT.lon, 90);
  const { half, end, wall, height } = CELL;
  const tall = height;
  for (const side of [-1, 1]) {
    v.add(
      P.pearlShade,
      box(),
      f.at([side * (half + wall / 2), 0, tall / 2], undefined, [wall, end * 2 + wall * 2, tall]),
    );
    v.add(
      P.pearlShade,
      box(),
      f.at([0, side * (end + wall / 2), tall / 2], undefined, [half * 2 + wall * 2, wall, tall]),
    );
  }
  v.add(
    P.rockDark,
    box(),
    f.at([0, 0, tall + 0.15], undefined, [half * 2 + wall * 2, end * 2 + wall * 2, 0.3]),
  );
  // La viga de cobre y el cerrojo, que mantiene la trampilla trabada.
  v.add(
    '#B87333',
    box(),
    f.at([0, BEAM.y, BEAM.z + 0.1], undefined, [half * 2 - 0.2, 0.14, 0.14]),
    'metal',
    {
      solid: false,
      vary: 0,
    },
  );
  for (const x of [-half + 0.2, half - 0.2]) {
    v.add(
      P.steelDark,
      box(),
      f.at([x, BEAM.y, (BEAM.z + 0.1 + tall) / 2], undefined, [0.1, 0.1, tall - BEAM.z - 0.1]),
      'metal',
      {
        solid: false,
      },
    );
  }
  // Una lámpara sola, en una esquina.
  v.add(
    P.light,
    cylinder(0.1, 6),
    f.at([-half + 0.5, end - 0.6, tall - 0.5], undefined, [1, 1, 0.1]),
    'light',
    {
      glow: 1.4,
      vary: 0,
      solid: false,
    },
  );
  // El atril del informe original: tres láminas de vidrio de pie.
  const { informe, peticion, modelo, viga } = CELL_SOURCES;
  v.add(P.pearlShade, box(), f.at([informe[0], informe[1], 0.5], undefined, [0.7, 0.5, 1.0]));
  for (let k = 0; k < 3; k++) {
    v.add(
      P.lightCold,
      box(),
      f.at([informe[0] - 0.2 + k * 0.2, informe[1], 1.12], [0, -0.2, 0], [0.012, 0.42, 0.34]),
      'light',
      { glow: 0.5, vary: 0, solid: false },
    );
  }
  // La petición, clavada en la pared con su sello.
  v.add(
    P.paper,
    box(),
    f.at([peticion[0], peticion[1] - 0.18, peticion[2]], undefined, [0.9, 0.02, 1.1]),
    'stone',
    {
      solid: false,
      vary: 0,
    },
  );
  v.add(
    '#B03A3A',
    cylinder(0.12, 8),
    f.at(
      [peticion[0] + 0.25, peticion[1] - 0.2, peticion[2] - 0.35],
      [Math.PI / 2, 0, 0],
      [1, 1, 0.04],
    ),
    'metal',
    {
      solid: false,
      vary: 0,
    },
  );
  // El modelo de la red: una viga pequeña con muchos péndulos diminutos y uno colgado aparte.
  v.add(P.pearlShade, box(), f.at([modelo[0], modelo[1], 0.45], undefined, [0.9, 0.6, 0.9]));
  v.add(
    P.steelDark,
    box(),
    f.at([modelo[0], modelo[1], 1.0], undefined, [0.85, 0.04, 0.04]),
    'metal',
    { solid: false },
  );
  for (let k = 0; k < 14; k++) {
    v.add(
      P.gold,
      box(),
      f.at([modelo[0] - 0.4 + k * 0.06, modelo[1], 0.92 - (k % 3) * 0.02], undefined, [
        0.008,
        0.008,
        0.16 + (k % 3) * 0.03,
      ]),
      'metal',
      { solid: false, vary: 0 },
    );
  }
  v.add(
    P.lightCold,
    box(),
    f.at([modelo[0] + 0.5, modelo[1], 0.82], undefined, [0.02, 0.02, 0.2]),
    'light',
    {
      glow: 1.2,
      vary: 0,
      solid: false,
    },
  );
  const point = (
    name: string,
    id: string,
    kind: string,
    p: readonly [number, number, number],
    props = {},
  ): void => {
    markers.push({
      name,
      frame: f,
      at: [p[0], p[1], p[2]],
      props: { clue_id: id, kind, ...props },
    });
  };
  point('INT_informe_original', 'archivo.informe_original', 'texto', informe);
  point('INT_peticion', 'archivo.peticion', 'texto', peticion);
  point('INT_modelo_red', 'archivo.modelo_red', 'observacion', modelo);
  point('INT_viga', DEPTHS.beam, 'observacion', viga);
  for (let k = 1; k <= PENDULUMS.count; k++) {
    point(
      `INT_pendulo_${String(k)}`,
      DEPTHS.pendulums,
      'objeto',
      [pendulumX(k - 1), BEAM.y - 0.45, 1.7],
      { pendulo: k },
    );
  }
  // La puerta de vuelta: el anillo gemelo de la trampilla, en el extremo este de la cámara, mirando adentro.
  ringPieces(v, P, f, CELL_RING, false);
  // Se sale mirando hacia dentro de la cámara: el marco del anillo gira media vuelta respecto al de la cámara.
  const inward = at(CELL_AT.lat, CELL_AT.lon, 270);
  markers.push({
    name: 'PASO_Camara',
    frame: inward,
    at: [CELL_RING[0], -CELL_RING[1], CELL_RING[2]],
    props: { destino: 'PASO_Trampilla' },
  });
}

/** Un anillo de Puerta plegada: dos postes y un aro, como el del Taller. */
function ringPieces(
  v: PieceSet,
  P: typeof ARCHIVO_PALETTE,
  f: Frame,
  at: readonly [number, number, number],
  glowing: boolean,
): void {
  const [x, y, z] = at;
  for (const side of [-1, 1]) {
    v.add(
      P.steelDark,
      box(),
      f.at([x + side * 2.1, y, z + 1.7], undefined, [0.5, 0.5, 3.4]),
      'metal',
    );
  }
  v.add(P.gold, torus(1.6, 0.18, 28, 6), f.at([x, y, z + 1.75]), 'metal', { solid: false });
  if (glowing) {
    v.add(P.lightCold, torus(1.38, 0.05, 28, 4), f.at([x, y, z + 1.75]), 'light', {
      glow: 1.6,
      vary: 0,
      solid: false,
    });
  }
}

/** El anillo de la trampilla, al pie del Índice: solo deja pasar con los péndulos desacoplados. */
function trapdoor({ pieces: v, palette: P, markers, at }: DepthsContext): void {
  const f = at(TRAPDOOR_AT.lat, TRAPDOOR_AT.lon, 90);
  ringPieces(v, P, f, [0, 0, 0], true);
  markers.push({
    name: 'PASO_Trampilla',
    frame: f,
    at: [0, 0, 0],
    props: { destino: 'PASO_Camara', cerradura: DEPTHS.lock },
  });
}
