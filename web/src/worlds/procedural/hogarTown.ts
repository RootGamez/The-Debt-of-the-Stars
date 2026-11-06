// La gente de Hogar (Fase 11G; ✅ Anthony 2026-11-03: más ciudad y más campo): la aldea del árbol de musgo, al norte
// del Instituto, con el pozo, la tejedora y la guarida de los críos; y la ciudad, al sur, con su mercado, la fuente de
// la Lectora y calles de casas de tela. Las casas y las farolas son las de hogarKit.ts. Lo de los vecinos es 🟡.
import { Quaternion, Vector3 } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  pieceMatrix,
  rampMatrix,
  torus,
  type Frame,
  type Triple,
} from './kit';
import { oolShape } from './ool';
import { FABRICS, HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';

const DEG = Math.PI / 180;

/** Casas en corro alrededor de un centro, con la puerta hacia él. */
function ringOfHouses(
  b: HogarBuilder,
  f: Frame,
  center: Triple,
  radius: number,
  count: number,
  options: { skip?: readonly number[]; size?: number; tall?: number },
): void {
  for (let k = 0; k < count; k++) {
    const angle = (k / count) * 360 + (b.random() - 0.5) * 8;
    if (options.skip?.some((s) => Math.abs(((angle - s + 540) % 360) - 180) < 360 / count / 1.6))
      continue;
    const a = angle * DEG;
    const r = radius + (b.random() - 0.5) * 1.6;
    const size = (options.size ?? 1) * (0.85 + b.random() * 0.35);
    b.house(f, [center[0] + Math.sin(a) * r, center[1] + Math.cos(a) * r, 0], {
      radius: 2.1 * size,
      height: 2.5 * size,
      door: angle + 180,
      storeys: b.random() < (options.tall ?? 0) ? 2 : 1,
    });
  }
}

/** Una cuerda de tender con telas de colores entre dos postes. */
function clothesLine(b: HogarBuilder, f: Frame, from: Triple, to: Triple): void {
  for (const p of [from, to]) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.05, 5),
      f.at([p[0], p[1], 1.1], undefined, [1, 1, 2.2]),
      'stone',
      { solid: false },
    );
  }
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const yaw = Math.atan2(-dx, dy);
  b.pieces.add(
    P.cream,
    box(),
    f.at([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 2.1], [0, 0, yaw], [0.02, length, 0.02]),
    'stone',
    { solid: false },
  );
  const sheets = Math.floor(length / 0.9);
  for (let k = 0; k < sheets; k++) {
    const t = (k + 0.5) / sheets;
    b.pieces.add(
      FABRICS[k % FABRICS.length] ?? P.cream,
      box(),
      f.at([from[0] + dx * t, from[1] + dy * t, 1.75], [0, 0, yaw], [0.03, 0.7, 0.65]),
      'stone',
      { solid: false },
    );
  }
}

