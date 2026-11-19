// Las salas de la vida de cada día del Laboratorio Oculto (🟡, pedido de Anthony 2026-11-05): quienes trabajaron
// aquí vivieron meses mientras fuera pasaban años, y se nota. El Archivo de Mediciones (relojes y cintas que
// comparan este tiempo con el de fuera), el Cuarto de la Radio (mensajes que llegaban tarde y respuestas que nadie
// mandó), el Comedor con el calendario de rayas y el Invernadero, donde las plantas crecieron hacia la semilla.
// Cada cuarto es una casa de verdad (E7: muros portantes, dinteles y su cubierta; laboratorioBuildings.ts) con lo de
// dentro de antes, una lámpara colgada sobre la mesa y un farol junto a la puerta.
import { ball, box, cone, cylinder, rampMatrix, torus, type Frame, type Triple } from './kit';
import { BUILDINGS, WALL, pitchedHeight } from './laboratorioArchitecture';
import { PURLIN, house, pendant } from './laboratorioBuildings';
import { FLOOR, LabBuilder, PALETTE as P } from './laboratorioKit';
import { INNER_SITES, insideFrame, insideHeading, type InnerSiteId } from './laboratorioShape';

const TAU = Math.PI * 2;

function zone(id: InnerSiteId, facing: InnerSiteId): Frame {
  const s = INNER_SITES[id];
  return insideFrame(s.lat, s.lon, insideHeading(s, INNER_SITES[facing]));
}

/** Papeles por el suelo, como si alguien hubiera salido corriendo. */
function scattered(
  b: LabBuilder,
  f: Frame,
  x: number,
  y: number,
  count: number,
  seed: number,
): void {
  for (let k = 0; k < count; k++) {
    const a = seed * 1.7 + k * 2.39;
    const r = 0.3 + ((k * 0.37 + seed) % 1) * 1.1;
    b.view(
      b.inside,
      P.paper,
      box(),
      f.at(
        [x + Math.cos(a) * r, y + Math.sin(a) * r, FLOOR + 0.01 + k * 0.002],
        [0, 0, a],
        [0.3, 0.4, 0.01],
      ),
    );
  }
}

/** Una silla de madera con respaldo, girada `turn` (de cara a +Y sin girar); se choca con ella. */
function chair(b: LabBuilder, f: Frame, x: number, y: number, turn: number): void {
  const s = b.inside;
  const c = Math.cos(turn);
  const n = Math.sin(turn);
  const at = (dx: number, dy: number, z: number): Triple => [
    x + dx * c - dy * n,
    y + dx * n + dy * c,
    FLOOR + z,
  ];
  b.view(s, P.wood, box(), f.at(at(0, 0, 0.45), [0, 0, turn], [0.48, 0.48, 0.06]));
  for (const dx of [-0.2, 0.2]) {
    for (const dy of [-0.2, 0.2]) {
      b.view(s, P.woodDark, box(), f.at(at(dx, dy, 0.21), [0, 0, turn], [0.05, 0.05, 0.42]));
    }
    b.view(s, P.woodDark, box(), f.at(at(dx, -0.21, 0.72), [0, 0, turn], [0.05, 0.05, 0.52]));
  }
  b.view(s, P.wood, box(), f.at(at(0, -0.22, 0.86), [0, 0, turn], [0.48, 0.04, 0.2]));
  const bulk = f.at(at(0, 0, 0.45), [0, 0, turn], [0.48, 0.48, 0.9]);
  s.addCollider(box().clone().applyMatrix4(bulk));
}

/** Un viento (cable tenso) de `from` a `to`, en el marco de la zona (z sobre el suelo). */
function wire(f: Frame, from: Triple, to: Triple): ReturnType<Frame['at']> {
  const lift = (p: Triple): Triple => [p[0], p[1], p[2] + FLOOR];
  return f.base.clone().multiply(rampMatrix(lift(from), lift(to), 0.02, 0.02, 0));
}

