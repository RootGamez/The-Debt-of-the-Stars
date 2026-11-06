// Las piezas de los edificios cerrados de Umbral (plan de la llegada, hito D): el armazón (suelo, muros de paneles
// tallados con pilastras, banda de cobre oxidado, techo con cornisa), la puerta con su anillo y su hoja dejada a
// medio abrir, la consola de la puerta con su piloto en espera y los tabiques. Medidas en umbralHallsShape.ts.
import { box, cylinder, torusArc, type Frame, type PieceSet } from './kit';
import { PALETTE as P } from './umbralPalette';
import { HALL, wallSpans, type HallShape, type Partition } from './umbralHallsShape';

/** Brillo de los pilotos en espera: se ven en la penumbra de dentro sin iluminar nada. */
export const STANDBY_GLOW = 2.4;
/** Tonos de los estratos de los muros, de abajo arriba (alturas en m). */
const BANDS: readonly (readonly [number, string])[] = [
  [0.5, P.rock],
  [1.3, P.sandstoneShade],
  [0.12, P.verdigris],
  [1.2, P.sandstone],
  [0.1, P.copper],
  [0.98, P.sandstoneLight],
];

/** Un tramo recto de muro con sus estratos, de `a` a `b` sobre el eje dado, en `at` del otro eje. */
function wallRun(
  v: PieceSet,
  f: Frame,
  axis: 'x' | 'y',
  at: number,
  a: number,
  b: number,
  bottom: number,
  top: number,
  thickness: number = HALL.wall,
): void {
  const length = b - a;
  if (length <= 0.01) return;
  const mid = (a + b) / 2;
  let z = 0;
  for (const [height, tone] of BANDS) {
    const z0 = Math.max(z, bottom);
    const z1 = Math.min(z + height, top);
    z += height;
    if (z1 <= z0) continue;
    const pos: [number, number, number] =
      axis === 'x' ? [mid, at, (z0 + z1) / 2] : [at, mid, (z0 + z1) / 2];
    const size: [number, number, number] =
      axis === 'x' ? [length, thickness, z1 - z0] : [thickness, length, z1 - z0];
    v.add(
      tone,
      box(),
      f.at(pos, undefined, size),
      tone === P.copper || tone === P.verdigris ? 'metal' : 'stone',
    );
  }
}

/** Pilastras talladas sobre la cara exterior de un muro (cada `HALL.pilaster` m), salvo en el hueco. */
function pilasters(
  v: PieceSet,
  f: Frame,
  axis: 'x' | 'y',
  face: number,
  out: number,
  from: number,
  to: number,
  gap?: number,
): void {
  const count = Math.floor((to - from) / HALL.pilaster);
  for (let k = 0; k <= count; k++) {
    const s = from + 0.3 + ((to - from - 0.6) * k) / Math.max(1, count);
    if (gap !== undefined && Math.abs(s - gap) < HALL.doorWidth / 2 + 0.4) continue;
    const pos: [number, number, number] =
      axis === 'x'
        ? [s, face + out * 0.08, HALL.height / 2]
        : [face + out * 0.08, s, HALL.height / 2];
    const size: [number, number, number] =
      axis === 'x' ? [0.36, 0.16, HALL.height] : [0.16, 0.36, HALL.height];
    v.add(P.sandstoneLight, box(), f.at(pos, undefined, size), 'stone', { solid: false });
  }
}

/** El armazón cerrado: suelo, cuatro muros (la puerta en el de +Y), techo con cornisa de cobre y tabiques. */
export function hallShell(v: PieceSet, f: Frame, shape: HallShape): void {
  const hw = shape.width / 2;
  const hd = shape.depth / 2;
  const w = HALL.wall;
  const H = HALL.height;
  // Suelo de losas, con juntas de pizarra.
  v.add(
    P.rockLight,
    box(),
    f.at([0, 0, -0.2 + HALL.floor / 2], undefined, [shape.width, shape.depth, 0.4 + HALL.floor]),
  );
  for (let x = -hw + 2; x < hw - 1; x += 2) {
    v.add(
      P.slate,
      box(),
      f.at([x, 0, HALL.floor + 0.005], undefined, [0.05, shape.depth - 2 * w, 0.01]),
      'metal',
      {
        solid: false,
      },
    );
  }
  // Muros: atrás y a los lados enteros; delante, partido por la puerta y con dintel.
  wallRun(v, f, 'x', -hd + w / 2, -hw, hw, 0, H);
  wallRun(v, f, 'y', -hw + w / 2, -hd + w, hd - w, 0, H);
  wallRun(v, f, 'y', hw - w / 2, -hd + w, hd - w, 0, H);
  for (const [a, b] of wallSpans(-hw, hw, 0, HALL.doorWidth))
    wallRun(v, f, 'x', hd - w / 2, a, b, 0, H);
  wallRun(v, f, 'x', hd - w / 2, -HALL.doorWidth / 2, HALL.doorWidth / 2, HALL.doorHeight, H);
  pilasters(v, f, 'x', hd, 1, -hw, hw, 0);
  pilasters(v, f, 'x', -hd, -1, -hw, hw);
  pilasters(v, f, 'y', -hw, -1, -hd, hd);
  pilasters(v, f, 'y', hw, 1, -hd, hd);
  // Techo y cornisa de cobre oxidado; una claraboya de anillo para que entre algo de luz ámbar.
  v.add(
    P.sandstoneShade,
    box(),
    f.at([0, 0, H + 0.18], undefined, [shape.width + 0.5, shape.depth + 0.5, 0.36]),
  );
  v.add(
    P.verdigris,
    box(),
    f.at([0, 0, H + 0.42], undefined, [shape.width + 0.7, shape.depth + 0.7, 0.12]),
    'metal',
  );
  v.add(
    P.copper,
    torusArc(1.1, 0.08, 0, Math.PI * 2, 24, 4),
    f.at([0, 0, H + 0.5], [Math.PI / 2, 0, 0]),
    'metal',
    {
      solid: false,
    },
  );
  for (const p of shape.partitions) partition(v, f, p);
  doorway(v, f, hd);
}

