// El reloj del portal caído del Nudo (hito E4 de docs/plan-finales.md §3.2; ✅ que la huida apagó la Puerta y solo se
// enciende desde fuera; 🟡 que se enciende poniendo en hora este reloj). Está en el muelle de la cáscara, de cara a
// quien se posa: un poste de piedra negra con una esfera de doce horas, una aguja que corre deprisa (marca la hora de
// dentro, donde el tiempo corre ×5) y dos ruedas de latón, minutos y segundos. Encima, la luz de su hora: parpadea
// mientras la Puerta está caída (render/fallenGateView.ts). Las reglas están en game/fallenGate.ts.
import { Quaternion, Vector3 } from 'three';
import { ball, box, cylinder, pieceMatrix, torus, type Frame } from './kit';
import { LabBuilder, PALETTE as P } from './laboratorioKit';
import { NUDO_LOCK } from './laboratorioShape';

const TAU = Math.PI * 2;
/** Dónde va el poste en el muelle (m, en su marco: +Y hacia la Puerta) y a qué altura la esfera. */
const POST = { y: 2.55, face: 2.05 } as const;
/** La aguja de dentro: deprisa (rad/s), para que se vea que no marca la hora del Nudo. */
const FAST_HAND = 0.55;

/** El poste y su esfera, mirando hacia el centro del muelle (−Y). */
function post(b: LabBuilder, m: Frame, top: number): void {
  const s = b.outside;
  const y = POST.y;
  b.solid(s, P.sandstoneDark, box(), m.at([0, y, top + 0.12], undefined, [1.0, 0.7, 0.24]));
  b.solid(s, P.shell, box(), m.at([0, y, top + 1.0], undefined, [0.46, 0.34, 1.6]));
  for (const z of [0.45, 1.55]) {
    s.add(P.brass, box(), m.at([0, y, top + z], undefined, [0.5, 0.38, 0.05]), 'metal');
  }
  // La esfera: caja redonda de piedra, aro de latón, cara blanca y doce horas (la de arriba, más larga).
  const face = top + POST.face;
  const axisY: [number, number, number] = [Math.PI / 2, 0, 0];
  b.solid(s, P.shell, cylinder(0.46, 32), m.at([0, y, face], axisY, [1, 1, 0.26]));
  s.add(P.brass, torus(0.44, 0.035, 40, 6), m.at([0, y - 0.13, face]), 'metal');
  b.view(s, P.white, cylinder(0.4, 32), m.at([0, y - 0.135, face], axisY, [1, 1, 0.01]));
  for (let k = 0; k < 12; k++) {
    const a = Math.PI / 2 - (TAU * k) / 12;
    const long = k % 3 === 0 ? 0.09 : 0.05;
    b.view(
      s,
      P.board,
      box(),
      m.at(
        [Math.cos(a) * (0.34 - long / 2), y - 0.145, face + Math.sin(a) * (0.34 - long / 2)],
        [0, Math.PI / 2 - a, 0],
        [0.02, 0.01, long],
      ),
    );
  }
  // La aguja de las horas, quieta en una hora que no es.
  b.view(
    s,
    P.board,
    box(),
    m.at([0.07, y - 0.15, face + 0.07], [0, -Math.PI / 4, 0], [0.025, 0.01, 0.2]),
  );
  b.view(s, P.brass, cylinder(0.03, 12), m.at([0, y - 0.155, face], axisY, [1, 1, 0.02]));
}

/** Las dos ruedas del costado (minutos, la grande; segundos, la pequeña). */
function wheels(b: LabBuilder, m: Frame, top: number): void {
  const s = b.outside;
  const sideX: [number, number, number] = [0, 0, Math.PI / 2];
  for (const [radius, z] of [
    [0.17, 1.25],
    [0.12, 0.82],
  ] as const) {
    s.add(P.brass, torus(radius, 0.025, 28, 6), m.at([0.3, POST.y, top + z], sideX), 'metal');
    s.add(
      P.brass,
      cylinder(0.04, 12),
      m.at([0.27, POST.y, top + z], [0, Math.PI / 2, 0], [1, 1, 0.08]),
      'metal',
    );
    for (let k = 0; k < 4; k++) {
      const a = (TAU * k) / 4 + 0.3;
      s.add(
        P.brass,
        box(),
        m.at(
          [0.3, POST.y - (Math.sin(a) * radius) / 2, top + z + (Math.cos(a) * radius) / 2],
          [a, 0, 0],
          [0.015, 0.015, radius],
        ),
        'metal',
      );
    }
  }
}

/** La aguja de dentro (gira deprisa) y la luz de la hora, encima del poste. */
function liveParts(b: LabBuilder, m: Frame, top: number): void {
  const faceAxis = m
    .rotation()
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2));
  b.spinning(
    'ANIM_reloj_puerta',
    m.point([0, POST.y - 0.16, top + POST.face]),
    faceAxis,
    FAST_HAND,
    (set) => {
      set.add(P.seal, box(), pieceMatrix([0, 0, -0.15], undefined, [0.02, 0.01, 0.3]), 'stone', {
        solid: false,
      });
    },
  );
  b.view(
    b.outside,
    P.brass,
    cylinder(0.06, 16),
    m.at([0, POST.y, top + 2.6], undefined, [1, 1, 0.1]),
  );
  b.part(
    'laboratorio_Reloj_Puerta_Hora',
    ball(0.09, 2),
    m.at([0, POST.y, top + 2.72]),
    {
      color: P.amber,
      glow: 1.5,
    },
    { fallen_lock: NUDO_LOCK, fallen_part: 'blink' },
  );
}

/** El reloj del portal en el muelle de la cáscara, con su marca de lectura (`lab.reloj_puerta`). */
export function dockClock(b: LabBuilder, m: Frame, top: number): void {
  post(b, m, top);
  wheels(b, m, top);
  liveParts(b, m, top);
  b.mark('INT_reloj_puerta', m, [0, POST.y - 0.7, top + 1.5], {
    clue_id: 'lab.reloj_puerta',
    kind: 'observacion',
  });
}