/** El Archivo de Mediciones: estanterías de cintas, dos relojes que se separan y la mesa del cálculo. */
function mediciones(b: LabBuilder): void {
  const spec = BUILDINGS.mediciones;
  const f = zone(spec.site, spec.facing);
  const s = b.inside;
  const z = FLOOR;
  house(b, f, spec);
  // El reloj de la fachada, en el luneto sobre la puerta: el de este lado del tiempo.
  const face = spec.depth / 2 + WALL / 2 + 0.03;
  const clock = z + spec.eaves + spec.rise * 0.42;
  b.view(s, P.white, cylinder(0.36, 16), f.at([0, face, clock], [Math.PI / 2, 0, 0], [1, 1, 0.04]));
  b.view(s, P.brass, torus(0.38, 0.035, 20, 4), f.at([0, face + 0.01, clock]));
  for (const [a, l] of [
    [0.5, 0.26],
    [2.3, 0.18],
  ] as const) {
    const hand: Triple = [Math.sin(a) * l * 0.5, face + 0.03, clock + Math.cos(a) * l * 0.5];
    b.view(s, P.board, box(), f.at(hand, [0, -a, 0], [0.03, 0.02, l]));
  }
  // Estanterías contra los muros, llenas de cajas de cinta, etiquetadas por ciclos.
  for (const x of [-3.05, 3.05]) {
    b.solid(s, P.wood, box(), f.at([x, -0.6, z + 1.05], undefined, [0.45, 3.6, 2.1]));
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 7; k++) {
        const tone = [P.greyDark, P.blanket, P.sandstone, P.seal][(row + k) % 4] ?? P.grey;
        b.view(
          s,
          tone,
          box(),
          f.at(
            [x - Math.sign(x) * 0.24, -2.1 + k * 0.48, z + 0.35 + row * 0.5],
            undefined,
            [0.05, 0.38, 0.3],
          ),
        );
      }
    }
  }
  // Dos relojes de pared: «Dentro» y «Fuera». E2: el de dentro va cinco veces más deprisa (antes, el de fuera).
  [-1.1, 1.1].forEach((x, k) => {
    b.view(
      s,
      P.white,
      cylinder(0.45, 16),
      f.at([x, -2.85, z + 1.8], [Math.PI / 2, 0, 0], [1, 1, 0.05]),
    );
    b.view(s, P.brass, torus(0.46, 0.035, 20, 4), f.at([x, -2.82, z + 1.8]));
    const hand = k === 0 ? 2.0 : 0.4;
    b.view(
      s,
      P.board,
      box(),
      f.at(
        [x + Math.sin(hand) * 0.17, -2.8, z + 1.8 + Math.cos(hand) * 0.17],
        [0, -hand, 0],
        [0.03, 0.02, 0.34],
      ),
    );
    b.view(s, P.brass, box(), f.at([x, -2.84, z + 1.2], undefined, [0.5, 0.02, 0.12]));
  });
  // La mesa del cálculo: cintas abiertas, un ábaco de anillos y papeles con columnas de cifras.
  b.table(f, 0, -0.6, 2.8, 1.2);
  b.papers(f, -0.6, -0.8, z + 0.83, 5);
  for (let k = 0; k < 5; k++) {
    b.view(s, P.brass, torus(0.07, 0.02, 10, 3), f.at([0.6 + k * 0.12, -0.6, z + 0.9]));
  }
  b.view(s, P.brass, box(), f.at([0.85, -0.6, z + 0.9], undefined, [0.75, 0.02, 0.02]));
  for (let k = 0; k < 3; k++) {
    b.view(
      s,
      P.greyDark,
      cylinder(0.12, 10),
      f.at([-1.0 + k * 0.3, -0.2, z + 0.86], undefined, [1, 1, 0.05]),
    );
  }
  scattered(b, f, 0.5, 1.4, 9, 1);
  b.solid(s, P.wood, box(), f.at([-1.6, 1.6, z + 0.2], [0, 0, 0.5], [0.6, 0.4, 0.4]));
  pendant(b, f, 0, -0.6, spec.eaves + spec.rise, 2.0);
  b.mark('INT_mediciones', f, [0, 0.6, z + 1.2], { clue_id: 'lab.mediciones', kind: 'texto' });
}

