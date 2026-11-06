// El cuarto del turno del Observatorio (🟡 el aspecto): una habitación cerrada pegada a la cúpula, habitada
// (litera, estufa, libros, lámpara, el tablón del informe y, en el tejado, una antena que gira y el sensor de
// fluctuaciones, un aro que barre el cielo).
import { ball, box, cone, cylinder, pieceMatrix, torus, type Frame, type Triple } from './kit';
import { ObsBuilder, PALETTE as P } from './observatorioKit';

const TAU = Math.PI * 2;

/**
 * El cuarto del turno: una habitación cerrada pegada a la cúpula, a la que se entra por la puerta del este del
 * tambor (fuera no hay aire, así que nada habitado está a la intemperie). Dentro, su mesa, su litera, su estufa, los
 * cuadernos y el tablón del informe; en el tejado, una antena que gira y el sensor de fluctuaciones.
 */
export function buildAnnex(b: ObsBuilder, f: Frame): void {
  const top = 0.35;
  const wall = 0.3;
  const height = 2.5;
  const inner = 4.9; // por dentro llega hasta el tambor
  const far = 10.5;
  const length = far - inner;
  const cx = (inner + far) / 2;
  const roof = top + height;
  b.solid(P.sandstoneShade, box(), f.at([cx, 0, top - 0.3], undefined, [length + 0.2, 5.0, 0.6]));
  for (const side of [-1, 1]) {
    b.solid(
      P.sandstone,
      box(),
      f.at([cx, side * 2.35, top + height / 2], undefined, [length, wall, height]),
    );
  }
  b.solid(
    P.sandstone,
    box(),
    f.at([far + wall / 2, 0, top + height / 2], undefined, [wall, 5.0, height]),
  );
  b.solid(P.slate, box(), f.at([cx, 0, roof + 0.12], undefined, [length + 0.4, 5.2, 0.24]));
  b.view(P.sandstoneShade, box(), f.at([cx, 0, roof + 0.34], undefined, [length - 0.2, 4.6, 0.2]));
  // Ventanas de luz ámbar en las tres paredes (vistas desde fuera y desde dentro) y una lámpara colgada.
  for (const side of [-1, 1]) {
    b.lamp(box(), f.at([cx - 0.8, side * 2.52, top + 1.5], undefined, [1.2, 0.05, 0.7]));
    b.lamp(box(), f.at([cx + 1.6, side * 2.52, top + 1.5], undefined, [1.2, 0.05, 0.7]));
  }
  b.lamp(box(), f.at([far + 0.17, 0, top + 1.6], undefined, [0.05, 1.3, 0.7]));
  b.lamp(ball(0.12, 1), f.at([cx, 0, roof - 0.25]));
  // La mesa contra la pared del fondo, con papeles, tintero y lámpara.
  b.solid(P.slate, box(), f.at([far - 0.7, 0.4, top + 0.78], undefined, [0.8, 2.2, 0.08]));
  for (const y of [-0.6, 1.4]) {
    b.solid(P.slateDark, box(), f.at([far - 0.7, y, top + 0.37], undefined, [0.6, 0.1, 0.74]));
  }
  b.view(P.paper, box(), f.at([far - 0.7, 0.9, top + 0.84], [0, 0, 0.3], [0.35, 0.5, 0.03]));
  b.view(
    P.slateDark,
    cylinder(0.05, 6),
    f.at([far - 0.55, 0.1, top + 0.88], undefined, [1, 1, 0.1]),
  );
  b.lamp(ball(0.1, 1), f.at([far - 0.5, 1.3, top + 1.05]));
  b.solid(P.slateDark, box(), f.at([far - 1.9, 0.5, top + 0.25], [0, 0, 0.4], [0.5, 0.5, 0.5]));
  // La litera de la pared del norte, con su manta, y la estufa del rincón del sur con su brasa y su chimenea.
  b.solid(P.slate, box(), f.at([cx + 0.4, 1.75, top + 0.35], undefined, [2.2, 1.0, 0.12]));
  b.view(P.cloth, box(), f.at([cx + 0.5, 1.75, top + 0.45], undefined, [1.5, 0.95, 0.1]));
  b.view(P.clothLight, box(), f.at([cx - 0.4, 1.75, top + 0.5], undefined, [0.35, 0.8, 0.12]));
  b.solid(
    P.slateDark,
    cylinder(0.28, 8),
    f.at([inner + 1.4, -1.8, top + 0.45], undefined, [1, 1, 0.9]),
  );
  b.lamp(ball(0.09, 1), f.at([inner + 1.4 + 0.27, -1.8, top + 0.4]), P.amberSoft, 1.3);
  b.view(
    P.slateDark,
    cylinder(0.07, 6),
    f.at([inner + 1.4, -1.8, top + height + 0.9], undefined, [1, 1, 2.3]),
  );
  // Estantes con cuadernos de turno (lomos de colores) en la pared del sur.
  for (let row = 0; row < 2; row++) {
    b.solid(
      P.slate,
      box(),
      f.at([cx + 0.9, -2.05, top + 1.1 + row * 0.7], undefined, [1.6, 0.25, 0.05]),
    );
    for (let k = 0; k < 6; k++) {
      const tone = [P.cloth, P.brass, P.slateDark, P.paper][(k + row) % 4] ?? P.cloth;
      b.view(
        tone,
        box(),
        f.at([cx + 0.2 + k * 0.2, -2.05, top + 1.28 + row * 0.7], undefined, [0.13, 0.2, 0.32]),
      );
    }
  }
  // El tablón del informe, clavado a la pared del sur junto a los estantes, con sus hojas.
  b.view(P.slate, box(), f.at([cx - 1.1, -2.17, top + 1.5], undefined, [1.5, 0.06, 1.0]));
  const sheets: readonly Triple[] = [
    [-0.45, 0.2, 0.05],
    [0.05, 0.25, -0.04],
    [0.45, 0.1, 0.07],
    [-0.15, -0.25, -0.05],
  ];
  for (const [dx, dz, turn] of sheets) {
    b.view(
      P.paper,
      box(),
      f.at([cx - 1.1 + dx, -2.2, top + 1.5 + dz], [0, turn, 0], [0.4, 0.02, 0.5]),
    );
  }
  b.mark('INT_informe', f, [cx - 1.1, -1.5, top + 1.4], {
    clue_id: 'observatorio.informe',
    kind: 'texto',
  });
  // En el tejado: una antena con su plato que gira y una veleta con cazoletas.
  b.solid(
    P.slateDark,
    cylinder(0.07, 6),
    f.at([cx - 1.2, 1.2, roof + 0.44 + 1.2], undefined, [1, 1, 2.4]),
  );
  b.spinning('ANIM_antena', f, [cx - 1.2, 1.2, roof + 0.44 + 2.5], { spin: 0.5 }, (set) => {
    set.add(
      P.brassLight,
      cone(0.7, 0.05, 10),
      pieceMatrix([0, 0.2, 0], [-Math.PI / 2 + 0.4, 0, 0], [1, 1, 0.35]),
      'metal',
      { solid: false },
    );
    set.add(P.brass, cylinder(0.04, 5), pieceMatrix([0, 0.45, 0], [-Math.PI / 2, 0, 0]), 'metal', {
      solid: false,
    });
  });
  b.solid(
    P.slateDark,
    cylinder(0.05, 6),
    f.at([cx + 1.2, -1.3, roof + 0.44 + 1.0], undefined, [1, 1, 2.0]),
  );
  // El sensor de fluctuaciones: un aro de latón con tres bolas que barre el cielo sin parar (fuera no hay viento).
  b.spinning('ANIM_sensor', f, [cx + 1.2, -1.3, roof + 0.44 + 2.05], { spin: 1.6 }, (set) => {
    set.add(P.brass, torus(0.5, 0.025, 20, 4), pieceMatrix(), 'metal', { solid: false });
    for (let k = 0; k < 3; k++) {
      const a = (TAU * k) / 3;
      set.add(
        P.brass,
        box(),
        pieceMatrix([Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], [0, -a, 0], [0.5, 0.03, 0.03]),
        'metal',
        { solid: false },
      );
      set.add(
        P.amberSoft,
        ball(0.07, 0),
        pieceMatrix([Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]),
        'light',
        { solid: false, glow: 1.4, vary: 0 },
      );
    }
  });
}
