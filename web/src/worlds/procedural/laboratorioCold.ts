// La cámara de frío, donde estaba la Cámara (hito E4 de docs/plan-finales.md §6; ✅ que ella está aquí, congelada
// desde la huida; 🟡 el aspecto). Sobre el estrado, dos anillos cruzados se clavan en la escarcha como dos arcos; bajo
// ellos, el lecho: un banco de piedra helada con una losa recostada detrás, con el signo de ella (un rombo con un
// punto) tallado. Ella espera de pie delante de la losa, cubierta de escarcha (character/absent*.ts, pose `frozen`).
// Al lado, la consola con la rueda de latón y cuatro luces: se calienta por pasos (game/scientist.ts).
//
// Lo que el juego mueve va suelto (`b.extras`): el ancla de ella (`laboratorio_Cientifica`), las cuatro luces de los
// pasos (`lab_bed_step`) y la neblina de escarcha (`laboratorio_Neblina`), que se apaga con el calor.
import { Object3D, Quaternion, Vector3, type Matrix4 } from 'three';
import { ball, box, cone, cylinder, Frame, pieceMatrix, torus, type Triple } from './kit';
import { DEFAULT_SEAT } from '../../character/absentPoses';
import { FLOOR, LabBuilder, PALETTE as P } from './laboratorioKit';

export const SCIENTIST_ANCHOR = 'laboratorio_Cientifica';
export const FROST_MIST = 'laboratorio_Neblina';
/** Cuántas luces tiene la consola: una por paso (game/scientist.ts, `COLD_BED.steps`). */
export const BED_STEP_LIGHTS = 4;

const TAU = Math.PI * 2;
/** La cara de arriba del estrado: allí pisa ella. */
const DAIS = FLOOR + 0.2;
/** El asiento del lecho (DEFAULT_SEAT.slumped de absentPoses.ts) y dónde se sienta (m, hacia −Y). */
const SEAT = { height: DEFAULT_SEAT.slumped, y: -0.45 } as const;
/** Los dos anillos: radio, grosor y la altura de su centro sobre el estrado (se hunden en él como arcos). */
const RING = { radius: 2.2, tube: 0.11, centre: 1.3 } as const;
/** A qué altura de la losa (m, desde su centro) va el signo: por encima de su cabeza, que se vea. */
const SIGN_HEIGHT = 1.15;
/** La consola con la rueda, a un lado del estrado (m, marco de la zona). */
const CONSOLE: Triple = [1.75, 1.35, FLOOR];