/** El Cuarto de la Radio: el aparato con su antena hacia la Puerta, los auriculares y el cuaderno de mensajes. */
function radio(b: LabBuilder): void {
  const spec = BUILDINGS.radio;
  const f = zone(spec.site, spec.facing);
  const s = b.inside;
  const z = FLOOR;
  house(b, f, spec);
  b.table(f, 0, -1.8, 3.0, 0.9);
  // El aparato: un mueble de pizarra con diales de latón y luces que ya no parpadean.
  b.solid(s, P.board, box(), f.at([0, -2.25, z + 1.3], undefined, [2.4, 0.45, 1.0]));
  for (let k = 0; k < 5; k++) {
    b.view(
      s,
      P.brass,
      cylinder(0.09, 8),
      f.at([-0.9 + k * 0.45, -2.0, z + 1.45], [Math.PI / 2, 0, 0], [1, 1, 0.05]),
    );
    const m = f.at([-0.9 + k * 0.45, -2.0, z + 1.15], undefined, [0.06, 0.02, 0.06]);
    if (k === 2) b.lamp(s, box(), m, '#ff6a50');
    else b.view(s, P.greyDark, box(), m);
  }
  // La antena: un mástil que atraviesa la azotea, con sus vientos atados a ella.
  const mast = 5.2;
  const pole: Triple = [1, 1, mast - 1.1];
  b.solid(
    s,
    P.greyDark,
    cylinder(0.06, 6),
    f.at([1.4, -2.4, z + (1.1 + mast) / 2], undefined, pole),
  );
  b.view(s, P.brass, cone(0.4, 0.05, 6), f.at([1.4, -2.4, z + mast], undefined, [1, 1, 0.3]));
  const deck = spec.eaves + 0.25;
  for (const [x, y] of [
    [-0.6, -2.6],
    [2.9, -2.6],
    [1.4, 0.6],
  ] as const) {
    b.view(s, P.iron, box(), wire(f, [1.4, -2.4, mast - 0.4], [x, y, deck]));
  }
  // Auriculares sobre la mesa, el cuaderno de mensajes y un taburete caído.
  b.view(s, P.greyDark, torus(0.14, 0.025, 12, 3), f.at([-0.8, -1.7, z + 0.9], [0.3, 0, 0]));
  b.view(s, P.paper, box(), f.at([0.4, -1.6, z + 0.83], [0, 0, 0.2], [0.5, 0.36, 0.03]));
  b.view(s, P.seal, box(), f.at([0.4, -1.6, z + 0.85], [0, 0, 0.2], [0.04, 0.36, 0.005]));
  b.view(
    s,
    P.wood,
    cylinder(0.2, 8),
    f.at([-1.6, -0.6, z + 0.2], [Math.PI / 2, 0, 0.6], [1, 1, 0.5]),
  );
  // Tiras de papel clavadas en el muro: mensajes recibidos, cada uno con dos fechas.
  for (let k = 0; k < 10; k++) {
    b.view(
      s,
      P.paper,
      box(),
      f.at([-2.87, -1.8 + k * 0.38, z + 1.2 + (k % 3) * 0.3], [0, 0, 0], [0.02, 0.3, 0.2]),
    );
  }
  scattered(b, f, 1.2, 0.6, 7, 3);
  pendant(b, f, 0, -1.6, spec.eaves, 0.9);
  b.mark('INT_radio', f, [0, -0.6, z + 1.2], { clue_id: 'lab.radio', kind: 'texto' });
}

