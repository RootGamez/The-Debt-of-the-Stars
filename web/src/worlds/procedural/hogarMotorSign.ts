// El cartel del Motor (hogar.motor_cartel, plan de los finales §4.1; 🟡 el aspecto): un cartel de obra y de propaganda
// del Instituto junto a la caseta de mando, de cara a quien llega desde el Instituto. Dos postes con musgo, un tablero
// con su tejadillo y dos bombillas, y pintado encima: el titular en una franja verde azulada, la Puerta Mayor en su
// colina echando rayos de luz sobre las casas de la ciudad (con las ventanas encendidas), la letra pequeña del aviso
// («no pasen del aro») y, a un lado, lo que dibujó una cría: una bombilla con rayos y un Ool con los brazos en alto.
// Las letras son trazos sueltos, sin texto legible (lo que dice está en la fuente, en los dos idiomas).
import { ball, box, cylinder, Frame, torusArc, type Triple } from './kit';
import { HOGAR_PALETTE as P, type HogarBuilder } from './hogarKit';
import { seededRandom, type Random } from './noise';

const DEG = Math.PI / 180;

/** Dónde está (m, marco del Motor) y hacia dónde mira la cara pintada: hacia el Instituto y un poco hacia el aro. */
export const MOTOR_SIGN = {
  at: [-7.6, 0.4] as const,
  /** Dirección (en el suelo del Motor) en la que queda quien lo lee. */
  facing: [0.45, 0.9] as const,
};

/** El tablero: ancho, alto y altura de su borde de abajo (m). */
const PANEL = { width: 2.5, height: 1.4, bottom: 1.05 } as const;
const PANEL_Z = PANEL.bottom + PANEL.height / 2;
/** La cara pintada (la de delante, hacia −Y del marco del cartel) y el grosor de cada capa de pintura. */
const FACE = -0.045;
const COAT = 0.003;

/**
 * El marco del cartel: origen en el suelo entre los postes, −Y hacia quien lo lee y X a su derecha (así lo pintado se
 * coloca como se ve).
 */
function signFrame(f: Frame): Frame {
  const [x, y] = MOTOR_SIGN.at;
  const [fx, fy] = MOTOR_SIGN.facing;
  // El −Y del cartel girado `yaw` queda en (sen yaw, −cos yaw): que apunte a `facing`.
  const yaw = Math.atan2(fx, -fy);
  return new Frame(f.at([x, y, 0], [0, 0, yaw]));
}

/** Una capa de pintura plana (caja o disco) en (x, z) de la cara, `layer` capas por delante. */
function paint(
  b: HogarBuilder,
  s: Frame,
  color: string,
  at: readonly [number, number],
  size: readonly [number, number],
  layer: number,
  turn = 0,
  round = false,
): void {
  const y = FACE - COAT * (layer + 0.5);
  const m = round
    ? s.at([at[0], y, at[1]], [Math.PI / 2, turn, 0], [size[0], size[1], COAT * 0.8])
    : s.at([at[0], y, at[1]], [0, turn, 0], [size[0], COAT * 0.8, size[1]]);
  b.pieces.add(color, round ? cylinder(1, 14) : box(), m, 'stone', { solid: false, vary: 0.01 });
}

/** Un trazo de pintura de `a` a `c` (x, z) de la cara. */
function stroke(
  b: HogarBuilder,
  s: Frame,
  color: string,
  a: readonly [number, number],
  c: readonly [number, number],
  width: number,
  layer: number,
): void {
  const dx = c[0] - a[0];
  const dz = c[1] - a[1];
  paint(
    b,
    s,
    color,
    [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2],
    [Math.hypot(dx, dz) + width * 0.6, width],
    layer,
    -Math.atan2(dz, dx),
  );
}