/** Un número entre 0 y 1 que siempre sale igual para `k` (la escarcha no cambia de una carga a otra). */
const hash = (k: number): number => {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Un racimo de cristales de hielo alrededor de `at`, de pie sobre la superficie. */
function crystals(
  b: LabBuilder,
  f: Frame,
  at: Triple,
  count: number,
  size: number,
  seed: number,
): void {
  for (let k = 0; k < count; k++) {
    const a = TAU * hash(seed + k);
    const r = size * 0.9 * hash(seed + k + 50);
    const tall = size * (0.6 + 1.4 * hash(seed + k + 90));
    const lean: Triple = [(hash(seed + k + 7) - 0.5) * 0.7, (hash(seed + k + 13) - 0.5) * 0.7, a];
    const p: Triple = [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, at[2] + tall * 0.45];
    const color = k % 3 === 0 ? P.frost : P.ice;
    b.view(b.inside, color, cone(size * 0.22, 0, 6), f.at(p, lean, [1, 1, tall]));
  }
}

/** El estrado helado: piedra, escarcha encima y grietas azules que salen del centro. */
function dais(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  b.solid(s, P.sandstone, cylinder(2.6, 64), f.at([0, 0, FLOOR + 0.1], undefined, [1, 1, 0.2]));
  s.add(P.brass, torus(2.6, 0.03, 96, 6), f.at([0, 0, DAIS - 0.01], [Math.PI / 2, 0, 0]), 'metal');
  b.view(s, P.frost, cylinder(2.35, 64), f.at([0, 0, DAIS + 0.004], undefined, [1, 1, 0.01]));
  for (let k = 0; k < 14; k++) {
    const a = TAU * hash(k + 200);
    const length = 0.5 + 1.3 * hash(k + 230);
    const from = 0.35 + 0.4 * hash(k + 260);
    const r = from + length / 2;
    b.view(
      s,
      P.iceDeep,
      box(),
      f.at([Math.cos(a) * r, Math.sin(a) * r, DAIS + 0.011], [0, 0, a], [length, 0.018, 0.004]),
    );
  }
}

/** Uno de los dos anillos, girado `turn` sobre la vertical: piedra, dos bandas de latón y las horas en frío. */
function ring(b: LabBuilder, f: Frame, turn: number): void {
  const s = b.inside;
  const base = f.at([0, 0, DAIS + RING.centre], [0, 0, turn]);
  const at = (m: Matrix4): Matrix4 => base.clone().multiply(m);
  b.view(s, P.sandstoneDark, torus(RING.radius, RING.tube, 160, 14), base);
  for (const dy of [-1, 1]) {
    const band = pieceMatrix([0, dy * RING.tube * 0.9, 0]);
    s.add(P.brass, torus(RING.radius, 0.022, 160, 6), at(band), 'metal');
  }
  for (let k = 0; k < 24; k++) {
    const a = (TAU * k) / 24;
    // Solo las horas que quedan por encima de la escarcha.
    if (Math.sin(a) * RING.radius < -RING.centre + 0.25) continue;
    const r = RING.radius - RING.tube - 0.01;
    const mark = pieceMatrix(
      [Math.cos(a) * r, 0, Math.sin(a) * r],
      [0, Math.PI / 2 - a, 0],
      [0.05, 0.05, 0.14],
    );
    b.glowCold(box(), at(mark));
  }
  // Donde el anillo entra en el estrado, la escarcha trepa por él.
  const foot = Math.sqrt(RING.radius ** 2 - RING.centre ** 2);
  for (const side of [-1, 1]) {
    const x = Math.cos(turn) * foot * side;
    const y = Math.sin(turn) * foot * side;
    crystals(b, f, [x, y, DAIS], 9, 0.22, Math.round(turn * 100) + side * 17);
  }
}

/** El rombo con el punto de ella, tallado en la cara de la losa (`slab`: su marco, sin escala). */
function herSign(b: LabBuilder, slab: Matrix4, face: number): void {
  const w = 0.17;
  const h = 0.24;
  const edges: readonly [number, number, number, number][] = [
    [0, h, w, 0],
    [w, 0, 0, -h],
    [0, -h, -w, 0],
    [-w, 0, 0, h],
  ];
  for (const [x0, z0, x1, z1] of edges) {
    const turn = Math.atan2(-(z1 - z0), x1 - x0);
    const m = pieceMatrix(
      [(x0 + x1) / 2, face, SIGN_HEIGHT + (z0 + z1) / 2],
      [0, turn, 0],
      [Math.hypot(x1 - x0, z1 - z0), 0.012, 0.022],
    );
    b.view(b.inside, P.iceDeep, box(), slab.clone().multiply(m));
  }
  const dot = pieceMatrix([0, face, SIGN_HEIGHT], [Math.PI / 2, 0, 0], [1, 1, 0.012]);
  b.view(b.inside, P.iceDeep, cylinder(0.035, 20), slab.clone().multiply(dot));
}

/** El lecho: el banco helado donde se sentará y la losa recostada detrás, con su signo. */
function bed(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  const seatTop = DAIS + SEAT.height;
  b.solid(
    s,
    P.iceDeep,
    box(),
    f.at([0, SEAT.y - 0.05, DAIS + SEAT.height / 2], undefined, [1.3, 0.5, SEAT.height]),
  );
  b.view(
    s,
    P.frost,
    box(),
    f.at([0, SEAT.y - 0.05, seatTop + 0.015], undefined, [1.36, 0.56, 0.03]),
  );
  b.view(s, P.ice, box(), f.at([0, SEAT.y + 0.21, seatTop - 0.06], undefined, [1.38, 0.04, 0.1]));
  // La losa, recostada hacia atrás, con un canto de latón y escarcha por delante.
  const slab = f.at([0, -0.98, DAIS + 1.45], [0.22, 0, 0]);
  b.solid(
    s,
    P.ice,
    box(),
    slab.clone().multiply(pieceMatrix(undefined, undefined, [1.3, 0.2, 2.9])),
  );
  b.view(
    s,
    P.frost,
    box(),
    slab.clone().multiply(pieceMatrix([0, 0.105, 0], undefined, [1.18, 0.01, 2.78])),
  );
  s.add(
    P.brass,
    box(),
    slab.clone().multiply(pieceMatrix([0, 0, 1.47], undefined, [1.36, 0.24, 0.05])),
    'metal',
  );
  herSign(b, slab, 0.112);
  crystals(b, f, [-0.62, SEAT.y + 0.2, DAIS], 7, 0.16, 400);
  crystals(b, f, [0.6, -0.95, DAIS], 8, 0.2, 430);
  crystals(b, f, [0.0, -1.35, DAIS + 2.95], 6, 0.14, 460);
}

/** La consola: un atril de piedra con la rueda de latón para calentar y una luz por paso. */
function heater(b: LabBuilder, f: Frame): void {
  const s = b.inside;
  const [x, y, z] = CONSOLE;
  const turn = Math.atan2(-y, -x) - Math.PI / 2;
  const c = new Frame(f.at([x, y, z], [0, 0, turn]));
  b.solid(s, P.greyDark, box(), c.at([0, 0, 0.5], undefined, [0.5, 0.4, 1.0]));
  b.view(s, P.board, box(), c.at([0, 0.06, 1.04], [-0.45, 0, 0], [0.56, 0.42, 0.06]));
  const wheel = c.at([0, 0.1, 1.1], [-0.45 + Math.PI / 2, 0, 0]);
  s.add(P.brass, torus(0.15, 0.018, 48, 8), wheel, 'metal');
  for (let k = 0; k < 6; k++) {
    s.add(
      P.brass,
      box(),
      wheel.clone().multiply(pieceMatrix(undefined, [0, (TAU * k) / 6, 0], [0.012, 0.012, 0.28])),
      'metal',
    );
  }
  for (let k = 0; k < BED_STEP_LIGHTS; k++) {
    const lx = -0.18 + (0.36 * k) / (BED_STEP_LIGHTS - 1);
    const m = c.at([lx, -0.1, 1.11], [-0.45, 0, 0]);
    b.part(
      `laboratorio_Lecho_Paso_${String(k)}`,
      ball(0.025, 2),
      m,
      { color: P.amber, glow: 1.4 },
      { lab_bed_step: k },
    );
  }
  // El tubo que lleva el calor al estrado, por el suelo.
  const run = Math.hypot(x, y) - 2.6;
  b.view(
    s,
    P.brass,
    cylinder(0.035, 12),
    c.at([0, run / 2 + 0.2, 0.05], [Math.PI / 2, 0, 0], [1, 1, run]),
  );
}

/** El ancla de ella (pies en el estrado, de cara a +Y) y su choque: no se la atraviesa. */
function scientistAnchor(b: LabBuilder, f: Frame): void {
  const anchor = new Object3D();
  anchor.name = SCIENTIST_ANCHOR;
  anchor.position.copy(f.point([0, 0, DAIS]));
  anchor.quaternion
    .copy(f.rotation())
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2));
  anchor.userData.seat_back = -SEAT.y;
  b.extras.push(anchor);
  b.inside.addCollider(
    box()
      .clone()
      .applyMatrix4(f.at([0, -0.2, DAIS + 1.3], undefined, [0.7, 0.7, 2.6])),
  );
  // La neblina de escarcha sobre el estrado: el juego la apaga al calentarse.
  b.part(FROST_MIST, cylinder(2.3, 64), f.at([0, 0, DAIS + 0.06], undefined, [1, 1, 0.1]), {
    color: P.frost,
    glow: 0.9,
    transparent: true,
  });
}