/** El Comedor: la mesa puesta para dos, una taza volcada, la cocinilla y la pared del calendario de rayas. */
function comedor(b: LabBuilder): void {
  const spec = BUILDINGS.comedor;
  const f = zone(spec.site, spec.facing);
  const s = b.inside;
  const z = FLOOR;
  house(b, f, spec);
  b.table(f, 0, 0, 2.0, 1.1);
  // Dos sillas: la de ella, en su sitio; la de él, echada atrás y torcida, como quien se levanta de golpe.
  chair(b, f, 0, -0.85, 0);
  chair(b, f, 0.25, 1.3, Math.PI + 0.45);
  // Un jarrito con una flor seca en medio de la mesa.
  b.view(s, P.white, cylinder(0.06, 8), f.at([-0.2, 0, z + 0.93], undefined, [1, 1, 0.22]));
  b.view(s, P.leafDry, cylinder(0.008, 3), f.at([-0.2, 0, z + 1.18], [0.2, 0, 0], [1, 1, 0.34]));
  b.view(s, P.seal, ball(0.035, 0), f.at([-0.17, -0.05, z + 1.34]));
  for (const y of [-0.8, 0.8]) {
    b.view(
      s,
      P.white,
      cylinder(0.14, 10),
      f.at([-0.3, y * 0.45, z + 0.84], undefined, [1, 1, 0.02]),
    );
  }
  // Una taza en pie, otra volcada con su mancha seca.
  b.view(s, P.white, cylinder(0.05, 8), f.at([0.4, 0.35, z + 0.89], undefined, [1, 1, 0.1]));
  b.view(
    s,
    P.white,
    cylinder(0.05, 8),
    f.at([0.4, -0.3, z + 0.86], [Math.PI / 2, 0, 0.4], [1, 1, 0.1]),
  );
  b.view(
    s,
    P.wood,
    cylinder(0.22, 10),
    f.at([0.25, -0.45, z + 0.825], undefined, [1.2, 0.8, 0.005]),
  );
  // La cocinilla, con su chimenea que sale por el tejado, y la alacena, con tarros.
  b.solid(s, P.greyDark, box(), f.at([-2.9, -1.8, z + 0.45], undefined, [0.8, 1.6, 0.9]));
  b.lamp(s, ball(0.08, 1), f.at([-2.9, -1.5, z + 0.95]), '#ff9a50');
  const flue = pitchedHeight(spec, -2.9) + 0.9;
  const stack: Triple = [0.45, 0.45, flue - 0.9];
  b.solid(s, P.plasterShade, box(), f.at([-2.9, -2.1, z + (0.9 + flue) / 2], undefined, stack));
  b.view(s, P.limestone, box(), f.at([-2.9, -2.1, z + flue + 0.05], undefined, [0.62, 0.62, 0.1]));
  b.solid(s, P.wood, box(), f.at([-2.95, 1.0, z + 1.0], undefined, [0.5, 2.0, 2.0]));
  for (let k = 0; k < 8; k++) {
    b.view(
      s,
      [P.greenLight, P.seal, P.sandstone][k % 3] ?? P.white,
      cylinder(0.07, 6),
      f.at(
        [-2.68, 0.2 + (k % 4) * 0.45, z + 0.7 + Math.floor(k / 4) * 0.7],
        undefined,
        [1, 1, 0.2],
      ),
    );
  }
  // El calendario: la pared del fondo llena de rayas en grupos de cinco. Arriba, «aquí»; abajo, «fuera».
  b.view(s, P.white, box(), f.at([1.0, -2.86, z + 1.3], undefined, [4.0, 0.03, 1.8]));
  for (let row = 0; row < 7; row++) {
    for (let k = 0; k < 14; k++) {
      const x = -0.75 + k * 0.25;
      const y = -2.84;
      const zz = z + 2.0 - row * 0.22;
      for (let t = 0; t < 4; t++) {
        b.view(s, P.board, box(), f.at([x + t * 0.035, y, zz], undefined, [0.012, 0.01, 0.14]));
      }
      b.view(s, P.seal, box(), f.at([x + 0.05, y, zz], [0, 0.9, 0], [0.012, 0.01, 0.2]));
    }
  }
  b.view(s, P.seal, box(), f.at([1.0, -2.84, z + 0.55], undefined, [3.6, 0.01, 0.03]));
  scattered(b, f, 1.2, 1.4, 5, 5);
  pendant(b, f, 0, 0.3, spec.eaves - 0.24, 0.75);
  b.mark('INT_calendario', f, [1.0, -1.6, z + 1.2], { clue_id: 'lab.calendario', kind: 'objeto' });
  b.mark('INT_comedor', f, [0, 1.6, z + 1.2], { clue_id: 'lab.comedor', kind: 'objeto' });
}

