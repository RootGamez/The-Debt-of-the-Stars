// Las zonas del Laboratorio Oculto en la cara interior del Nudo (CONTEXTO_PLANETAS.md §8; 🟡 el aspecto): el
// Recibidor con la Puerta gemela, la Sala de Trabajo (pizarra y armario con la orden de silencio), el Banco del
// Contrapeso (la mesa partida), los escritorios del escéptico y de la investigadora, el Dormitorio sin techo y la
// cámara de frío donde estaba la Cámara (E4). Pasado de
// blender/scripts/arte_laboratorio.py con las mismas marcas (INT_, PASO_Dentro, SPAWN_Laboratorio, ANIM_reloj_mesa).
import { ball, box, cone, cylinder, pieceMatrix, type Frame, type Triple } from './kit';
import { buildBench } from './laboratorioBench';
import { buildColdChamber } from './laboratorioCold';
import { FLOOR, LabBuilder, PALETTE as P } from './laboratorioKit';
import {
  INNER_SITES,
  NUDO_LOCK,
  insideFrame,
  insideHeading,
  type InnerSiteId,
} from './laboratorioShape';

const TAU = Math.PI * 2;

/** El marco de una zona, mirando hacia otra (por donde se llega). */
function zone(id: InnerSiteId, facing?: InnerSiteId): Frame {
  const s = INNER_SITES[id];
  return insideFrame(s.lat, s.lon, facing ? insideHeading(s, INNER_SITES[facing]) : 0);
}

function recibidor(b: LabBuilder): void {
  const f = zone('recibidor');
  b.platform(f, 6.5, 6.5);
  // La gemela de dentro: también caída (E4). Encendida desde fuera, deja pasar en los dos sentidos.
  b.gate(b.inside, f, FLOOR, { lock: NUDO_LOCK, name: 'Dentro' });
  b.strata(f, 0, -2.4, 5.5, 1.1);
  b.lantern(b.inside, f, -2.7, 1.2);
  b.lantern(b.inside, f, 2.7, 1.2);
  b.mark('PASO_Dentro', f, [0, 0, FLOOR], { destino: 'PASO_Boca', cerradura: NUDO_LOCK });
  b.mark('SPAWN_Laboratorio', f, [0, 2.4, FLOOR + 1.0]);
}

function sala(b: LabBuilder): void {
  const f = zone('sala', 'recibidor');
  const s = b.inside;
  const z = FLOOR;
  b.platform(f, 7.5, 6.0);
  // La pizarra, de pie al fondo, de cara a quien llega, con una ecuación a medias.
  b.strata(f, 0, -2.7, 6.8, 1.6);
  for (const x of [-2.1, 2.1])
    b.solid(s, P.greyDark, box(), f.at([x, -2.15, z + 1.1], undefined, [0.1, 0.1, 2.2]));
  b.view(s, P.wood, box(), f.at([0, -2.15, z + 1.6], undefined, [4.4, 0.08, 2.0]));
  b.view(s, P.board, box(), f.at([0, -2.1, z + 1.6], undefined, [4.1, 0.06, 1.75]));
  const rows: readonly [number, readonly number[]][] = [
    [0.6, [0.5, 0.2, 0.9, 0.3, 0.5]],
    [0.2, [0.7, 0.4, 0.3, 0.8]],
    [-0.2, [0.5, 0.9, 0.2]],
    [-0.55, [0.4, 0.3]],
  ];
  for (const [dz, pieces] of rows) {
    let x = -1.8;
    for (const width of pieces) {
      b.view(
        s,
        P.chalk,
        box(),
        f.at([x + width / 2, -2.06, z + 1.6 + dz], undefined, [width, 0.02, 0.05]),
      );
      x += width + 0.16;
    }
  }
  b.view(
    s,
    P.chalk,
    cylinder(0.16, 10),
    f.at([0.9, -2.06, z + 1.15], [Math.PI / 2, 0, 0], [1, 1, 0.02]),
  );
  b.view(s, P.chalk, box(), f.at([-1.5, -1.95, z + 0.72], undefined, [0.5, 0.1, 0.03]));
  // La mesa larga con frascos, una caja abierta y papeles por el suelo.
  b.table(f, 1.4, 0.6, 2.6, 1.0);
  b.papers(f, 1.0, 0.5, z + 0.83, 3);
  for (let k = 0; k < 4; k++) {
    b.view(
      s,
      P.greenLight,
      cylinder(0.07, 6),
      f.at([2.0 + 0.18 * k, 0.75, z + 0.95], undefined, [1, 1, 0.24]),
    );
  }
  b.solid(s, P.wood, box(), f.at([-1.6, 1.0, z + 0.25], [0, 0, 0.3], [0.7, 0.5, 0.5]));
  b.view(s, P.wood, box(), f.at([-1.25, 1.2, z + 0.55], [0.9, 0, 0.3], [0.7, 0.04, 0.4]));
  b.papers(f, -0.4, 1.6, z + 0.01, 3, 0.6);
  // El armario con la orden de silencio: un sobre cerrado con sello rojo, apoyado encima.
  b.solid(s, P.grey, box(), f.at([-3.0, -1.0, z + 0.65], undefined, [0.7, 1.4, 1.3]));
  b.view(s, P.greenLight, box(), f.at([-2.64, -1.0, z + 0.65], undefined, [0.02, 0.05, 1.1]));
  b.view(s, P.paper, box(), f.at([-3.0, -1.0, z + 1.32], [0, 0, 0.2], [0.34, 0.46, 0.03]));
  b.view(s, P.seal, cylinder(0.06, 8), f.at([-3.0, -1.0, z + 1.35], undefined, [1, 1, 0.025]));
  b.lantern(s, f, 3.2, -1.6);
  b.lantern(s, f, -3.2, 1.8);
  b.mark('INT_pizarra', f, [0, -1.1, z + 1.3], { clue_id: 'lab.pizarra', kind: 'texto' });
  b.mark('INT_orden_silencio', f, [-2.2, -1.0, z + 1.1], {
    clue_id: 'lab.orden_silencio',
    kind: 'texto',
  });
}