/** La aldea: el árbol de musgo en medio, el pozo, el telar de la tejedora y la guarida de los críos. */
function aldea(b: HogarBuilder): void {
  const f = b.site('aldea');
  b.pieces.add(
    P.grassLight,
    cylinder(9, 24),
    f.at([0, 0, 0.01], undefined, [1, 1, 0.02]),
    'stone',
    { solid: false },
  );
  // El árbol de musgo, grande, con sus frutos de luz.
  b.mossTree(f, [0, 0, 0], 2.1, 10);
  b.pieces.add(
    P.wood,
    torus(1.4, 0.18, 16, 4),
    f.at([0, 0, 0.25], [Math.PI / 2, 0, 0], [1, 1, 0.8]),
    'stone',
    { solid: false },
  );
  b.ool({ id: 'vecina_arbol', age: 0.55, outfit: 'vecino', seed: 51 }, f, [2.6, -2.2, 0], 200);
  b.source('aldea.arbol', 'charla', f, [2.6, -2.2, 1.2]);
  // Donde despierta quien juega y adonde vuelve tras un accidente: la plaza, mirando al árbol.
  b.mark('SPAWN_Plaza', f, [0.4, -6.5, 0.3]);
  b.ool({ id: 'cria', age: 0.05, outfit: 'cria', seed: 52 }, f, [-2.4, -3.2, 0], 160);
  b.source('aldea.cria', 'charla', f, [-2.4, -3.2, 0.8]);
  // El pozo con su tejadillo.
  const well: Triple = [6.5, 4, 0];
  b.pieces.add(
    P.rock,
    torus(0.9, 0.28, 14, 5),
    f.at([well[0], well[1], 0.35], [Math.PI / 2, 0, 0], [1, 1, 1.4]),
    'stone',
    { solid: true },
  );
  b.stillWater(f, [well[0], well[1], 0.3], 1.1, 1.1);
  for (const side of [-1, 1]) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.07, 5),
      f.at([well[0] + side * 1, well[1], 1.1], undefined, [1, 1, 2.2]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.moss,
    cone(1.5, 0.1, 8),
    f.at([well[0], well[1], 2.5], undefined, [1, 0.8, 0.7]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.wood,
    cylinder(0.18, 8),
    f.at([well[0], well[1], 0.9], undefined, [1, 1, 0.25]),
    'stone',
    { solid: false },
  );
  b.ool(
    { id: 'vecino_pozo', age: 0.75, outfit: 'vecino', seed: 53 },
    f,
    [well[0] + 1.6, well[1] - 1.4, 0],
    300,
  );
  b.source('aldea.pozo', 'charla', f, [well[0] + 1.6, well[1] - 1.4, 1.2]);
  // El telar de la tejedora y sus telas teñidas.
  const loom: Triple = [-7, -4, 0];
  for (const side of [-1, 1]) {
    b.pieces.add(
      P.wood,
      box(),
      f.at([loom[0] + side * 0.9, loom[1], 0.9], undefined, [0.1, 0.1, 1.8]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(P.wood, box(), f.at([loom[0], loom[1], 1.75], undefined, [1.9, 0.1, 0.1]), 'stone', {
    solid: false,
  });
  for (let k = 0; k < 9; k++) {
    b.pieces.add(
      FABRICS[k % FABRICS.length] ?? P.cream,
      box(),
      f.at([loom[0] - 0.8 + k * 0.2, loom[1], 1.1], undefined, [0.03, 0.02, 1.3]),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.rust,
    box(),
    f.at([loom[0], loom[1], 0.62], undefined, [1.7, 0.04, 0.3]),
    'stone',
    { solid: false },
  );
  b.ool(
    { id: 'tejedora', age: 0.6, outfit: 'tejedora', holding: 'ovillo', seed: 54 },
    f,
    [loom[0], loom[1] - 1.2, 0],
    0,
  );
  b.source('aldea.tejedora', 'charla', f, [loom[0], loom[1] - 1.2, 1.2]);
  clothesLine(b, f, [-10, 3, 0], [-6, 7, 0]);
  clothesLine(b, f, [9, -6, 0], [12, -2.5, 0]);
  ringOfHouses(b, f, [0, 0, 0], 13.5, 10, { skip: [150], tall: 0.2 });
  for (const [x, y] of [
    [4, -8],
    [-5, 7],
    [9, 8],
  ] as const) {
    b.bulbLamp(f, [x, y, 0], 2.2);
  }
  guarida(b, f);
}

/** La guarida de los críos, al borde de la aldea: palos, lona y dibujos del cielo. Una nota para quien se asome. */
function guarida(b: HogarBuilder, f: Frame): void {
  const g: Triple = [-17, 11, 0];
  b.mossTree(f, [g[0] - 1.6, g[1] + 1.2, 0], 1, 3);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    if (Math.cos(a) < -0.7) continue; // la entrada, hacia la aldea
    b.pieces.add(
      P.wood,
      cylinder(0.05, 4),
      f.at(
        [g[0] + Math.sin(a) * 1.1, g[1] + Math.cos(a) * 1.1, 0.8],
        [-Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0],
        [1, 1, 1.8],
      ),
      'stone',
      { solid: false },
    );
  }
  b.pieces.add(
    P.sage,
    cone(1.5, 0.2, 7),
    f.at([g[0], g[1], 1.1], undefined, [1, 1, 1.5]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.cream,
    box(),
    f.at([g[0] + 0.3, g[1] + 0.5, 0.06], [0, 0, 0.5], [0.5, 0.35, 0.01]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.sky,
    box(),
    f.at([g[0] - 0.3, g[1] + 0.3, 0.06], [0, 0, -0.3], [0.45, 0.3, 0.01]),
    'stone',
    { solid: false },
  );
  b.pieces.add(P.glowWarm, ball(0.08, 1), f.at([g[0], g[1], 0.3]), 'light', { glow: 1.4, vary: 0 });
  b.source('hogar.guarida', 'texto', f, [g[0] + 0.3, g[1] + 0.5, 0.2]);
}

/** Un puesto del mercado: mesa, toldo a rayas y lo que se vende. */
function stall(
  b: HogarBuilder,
  f: Frame,
  at: Triple,
  turn: number,
  goods: 'calabazas' | 'bulbos' | 'telas' | 'pan',
): void {
  const t = turn * DEG;
  const local = (x: number, y: number, z: number): Triple => [
    at[0] + Math.cos(t) * x + Math.sin(t) * y,
    at[1] - Math.sin(t) * x + Math.cos(t) * y,
    z,
  ];
  b.pieces.add(P.wood, box(), f.at(local(0, 0, 0.45), [0, 0, -t], [2, 0.9, 0.9]), 'stone', {
    solid: true,
  });
  for (const x of [-1, 1]) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.05, 5),
      f.at(local(x, -0.6, 1.2), undefined, [1, 1, 2.4]),
      'stone',
      { solid: false },
    );
  }
  const stripes = [P.cream, FABRICS[Math.floor(b.random() * FABRICS.length)] ?? P.rust];
  for (let k = 0; k < 5; k++) {
    b.pieces.add(
      stripes[k % 2] ?? P.cream,
      box(),
      f.at(local(-0.88 + k * 0.44, 0, 2.3), [0.2, 0, -t], [0.44, 1.5, 0.03]),
      'stone',
      { solid: false },
    );
  }
  for (let k = 0; k < 6; k++) {
    const p = local(-0.75 + (k % 3) * 0.5, -0.15 + Math.floor(k / 3) * 0.3, 0.98);
    if (goods === 'calabazas')
      b.pieces.add(
        k % 2 ? P.ochre : P.teal,
        ball(0.14, 1),
        f.at(p, undefined, [1, 1, 0.8]),
        'stone',
        { solid: false },
      );
    else if (goods === 'bulbos')
      b.pieces.add(P.glow, ball(0.09, 1), f.at(p), 'light', { glow: 1.3, vary: 0 });
    else if (goods === 'telas')
      b.pieces.add(
        FABRICS[k % FABRICS.length] ?? P.cream,
        box(),
        f.at(p, [0, 0, -t], [0.4, 0.25, 0.1]),
        'stone',
        { solid: false },
      );
    else
      b.pieces.add(P.sandstone, ball(0.12, 0), f.at(p, undefined, [1.3, 1, 0.6]), 'stone', {
        solid: false,
      });
  }
}

/** Medidas de la fuente de la Lectora (m, desde el centro de la plaza). */
const FOUNTAIN = {
  /** La pila de abajo: radio, alto del borde y del agua. */
  basin: { radius: 2.5, wall: 0.45 },
  /** La taza de arriba, sobre la columna: de ella rebosa la cortina. */
  bowl: { radius: 1.05, at: 1.55 },
  /** La Lectora: dónde apoya y a qué escala de un Ool. */
  statue: { at: 1.9, scale: 1.6 },
} as const;

/**
 * La fuente de la Lectora (✅ Anthony 2026-11-03: que la estatua tenga forma de Ool y el agua caiga de verdad): una
 * Ool de piedra con un libro abierto sobre una columna. El agua cae de las páginas a la taza, rebosa en cortina hasta
 * la pila redonda y, donde cae, la espuma da vueltas (ANIM_).
 */
function lectora(b: HogarBuilder, f: Frame): void {
  const { basin, bowl, statue } = FOUNTAIN;
  // La pila: un tambor bajo de arenisca con un labio redondo; el agua, a ras del labio.
  b.pieces.add(
    P.sandstone,
    cylinder(1, 28),
    f.at([0, 0, basin.wall / 2], undefined, [basin.radius, basin.radius, basin.wall]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.sandstone,
    torus(basin.radius - 0.12, 0.2, 32, 6),
    f.at([0, 0, basin.wall], [Math.PI / 2, 0, 0]),
    'stone',
    { solid: false },
  );
  b.stillDisc(f, [0, 0, basin.wall + 0.03], basin.radius - 0.2);
  // La columna y la taza (un cono abierto hacia arriba) con su labio.
  b.pieces.add(
    P.sandstone,
    cylinder(0.32, 12),
    f.at([0, 0, (basin.wall + bowl.at) / 2], undefined, [1, 1, bowl.at - basin.wall]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.sandstone,
    cone(0.35, bowl.radius, 16),
    f.at([0, 0, bowl.at - 0.15], undefined, [1, 1, 0.3]),
    'stone',
    { solid: false },
  );
  b.pieces.add(
    P.sandstone,
    torus(bowl.radius - 0.04, 0.07, 24, 5),
    f.at([0, 0, bowl.at], [Math.PI / 2, 0, 0]),
    'stone',
    { solid: false },
  );
  b.stillDisc(f, [0, 0, bowl.at + 0.01], bowl.radius - 0.08);
  // Lo que rebosa de la taza cae en chorros que se abren hasta la pila: cada uno, una curva de tramos de agua.
  const spouts = 16;
  for (let k = 0; k < spouts; k++) {
    const a = ((k + 0.5) / spouts) * Math.PI * 2;
    const point = (t: number): Triple => {
      const r = bowl.radius + 0.05 + 0.45 * t;
      return [Math.sin(a) * r, Math.cos(a) * r, bowl.at - (bowl.at - basin.wall) * t * t];
    };
    for (let s = 0; s < 4; s++) {
      waterLine(b, f, point(s / 4), point((s + 1) / 4), 0.09);
    }
  }
  // La Lectora: una Ool de piedra, ya mayor, leyendo un libro abierto, sobre un zócalo en medio de la taza.
  b.pieces.add(
    P.sandstone,
    cylinder(0.3, 10),
    f.at([0, 0, (bowl.at + statue.at) / 2], undefined, [1, 1, statue.at - bowl.at]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.sandstone,
    oolShape({ id: 'lectora', age: 0.6, outfit: 'ninguna', holding: 'libro', seed: 5 }),
    f.at([0, 0, statue.at], undefined, [statue.scale, statue.scale, statue.scale]),
    'stone',
    { solid: false, vary: 0.04 },
  );
  // La cara, tallada más oscura para que se lea de lejos: los ojos grandes de los Ool.
  for (const x of [-0.11, 0.11]) {
    b.pieces.add(
      '#7a5636', // arenisca a la sombra
      ball(1, 1),
      f.at([x * statue.scale, 0.262 * statue.scale, statue.at + 1.07 * statue.scale], undefined, [
        0.075 * statue.scale,
        0.035 * statue.scale,
        0.095 * statue.scale,
      ]),
      'stone',
      { solid: false, vary: 0 },
    );
  }
  // El agua cae de las páginas (el libro, delante, a la altura del pecho) a la taza: dos chorros, uno por página.
  // Las páginas, más claras que la piedra, y el agua que cae de su canto de abajo: un chorro por página.
  for (const side of [-1, 1]) {
    b.pieces.add(
      P.cream,
      box(),
      f.at(
        [side * 0.085 * statue.scale, 0.3 * statue.scale, statue.at + 0.56 * statue.scale],
        [0.55, side * 0.25, 0],
        [0.16 * statue.scale, 0.02, 0.22 * statue.scale],
      ),
      'stone',
      { solid: false, vary: 0 },
    );
    const x = side * 0.12 * statue.scale;
    const y = 0.36 * statue.scale;
    waterLine(b, f, [x, y, statue.at + 0.47 * statue.scale], [x * 1.1, y + 0.08, bowl.at], 0.06);
  }
  // Los filamentos de piedra, con su luz (dicen los críos que se encienden si le preguntas algo en voz baja).
  for (let k = 0; k < 3; k++) {
    const a = ((k - 1) / 1) * 0.35;
    b.pieces.add(
      P.glow,
      ball(0.05, 1),
      f.at([Math.sin(a) * 0.32, -0.05, statue.at + 1.36 * statue.scale + Math.cos(a) * 0.05]),
      'light',
      { glow: 1.5, vary: 0 },
    );
  }
  foam(b, f);
}

/**
 * Un tramo de agua que cae, de `from` a `to`: el agua (transparente) y, dentro, un hilo claro que brilla, para que se
 * lea como agua y no como una barra.
 */
function waterLine(b: HogarBuilder, f: Frame, from: Triple, to: Triple, width: number): void {
  b.still.push(
    box()
      .clone()
      .applyMatrix4(f.base.clone().multiply(rampMatrix(from, to, width, width * 0.4, 0))),
  );
  b.pieces.add(
    '#d8f6ff',
    box(),
    f.base.clone().multiply(rampMatrix(from, to, width * 0.3, width * 0.15, 0)),
    'light',
    { glow: 1.05, vary: 0.04, solid: false },
  );
}

/** La espuma donde cae el agua: gotas claras que giran despacio al pie de la cortina y de los chorros. */
function foam(b: HogarBuilder, f: Frame): void {
  const { basin, bowl, statue } = FOUNTAIN;
  const up = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  const ring = b.spinner('ANIM_Ciudad_Espuma', f, [0, 0, basin.wall + 0.04], up, 0.6);
  // En el marco de la pieza que gira, Y es la vertical.
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2 + b.random() * 0.15;
    const r = bowl.radius + 0.25 + b.random() * 0.35;
    const s = 0.05 + b.random() * 0.06;
    ring.add(
      '#e8fbff',
      ball(1, 0),
      pieceMatrix(
        [Math.cos(a) * r, b.random() * 0.06, Math.sin(a) * r],
        [0, a, 0],
        [s * 1.6, s * 0.5, s],
      ),
      'light',
      { glow: 1.1, vary: 0.05, solid: false },
    );
  }
  const splash = b.spinner(
    'ANIM_Ciudad_Salpica',
    f,
    [0, 0.3 * statue.scale + 0.08, bowl.at + 0.03],
    up,
    -1.1,
  );
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const r = 0.18 + b.random() * 0.12;
    splash.add(
      '#e8fbff',
      ball(0.04, 0),
      pieceMatrix([Math.cos(a) * r, 0.02, Math.sin(a) * r]),
      'light',
      {
        glow: 1.2,
        vary: 0.05,
        solid: false,
      },
    );
  }
}

/** La ciudad: el mercado, la fuente de la Lectora, dos corros de casas y su gente. */
function ciudad(b: HogarBuilder): void {
  const f = b.site('ciudad');
  b.pieces.add(P.paving, cylinder(8, 28), f.at([0, 0, 0.012], undefined, [1, 1, 0.02]), 'stone', {
    solid: false,
  });
  // Cuatro calles empedradas hacia fuera.
  for (const a of [0, 90, 180, 270]) {
    const r = a * DEG;
    b.pieces.add(
      P.path,
      box(),
      f.at([Math.sin(r) * 16, Math.cos(r) * 16, 0.01], [0, 0, -r], [2.4, 16, 0.02]),
      'stone',
      { solid: false },
    );
  }
  lectora(b, f);
  b.source('hogar.lectora', 'objeto', f, [0, 1.6, 1.0]);
  // El mercado alrededor de la fuente.
  stall(b, f, [-4.5, 3.5, 0], -50, 'calabazas');
  stall(b, f, [4.6, 3.4, 0], 50, 'bulbos');
  stall(b, f, [-4.6, -3.6, 0], -130, 'telas');
  stall(b, f, [4.4, -3.8, 0], 130, 'pan');
  b.ool(
    { id: 'frutera', age: 0.45, outfit: 'vecino', holding: 'cesta', seed: 61 },
    f,
    [-5.4, 4.6, 0],
    140,
  );
  b.ool({ id: 'farolero', age: 0.3, outfit: 'mecanica', seed: 62 }, f, [5.6, 4.4, 0], 220);
  b.ool({ id: 'sastra', age: 0.65, outfit: 'tejedora', seed: 63 }, f, [-5.6, -4.6, 0], 40);
  b.ool({ id: 'panadero', age: 0.5, outfit: 'vecino', seed: 64 }, f, [5.4, -4.8, 0], 320);
  b.ool({ id: 'nino_ciudad', age: 0.1, outfit: 'cria', seed: 65 }, f, [1.8, -2.6, 0], 30);
  b.ool({ id: 'nina_ciudad', age: 0.14, outfit: 'ninguna', seed: 66 }, f, [2.6, -1.6, 0], 230);
  // El anciano del banco, casi sin luz.
  b.pieces.add(P.wood, box(), f.at([-2.8, -6.6, 0.42], [0, 0, 0.2], [1.8, 0.45, 0.08]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.woodDark, box(), f.at([-2.8, -6.6, 0.2], [0, 0, 0.2], [1.6, 0.35, 0.4]), 'stone', {
    solid: true,
  });
  b.ool({ id: 'anciano_ciudad', age: 1, outfit: 'vecino', seed: 67 }, f, [-2.4, -7.4, 0], 10);
  ringOfHouses(b, f, [0, 0, 0], 11.5, 12, { skip: [0, 90, 180, 270], tall: 0.5 });
  ringOfHouses(b, f, [0, 0, 0], 19.5, 18, { skip: [0, 90, 180, 270], size: 1.1, tall: 0.35 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    b.bulbLamp(f, [Math.sin(a) * 8.6, Math.cos(a) * 8.6, 0], 2.6, k % 2 === 0);
  }
  for (const a of [0, 90, 180, 270]) {
    const r = a * DEG;
    for (const d of [14, 22]) {
      b.bulbLamp(
        f,
        [Math.sin(r) * d + Math.cos(r) * 1.6, Math.cos(r) * d - Math.sin(r) * 1.6, 0],
        2.4,
      );
    }
  }
}

export function buildTown(b: HogarBuilder): void {
  aldea(b);
  ciudad(b);
}