/** El Invernadero: bancales con plantas que crecieron torcidas hacia la semilla, y la mesa de los esquejes. */
function invernadero(b: LabBuilder): void {
  const spec = BUILDINGS.invernadero;
  const f = zone(spec.site, spec.facing);
  const s = b.inside;
  const z = FLOOR;
  house(b, f, spec);
  for (const y of [-1.8, 0.0]) {
    b.solid(s, P.wood, box(), f.at([0, y, z + 0.3], undefined, [5.4, 0.9, 0.6]));
    b.view(s, '#3a2c22', box(), f.at([0, y, z + 0.61], undefined, [5.2, 0.8, 0.04]));
    for (let k = 0; k < 9; k++) {
      const x = -2.4 + k * 0.6;
      // Tallos larguísimos y finos que crecieron hacia la semilla (arriba), algo torcidos, con hojas ya secas.
      const tall = 0.8 + ((k * 0.61 + y) % 1) * 1.4;
      const lean = 0.15 + (k % 3) * 0.1;
      const turn = k * 0.7;
      const dir: Triple = [
        Math.sin(turn) * Math.sin(lean),
        -Math.cos(turn) * Math.sin(lean),
        Math.cos(lean),
      ];
      const along = (t: number): Triple => [
        x + dir[0] * tall * t,
        y + dir[1] * tall * t,
        z + 0.63 + dir[2] * tall * t,
      ];
      const stem = k % 4 === 0 ? P.leafDry : '#5a6a3a';
      b.view(s, stem, cylinder(0.02, 4), f.at(along(0.5), [lean, 0, turn], [1, 1, tall]));
      b.view(s, '#6a7a42', cone(0.12, 0.01, 5), f.at(along(1), [lean, 0, turn], [1, 1, 0.2]));
      for (const [t, side] of [
        [0.35, 1],
        [0.7, -1],
      ] as const) {
        const leaf = k % 3 === 0 ? P.leafDry : P.leaf;
        b.view(
          s,
          leaf,
          ball(0.09, 0),
          f.at(along(t), [0, 0.5 * side, turn + side], [1.7, 0.6, 0.35]),
        );
      }
    }
  }
  // La mesa de los esquejes: macetas, una regadera y la libreta de crecimiento.
  b.table(f, 0, 1.6, 2.2, 0.8);
  for (let k = 0; k < 5; k++) {
    b.view(
      s,
      P.seal,
      cylinder(0.09, 8),
      f.at([-0.8 + k * 0.4, 1.7, z + 0.9], undefined, [1, 1, 0.16]),
    );
  }
  b.view(s, P.grey, cylinder(0.12, 8), f.at([0.9, 1.4, z + 0.95], undefined, [1, 1, 0.25]));
  b.view(s, P.paper, box(), f.at([0.2, 1.4, z + 0.83], [0, 0, -0.3], [0.32, 0.42, 0.02]));
  // Lámparas de cultivo colgadas de las correas y de la cumbrera: la única luz que tuvieron estas plantas.
  for (const x of [-PURLIN, 0, PURLIN]) {
    const top = pitchedHeight(spec, x) - 0.2;
    for (const y of [-1.8, 0]) {
      const rod: Triple = [0.02, 0.02, top - 2.55];
      b.view(s, P.iron, box(), f.at([x, y, z + (top + 2.55) / 2], undefined, rod));
      b.view(s, P.iron, box(), f.at([x, y, z + 2.53], undefined, [0.56, 0.24, 0.05]));
      b.lamp(s, box(), f.at([x, y, z + 2.5], undefined, [0.5, 0.2, 0.02]), '#ffe0a0');
    }
  }
  scattered(b, f, -2.2, 1.6, 4, 7);
  b.mark('INT_invernadero', f, [0, 1.0, z + 1.2], { clue_id: 'lab.invernadero', kind: 'objeto' });
}

/** Las salas de la vida de cada día. */
export function buildLife(b: LabBuilder): void {
  mediciones(b);
  radio(b);
  comedor(b);
  invernadero(b);
}

export { TAU };