/** El Banco del Contrapeso: la mesa partida de los dos (laboratorioBench.ts, E4). */
function banco(b: LabBuilder): void {
  buildBench(b, zone('banco', 'sala'));
}

function esceptico(b: LabBuilder): void {
  const f = zone('esceptico', 'sala');
  const s = b.inside;
  const z = FLOOR;
  b.platform(f, 4.5, 4.0);
  b.table(f, 0, -0.8, 1.8, 0.8);
  // La silla tumbada, papeles amontonados y la funda vacía de una grabadora.
  b.view(s, P.wood, box(), f.at([-1.1, 0.3, z + 0.28], [0, Math.PI / 2, 0.4], [0.5, 0.5, 0.06]));
  b.view(s, P.wood, box(), f.at([-1.35, 0.25, z + 0.1], [0.1, 0, 0.4], [0.06, 0.5, 0.6]));
  for (let k = 0; k < 5; k++) {
    b.view(
      s,
      P.paper,
      box(),
      f.at(
        [-0.4 + 0.08 * k, -0.8 + 0.05 * k, z + 0.83 + 0.012 * k],
        [0, 0, 0.3 * k - 0.4],
        [0.4, 0.5, 0.012],
      ),
    );
  }
  b.view(s, P.greyDark, box(), f.at([0.5, -0.85, z + 0.9], undefined, [0.5, 0.35, 0.16]));
  b.view(s, P.black, box(), f.at([0.5, -0.85, z + 0.99], undefined, [0.42, 0.27, 0.02]));
  // Un tablón con una carta del cielo y una flecha a lápiz (la corrección que nadie quiso oír).
  for (const x of [-0.9, 0.9])
    b.solid(s, P.greyDark, box(), f.at([x, -1.6, z + 0.9], undefined, [0.08, 0.08, 1.8]));
  b.view(s, P.wood, box(), f.at([0, -1.6, z + 1.4], undefined, [2.0, 0.06, 1.0]));
  b.view(s, P.paper, box(), f.at([0, -1.56, z + 1.4], undefined, [1.6, 0.02, 0.8]));
  for (let k = 0; k < 9; k++) {
    b.view(
      s,
      P.board,
      ball(0.025, 0),
      f.at([-0.6 + 0.16 * k, -1.54, z + 1.15 + 0.5 * ((k * 0.618) % 1)]),
    );
  }
  b.view(s, P.seal, box(), f.at([0.2, -1.54, z + 1.45], [0, 0.6, 0], [0.6, 0.01, 0.025]));
  b.lantern(s, f, 1.8, 0.8);
  b.mark('INT_notas_esceptico', f, [0, 0.1, z + 1.2], {
    clue_id: 'lab.notas_esceptico',
    kind: 'texto',
  });
}