/** Postes, tablero, marco, tejadillo con musgo y las dos bombillas que lo alumbran. */
function structure(b: HogarBuilder, s: Frame): void {
  const top = PANEL.bottom + PANEL.height;
  for (const x of [-1.0, 1.0]) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.07, 7),
      s.at([x, 0.1, (top + 0.25) / 2], undefined, [1, 1, top + 0.25]),
      'stone',
      { solid: true },
    );
    b.pieces.add(P.moss, ball(0.1, 0), s.at([x, 0.1, top + 0.3]), 'stone', { solid: false });
  }
  b.pieces.add(
    P.wood,
    box(),
    s.at([0, 0, PANEL_Z], undefined, [PANEL.width, 0.07, PANEL.height]),
    'stone',
    { solid: true },
  );
  b.pieces.add(
    P.cream,
    box(),
    s.at([0, FACE + 0.005, PANEL_Z], undefined, [PANEL.width - 0.1, 0.01, PANEL.height - 0.08]),
    'stone',
    { solid: false, vary: 0.01 },
  );
  // El marco, de listones.
  for (const z of [PANEL.bottom, top]) {
    b.pieces.add(
      P.woodDark,
      box(),
      s.at([0, -0.04, z], undefined, [PANEL.width + 0.12, 0.05, 0.08]),
      'stone',
      { solid: false },
    );
  }
  for (const x of [-1, 1]) {
    b.pieces.add(
      P.woodDark,
      box(),
      s.at([x * (PANEL.width / 2 + 0.02), -0.04, PANEL_Z], undefined, [0.08, 0.05, PANEL.height]),
      'stone',
      { solid: false },
    );
  }
  // El tejadillo, inclinado hacia delante, con su manta de musgo y unas matas.
  const roof = new Frame(s.at([0, -0.08, top + 0.14], [0.28, 0, 0]));
  b.pieces.add(P.woodDark, box(), roof.at([0, 0, 0], undefined, [2.85, 0.5, 0.05]), 'stone', {
    solid: false,
  });
  b.pieces.add(P.moss, box(), roof.at([0, 0.02, 0.045], undefined, [2.75, 0.42, 0.05]), 'stone', {
    solid: false,
  });
  for (const [x, size] of [
    [-0.9, 0.13],
    [0.15, 0.1],
    [1.05, 0.12],
  ] as const) {
    b.pieces.add(P.mossDark, ball(size, 0), roof.at([x, 0.05, 0.08]), 'stone', { solid: false });
  }
  // Las dos bombillas, colgadas del alero sobre lo pintado.
  for (const x of [-0.75, 0.75]) {
    b.pieces.add(
      P.woodDark,
      cylinder(0.012, 4),
      s.at([x, -0.3, top + 0.02], undefined, [1, 1, 0.16]),
      'stone',
      { solid: false },
    );
    b.pieces.add(P.glowWarm, ball(0.06, 0), s.at([x, -0.3, top - 0.08]), 'light', {
      glow: 1.6,
      vary: 0,
    });
  }
}

/**
 * Una letra de la escritura de casa, sin leerse (lo que dice está en la fuente): un palo que cuelga de la raya de la
 * palabra, más o menos largo, y un adorno (un punto, un gancho o una tilde), al azar pero siempre los mismos.
 */
function letter(
  b: HogarBuilder,
  s: Frame,
  random: Random,
  x: number,
  top: number,
  h: number,
  color: string,
  layer: number,
): void {
  const t = h * 0.17;
  const w = h * 0.3;
  const stem = x + (random() < 0.5 ? -w : w) * 0.5;
  const low = top - h * (0.55 + random() * 0.45);
  stroke(b, s, color, [stem, top], [stem, low], t, layer);
  const accent = random();
  const side = stem < x ? 1 : -1;
  if (accent < 0.35) {
    paint(b, s, color, [stem + side * w, low + t * 0.6], [t * 0.75, t * 0.75], layer, 0, true);
  } else if (accent < 0.7) {
    stroke(b, s, color, [stem, low], [stem + side * w * 1.1, low], t, layer);
  } else {
    stroke(b, s, color, [stem, top - h * 0.3], [stem + side * w, top - h * 0.55], t * 0.9, layer);
  }
}

/**
 * Una línea de la escritura de casa: cada palabra, una raya arriba de la que cuelgan sus letras. `words` da cuántas
 * letras tiene cada una; la línea va centrada en la cara.
 */
function line(
  b: HogarBuilder,
  s: Frame,
  random: Random,
  words: readonly number[],
  z: number,
  h: number,
  color: string,
  layer: number,
): void {
  const step = h * 0.62;
  const gap = h * 0.55;
  const length = words.reduce((sum, n) => sum + n * step, 0) + gap * (words.length - 1);
  const top = z + h / 2;
  let cursor = -length / 2;
  for (const n of words) {
    const width = n * step;
    stroke(b, s, color, [cursor, top], [cursor + width, top], h * 0.17, layer);
    for (let k = 0; k < n; k++) {
      letter(b, s, random, cursor + (k + 0.5) * step, top, h, color, layer);
    }
    cursor += width + gap;
  }
}

/** La letra pequeña: cada palabra, una raya fina. */
function smallPrint(
  b: HogarBuilder,
  s: Frame,
  words: readonly number[],
  x: number,
  z: number,
  layer: number,
): void {
  const letterWidth = 0.028;
  let cursor = x;
  for (const n of words) {
    const w = n * letterWidth;
    paint(b, s, P.slate, [cursor + w / 2, z], [w, 0.022], layer);
    cursor += w + letterWidth;
  }
}