/** Un tabique interior más bajo que el techo, con su hueco de paso enmarcado en cobre. */
function partition(v: PieceSet, f: Frame, p: Partition): void {
  const top = HALL.height - 0.4;
  for (const [a, b] of wallSpans(p.from, p.to, p.door, HALL.doorWidth)) {
    wallRun(v, f, p.axis, p.at, a, b, 0, top, 0.3);
  }
  wallRun(
    v,
    f,
    p.axis,
    p.at,
    p.door - HALL.doorWidth / 2,
    p.door + HALL.doorWidth / 2,
    HALL.doorHeight,
    top,
    0.3,
  );
  for (const side of [-1, 1]) {
    const s = p.door + (side * HALL.doorWidth) / 2;
    const pos: [number, number, number] =
      p.axis === 'x' ? [s, p.at, HALL.doorHeight / 2] : [p.at, s, HALL.doorHeight / 2];
    v.add(P.copper, box(), f.at(pos, undefined, [0.36, 0.36, HALL.doorHeight]), 'metal', {
      solid: false,
    });
  }
}

/** La puerta de +Y: anillo de cobre sobre el dintel, friso de marcas de reloj y la hoja de pizarra a medio abrir. */
function doorway(v: PieceSet, f: Frame, hd: number): void {
  const y = hd + 0.02;
  const ring = HALL.doorWidth / 2 + 0.35;
  // Anillo partido por el dintel (de pie, como los de la Vía: el toro de kit.ts tiene el eje en Y) (los Ausentes ponían una Puerta en cada puerta).
  v.add(
    P.copper,
    torusArc(ring, 0.1, 0, Math.PI, 24, 4),
    f.at([0, y + 0.08, HALL.doorHeight - 0.2]),
    'metal',
    {
      solid: false,
    },
  );
  // Friso: rayas de reloj en semicírculo sobre la puerta.
  for (let k = 0; k <= 12; k++) {
    const a = (Math.PI * k) / 12;
    v.add(
      P.verdigris,
      box(),
      f.at(
        [Math.cos(a) * (ring + 0.3), y + 0.1, HALL.doorHeight - 0.2 + Math.sin(a) * (ring + 0.3)],
        [0, -a, 0],
        [0.22, 0.05, 0.06],
      ),
      'metal',
      { solid: false },
    );
  }
  // Marco de cobre a los lados.
  for (const side of [-1, 1]) {
    v.add(
      P.copper,
      box(),
      f.at([side * (HALL.doorWidth / 2 + 0.1), y, HALL.doorHeight / 2], undefined, [
        0.2,
        0.2,
        HALL.doorHeight,
      ]),
      'metal',
      {
        solid: false,
      },
    );
  }
  // La hoja, corrida hacia la izquierda y sin cerrar del todo: se fueron con prisa.
  const leaf = HALL.doorWidth;
  v.add(
    P.slateLight,
    box(),
    f.at(
      [-HALL.doorWidth / 2 - leaf / 2 + HALL.leafCover, hd - HALL.wall - 0.08, HALL.doorHeight / 2],
      undefined,
      [leaf, 0.1, HALL.doorHeight - 0.05],
    ),
    'metal',
  );
  doorConsole(v, f, HALL.doorWidth / 2 + 0.9, hd + 0.45);
}

/** La consola de la puerta: un poste con la tapa inclinada y su piloto ámbar en espera. */
export function doorConsole(v: PieceSet, f: Frame, x: number, y: number): void {
  v.add(P.slate, box(), f.at([x, y, 0.6], undefined, [0.35, 0.3, 1.2]), 'metal');
  v.add(P.copper, box(), f.at([x, y + 0.05, 1.25], [0.5, 0, 0], [0.45, 0.4, 0.08]), 'metal', {
    solid: false,
  });
  pilot(v, f, [x, y + 0.13, 1.33]);
}

/** Un piloto de luz en espera (pequeño y brillante, sin colisión). */
export function pilot(
  v: PieceSet,
  f: Frame,
  at: readonly [number, number, number],
  size = 0.07,
): void {
  v.add(P.standby, cylinder(size, 8), f.at([...at], undefined, [1, 1, 0.3]), 'light', {
    glow: STANDBY_GLOW,
    vary: 0,
    solid: false,
  });
}