/** La cámara de frío en el marco `f` de su zona (+Y hacia el cruce, por donde se llega). */
export function buildColdChamber(b: LabBuilder, f: Frame): void {
  b.platform(f, 6.5, 6.5);
  dais(b, f);
  for (const turn of [Math.PI / 4, -Math.PI / 4]) ring(b, f, turn);
  bed(b, f);
  heater(b, f);
  scientistAnchor(b, f);
  // Arcos de anillo alrededor, como un claustro: sigue siendo lo más cuidado del Laboratorio.
  for (let k = 0; k < 6; k++) {
    const a = (TAU * k) / 6 + Math.PI / 6;
    b.view(
      b.inside,
      P.sandstoneDark,
      torus(0.8, 0.1, 32, 8),
      f.at([Math.cos(a) * 2.9, Math.sin(a) * 2.9, FLOOR + 0.4], [0, 0, a + Math.PI / 2]),
    );
  }
  const [cx, cy] = CONSOLE;
  b.mark('INT_lecho', f, [cx - 0.2, cy - 0.15, FLOOR + 1.15], {
    clue_id: 'lab.lecho',
    kind: 'objeto',
  });
  for (const id of ['lab.cientifica', 'lab.noticias.cientifica', 'lab.encargo.cientifica']) {
    const name = `INT_${id.replace(/\./g, '_')}`;
    b.mark(name, f, [0, 0.05, DAIS + 1.0], { clue_id: id, kind: 'charla' });
  }
  // La Cámara se fue al Taller (E5); su lectura se queda junto a los anillos hasta que E6 la rehaga.
  b.mark('INT_camara', f, [-1.6, 1.25, FLOOR + 1.1], { clue_id: 'lab.camara', kind: 'objeto' });
}