/** El dibujo: la Puerta Mayor en su colina, sus rayos y la ciudad con las ventanas encendidas. */
function picture(b: HogarBuilder, s: Frame): void {
  const left = -1.18;
  const right = 0.5;
  const mid = (left + right) / 2;
  paint(b, s, P.sky, [mid, 1.645], [right - left, 0.63], 1);
  paint(b, s, P.grass, [mid, 1.405], [right - left, 0.15], 3);
  // La Puerta Mayor: el aro de latón (con su hueco, como el de verdad) y su luz dentro.
  const ring: readonly [number, number] = [-0.8, 1.66];
  paint(b, s, P.glowWarm, ring, [0.17, 0.17], 4, 0, true);
  b.pieces.add(
    P.brass,
    torusArc(0.2, 0.032, 75 * DEG, 395 * DEG, 28, 4),
    s.at([ring[0], FACE - COAT * 6.5, ring[1]], undefined, [1, 0.06, 1]),
    'metal',
    { solid: false },
  );
  // Las casas: [x, ancho, alto, tela].
  const houses: readonly [number, number, number, string][] = [
    [-0.13, 0.13, 0.13, P.ochre],
    [0.02, 0.12, 0.18, P.rust],
    [0.165, 0.14, 0.11, P.teal],
    [0.31, 0.11, 0.16, P.plum],
    [0.435, 0.1, 0.1, P.sage],
  ];
  const ground = 1.48;
  // Los rayos, del aro a cada casa (por detrás de ellas).
  houses.forEach(([x, , h], k) => {
    const a = (24 - k * 12) * DEG;
    const from: readonly [number, number] = [
      ring[0] + Math.cos(a) * 0.23,
      ring[1] + Math.sin(a) * 0.23,
    ];
    stroke(b, s, P.glowWarm, from, [x, ground + h * 0.7], 0.022, 3);
  });
  stroke(b, s, P.glowWarm, [ring[0] + 0.21, ring[1] + 0.1], [0.25, 1.9], 0.022, 3);
  stroke(b, s, P.glowWarm, [ring[0] + 0.17, ring[1] + 0.16], [-0.25, 1.93], 0.018, 3);
  for (const [x, w, h, color] of houses) {
    paint(b, s, P.moss, [x, ground + h], [w / 2, w / 2.2], 4, 0, true);
    paint(b, s, color, [x, ground + h / 2], [w, h], 5);
    b.pieces.add(
      P.glowWarm,
      box(),
      s.at([x, FACE - COAT * 7, ground + h * 0.55], undefined, [w * 0.28, COAT, w * 0.28]),
      'light',
      { glow: 1.25, vary: 0 },
    );
  }
}

/** Lo que dibujó una cría a un lado: una bombilla con rayos y, debajo, un Ool con los brazos en alto. */
function childDrawing(b: HogarBuilder, s: Frame): void {
  const x = 0.86;
  const bulb: readonly [number, number] = [x, 1.76];
  paint(b, s, P.straw, bulb, [0.075, 0.09], 2, 0, true);
  paint(b, s, P.slate, [x, 1.645], [0.05, 0.04], 2);
  for (let k = 0; k < 9; k++) {
    const a = (-30 + k * 30) * DEG;
    const from: readonly [number, number] = [
      bulb[0] + Math.cos(a) * 0.12,
      bulb[1] + Math.sin(a) * 0.13,
    ];
    const to: readonly [number, number] = [
      bulb[0] + Math.cos(a) * 0.18,
      bulb[1] + Math.sin(a) * 0.19,
    ];
    stroke(b, s, P.ochre, from, to, 0.014, 2);
  }
  // El Ool: cabeza con antenas y ojos, cuerpo, brazos en alto y piernas, todo de una cera.
  const ool = P.teal;
  paint(b, s, ool, [x, 1.42], [0.05, 0.048], 2, 0, true);
  paint(b, s, ool, [x, 1.29], [0.06, 0.075], 2, 0, true);
  for (const side of [-1, 1]) {
    stroke(b, s, P.slate, [x + side * 0.018, 1.43], [x + side * 0.018, 1.43], 0.012, 3);
    stroke(b, s, ool, [x + side * 0.012, 1.465], [x + side * 0.03, 1.51], 0.01, 2);
    stroke(b, s, ool, [x + side * 0.045, 1.32], [x + side * 0.11, 1.44], 0.016, 2);
    stroke(b, s, ool, [x + side * 0.022, 1.22], [x + side * 0.035, 1.14], 0.016, 2);
  }
}

/** El cartel del Motor, entero, con su marca de lectura en el centro de lo pintado. */
export function buildMotorSign(b: HogarBuilder, f: Frame): void {
  const s = signFrame(f);
  const random = seededRandom(4703);
  structure(b, s);
  // El titular, en dos líneas: «El Motor dará luz / a toda la ciudad».
  paint(b, s, P.teal, [0, 2.205], [PANEL.width - 0.14, 0.4], 1);
  line(b, s, random, [2, 5, 4, 3], 2.3, 0.13, P.cream, 2);
  line(b, s, random, [1, 4, 2, 6], 2.11, 0.13, P.cream, 2);
  picture(b, s);
  // «Mientras dure la obra, no pasen del aro. / Gracias por la paciencia.»
  smallPrint(b, s, [8, 4, 2, 4, 2, 5, 3, 3], -1.13, 1.25, 1);
  smallPrint(b, s, [7, 3, 2, 9], -1.13, 1.17, 1);
  childDrawing(b, s);
  const mark: Triple = [0, -0.35, PANEL_Z];
  b.source('hogar.motor_cartel', 'texto', s, mark);
}