function investigadora(b: LabBuilder): void {
  const f = zone('investigadora', 'cruce');
  const s = b.inside;
  const z = FLOOR;
  b.platform(f, 5.5, 4.5);
  b.table(f, 0, -0.9);
  // Silla echada hacia atrás, papeles, lámpara y el reloj de mesa (su aguja sigue a la burbuja del Contrapeso).
  b.solid(s, P.wood, box(), f.at([0.2, 0.1, z + 0.5], [0, 0, 0.3], [0.5, 0.5, 0.06]));
  b.view(s, P.wood, box(), f.at([0.3, 0.35, z + 0.85], [0.15, 0, 0.3], [0.5, 0.06, 0.6]));
  b.papers(f, -0.6, -1.0, z + 0.83, 4);
  b.view(s, P.brass, cylinder(0.1, 6), f.at([0.9, -1.1, z + 0.84], undefined, [1, 1, 0.04]));
  b.view(s, P.brass, cylinder(0.02, 4), f.at([0.9, -1.1, z + 1.07], undefined, [1, 1, 0.45]));
  b.view(s, P.brass, cone(0.2, 0.06, 8), f.at([0.9, -1.1, z + 1.3], undefined, [1, 1, 0.2]));
  b.lamp(s, ball(0.07, 1), f.at([0.9, -1.1, z + 1.25]));
  const clock: Triple = [0.2, -0.75, z + 0.84];
  b.view(s, P.white, cylinder(0.2, 12), f.at(clock, undefined, [1, 1, 0.05]));
  b.view(
    s,
    P.grey,
    cylinder(0.2, 12),
    f.at([clock[0], clock[1], clock[2] - 0.02], undefined, [1.1, 1.1, 0.03]),
  );
  for (let k = 0; k < 12; k++) {
    const a = (TAU * k) / 12;
    b.view(
      s,
      P.board,
      box(),
      f.at(
        [clock[0] + Math.cos(a) * 0.16, clock[1] + Math.sin(a) * 0.16, clock[2] + 0.03],
        [0, 0, a],
        [0.04, 0.012, 0.01],
      ),
    );
  }
  // La aguja gira con la burbuja del Contrapeso (E2): deprisa mientras está en su Banco; si se lo llevan, se calma.
  b.spinning(
    'ANIM_reloj_mesa',
    f.point([clock[0], clock[1], clock[2] + 0.04]),
    f.rotation(),
    0.05,
    (set) => {
      set.add(
        P.board,
        box(),
        pieceMatrix([0, 0, -0.075], undefined, [0.015, 0.012, 0.15]),
        'stone',
        { solid: false },
      );
    },
    true,
  );
  // Estantería con libros y cuadernos.
  b.solid(s, P.wood, box(), f.at([-2.2, -1.2, z + 0.9], undefined, [0.5, 1.4, 1.8]));
  const spines = [P.green, P.seal, P.blanket, P.sandstone, P.grey];
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 5; k++) {
      b.view(
        s,
        spines[(row + k) % 5] ?? P.green,
        box(),
        f.at(
          [-1.98, -1.7 + 0.24 * k, z + 0.45 + 0.55 * row],
          [0.12 * (k % 2), 0, 0],
          [0.06, 0.18, 0.4],
        ),
      );
    }
  }
  b.lantern(s, f, 2.4, 0.6);
  b.mark('INT_notas_investigadora', f, [0, 0.6, z + 1.2], {
    clue_id: 'lab.notas_investigadora',
    kind: 'texto',
  });
}

function dormitorio(b: LabBuilder): void {
  const f = zone('dormitorio', 'cruce');
  const s = b.inside;
  const z = FLOOR;
  b.platform(f, 5.5, 5.0);
  // Un cuarto sin techo (dentro del Nudo no llueve), con la puerta hacia el sendero (+Y).
  const height = 1.7;
  b.solid(s, P.green, box(), f.at([0, -2.3, z + height / 2], undefined, [5.0, 0.2, height]));
  for (const x of [-2.4, 2.4])
    b.solid(s, P.green, box(), f.at([x, 0, z + height / 2], undefined, [0.2, 4.6, height]));
  for (const x of [-1.6, 1.6])
    b.solid(s, P.green, box(), f.at([x, 2.3, z + height / 2], undefined, [1.8, 0.2, height]));
  // Un remate claro sobre los muros (no un techo: deja ver la semilla).
  for (const [x, y, w, d] of [
    [0, -2.3, 5.1, 0.3],
    [-2.4, 0, 0.3, 4.9],
    [2.4, 0, 0.3, 4.9],
    [-1.6, 2.3, 1.9, 0.3],
    [1.6, 2.3, 1.9, 0.3],
  ] as const) {
    b.view(s, P.greenLight, box(), f.at([x, y, z + height + 0.05], undefined, [w, d, 0.1]));
  }
  b.bed(f, -1.5, -0.9, true);
  b.bed(f, 1.5, -0.9, false);
  b.solid(s, P.wood, box(), f.at([0, -1.7, z + 0.28], undefined, [0.5, 0.5, 0.55]));
  b.view(s, P.white, cylinder(0.04, 6), f.at([0, -1.7, z + 0.67], undefined, [1, 1, 0.24]));
  b.lamp(s, ball(0.05, 1), f.at([0, -1.7, z + 0.84]));
  b.view(s, P.grey, box(), f.at([-0.9, 0.5, z + 0.05], [0, 0, 0.5], [0.3, 0.12, 0.1]));
  b.view(s, P.wood, box(), f.at([1.5, 0.7, z + 0.18], undefined, [0.7, 0.45, 0.35]));
  b.lantern(s, f, 2.9, 2.9);
  b.mark('INT_dormitorio', f, [0, 0.8, z + 1.0], { clue_id: 'lab.dormitorio', kind: 'objeto' });
}

/** La cámara de frío, donde estaba la Cámara (que se fue al Taller): ella, congelada (laboratorioCold.ts, E4). */
function camara(b: LabBuilder): void {
  buildColdChamber(b, zone('camara', 'cruce'));
}

/** Las zonas de la cara interior. */
export function buildRooms(b: LabBuilder): void {
  recibidor(b);
  sala(b);
  banco(b);
  esceptico(b);
  investigadora(b);
  dormitorio(b);
  camara(b);
}
