// Las estructuras fijas de los dos bancos de pruebas (plan de historia y puzzles físicos, T8; 🟡): el poste y la base
// de la Balanza del Contrapeso (la viga que se inclina, la maqueta y las pesas las dibuja render/benchView.ts), los
// pedestales de las tres pesas, la placa de bronce de la Fundición con sus seis agujeros y la placa del motor viejo
// junto a la palanca de la Sala del Motor. Funciones sueltas que reciben lo que necesitan de cada constructor.
import { BALANCE } from '../../puzzles/balance';
import { PLATE } from '../../puzzles/chladni';
import {
  BALANCE_AT,
  BEAM_HEIGHT,
  HOLE_MARK_LIFT,
  MEASURE,
  NOTCH_MARK_HEIGHT,
  PLATE_AT,
  PLATE_SIZE,
  PLATE_TOP,
  WEIGHT_HOMES,
  WEIGHT_MARK_HEIGHT,
  holeOffset,
} from './benchShape';
import { box, cylinder, type Frame, type PieceSet, type Triple } from './kit';
import { BENCH } from '../../game/benchPlay';

type Mark = (
  name: string,
  frame: Frame,
  at: Triple,
  props?: Record<string, string | number>,
) => void;

export interface BenchColors {
  post: string;
  base: string;
  accent: string;
  plate: string;
  hole: string;
}

/** La Balanza del Contrapeso y los pedestales de sus pesas, en el marco de la isla de la Cuna. */
export function buildBalance(v: PieceSet, f: Frame, mark: Mark, c: BenchColors): void {
  const { x, y } = BALANCE_AT;
  v.add(c.base, box(), f.at([x, y, 0.1], undefined, [1.2, 1.0, 0.2]), 'metal');
  v.add(
    c.post,
    box(),
    f.at([x, y, BEAM_HEIGHT / 2], undefined, [0.18, 0.18, BEAM_HEIGHT]),
    'metal',
  );
  for (let notch = 1; notch <= BALANCE.notches; notch++) {
    mark(`INT_muesca_${String(notch)}`, f, [x + notch * MEASURE, y, NOTCH_MARK_HEIGHT], {
      clue_id: BENCH.balance,
      kind: 'objeto',
      muesca: notch,
    });
  }
  for (const weight of [1, 2, 3] as const) {
    const [wx, wy] = WEIGHT_HOMES[weight];
    v.add(c.base, cylinder(0.26, 8), f.at([wx, wy, 0.35], undefined, [1, 1, 0.7]));
    mark(`INT_pesa_${String(weight)}`, f, [wx, wy, WEIGHT_MARK_HEIGHT], {
      clue_id: BENCH.weights[weight],
      kind: 'objeto',
    });
  }
}

/** La placa que canta: un pie, la tapa cuadrada de bronce y seis agujeros con su marca. */
export function buildPlate(v: PieceSet, f: Frame, mark: Mark, c: BenchColors): void {
  const { x, y } = PLATE_AT;
  v.add(
    c.post,
    cylinder(0.18, 8),
    f.at([x, y, PLATE_TOP / 2 - 0.05], undefined, [1, 1, PLATE_TOP - 0.1]),
    'metal',
  );
  v.add(
    c.plate,
    box(),
    f.at([x, y, PLATE_TOP - 0.03], undefined, [PLATE_SIZE, PLATE_SIZE, 0.06]),
    'metal',
  );
  for (let hole = 1; hole <= PLATE.holes; hole++) {
    const [dx, dy] = holeOffset(hole);
    v.add(
      c.hole,
      cylinder(0.06, 8),
      f.at([x + dx, y + dy, PLATE_TOP + 0.005], undefined, [1, 1, 0.02]),
      'metal',
      {
        solid: false,
        vary: 0,
      },
    );
    mark(`INT_placa_${String(hole)}`, f, [x + dx, y + dy, PLATE_TOP + HOLE_MARK_LIFT], {
      clue_id: BENCH.plate,
      kind: 'observacion',
      agujero: hole,
    });
  }
  v.add(
    c.accent,
    box(),
    f.at([x, y - PLATE_SIZE / 2 - 0.02, PLATE_TOP - 0.03], undefined, [PLATE_SIZE, 0.02, 0.06]),
    'metal',
    {
      solid: false,
      vary: 0,
    },
  );
}

/** La placa del motor viejo, en un poste junto a la palanca (en el marco de la palanca). */
export function buildMotorPlate(v: PieceSet, f: Frame, mark: Mark, c: BenchColors): void {
  v.add(c.post, box(), f.at([1.4, -0.4, 0.55], undefined, [0.1, 0.1, 1.1]), 'metal');
  v.add(c.plate, box(), f.at([1.4, -0.44, 1.1], [0.4, 0, 0], [0.7, 0.04, 0.45]), 'metal', {
    solid: false,
  });
  mark('INT_placa_motor', f, [1.4, -0.7, 1.2], { clue_id: 'cicatriz.placa_motor', kind: 'texto' });
}
