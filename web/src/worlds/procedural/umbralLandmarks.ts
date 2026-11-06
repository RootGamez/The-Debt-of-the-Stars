// Las estructuras nuevas de Umbral (Fase 11, 🟡 todas): lugares sin fuentes que dan vida y referencias a la
// planicie. Siguen la gramática de los Ausentes —anillos y estratos, arenisca, metal pizarra, luz ámbar— y se
// apoyan en sus propias explanadas, lejos de los lugares con pistas y del sitio de la nave.
import { Color, type BufferGeometry } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  Frame,
  geometryFrom,
  pieceMatrix,
  torus,
  torusArc,
  type PieceSet,
  type PlaceOptions,
  type Triple,
} from './kit';
import { seededRandom } from './noise';
import { bellsChannel, bellsLectern, bellsMarks, bellsRack } from './umbralBells';
import { PALETTE as P } from './umbralPalette';

/** Brillo del faro de la Atalaya: se ve desde la otra punta de la planicie. */
const BEACON_GLOW = 5;

export interface LandmarkSite extends PlaceOptions {
  lat: number;
  lon: number;
  /** Radio de su explanada y del borde donde el suelo vuelve a su relieve (m). */
  pad: number;
  falloff?: number;
}

/** Dónde va cada estructura nueva (marco de Blender: lat/lon como en blender/marcas). */
export const LANDMARKS = {
  tower: { lat: 18, lon: -20, heading: 60, footprint: 3, pad: 5, falloff: 4 },
  amphitheatre: { lat: -28, lon: 145, heading: 189, footprint: 6, pad: 11.5, falloff: 5 },
  fallen: { lat: -30, lon: 60, heading: 20, pad: 7, falloff: 5 },
  station: { lat: 63, lon: 100, heading: 190, footprint: 3, pad: 5.5, falloff: 4 },
  silos: { lat: -16, lon: 38.5, heading: 0, footprint: 5, pad: 7, falloff: 4 },
} as const satisfies Record<string, LandmarkSite>;

export type LandmarkId = keyof typeof LANDMARKS;

/** Lo que las estructuras necesitan del constructor de Umbral. */
export interface LandmarkBuilder {
  readonly pieces: PieceSet;
  place(site: PlaceOptions & { lat: number; lon: number }): Frame;
  mark(name: string, frame: Frame, at: Triple, props?: Record<string, string | number>): void;
  lamp(f: Frame, x: number, y: number, z?: number): void;
  strata(
    f: Frame,
    center: Triple,
    layers: readonly (readonly [number, number, string])[],
    sides?: number,
  ): void;
}

/**
 * Corona circular (un anillo grueso) centrada en el origen, de `-height/2` a `height/2`, entre los ángulos
 * `from` y `to` (radianes, desde +X hacia +Y). Sin cara de abajo: siempre se apoya en algo.
 */
export function annulus(
  inner: number,
  outer: number,
  height: number,
  sides = 24,
  from = 0,
  to = Math.PI * 2,
): BufferGeometry {
  const p: number[] = [];
  const top = height / 2;
  const bottom = -height / 2;
  const full = Math.abs(to - from - Math.PI * 2) < 1e-6;
  const at = (r: number, a: number, z: number): Triple => [Math.cos(a) * r, Math.sin(a) * r, z];
  const quad = (a: Triple, b: Triple, c: Triple, d: Triple): void => {
    p.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  for (let k = 0; k < sides; k++) {
    const a0 = from + ((to - from) * k) / sides;
    const a1 = from + ((to - from) * (k + 1)) / sides;
    quad(at(inner, a0, top), at(outer, a0, top), at(outer, a1, top), at(inner, a1, top));
    quad(at(outer, a0, bottom), at(outer, a1, bottom), at(outer, a1, top), at(outer, a0, top));
    quad(at(inner, a0, bottom), at(inner, a0, top), at(inner, a1, top), at(inner, a1, bottom));
  }
  if (!full) {
    quad(
      at(inner, from, bottom),
      at(outer, from, bottom),
      at(outer, from, top),
      at(inner, from, top),
    );
    quad(at(inner, to, bottom), at(inner, to, top), at(outer, to, top), at(outer, to, bottom));
  }
  return geometryFrom(p);
}

/** Un marco desplazado y girado dentro de otro (para piezas inclinadas o tumbadas). */
function inner(f: Frame, position: Triple, rotation: Triple): Frame {
  return new Frame(f.base.clone().multiply(pieceMatrix(position, rotation)));
}

/**
 * Un anillo de pie, abierto por abajo para pasar por dentro: arco de dovelas, aro de pizarra y dos pies de
 * piedra que se hunden en el suelo. Su eje es +Y del marco (se cruza caminando hacia el rumbo).
 */
export function standingRing(b: LandmarkBuilder, f: Frame, radius: number, seed: number): void {
  const v = b.pieces;
  const random = seededRandom(seed);
  const center = radius + 0.15;
  const count = Math.round(radius * 9);
  const length = ((2 * Math.PI * radius) / count) * 0.92;
  for (let k = 0; k < count; k++) {
    const a = (2 * Math.PI * k) / count;
    if (Math.sin(a) < -0.2) continue; // abierto por abajo: se pasa por dentro
    const top = Math.abs(a - Math.PI / 2) < 0.01;
    v.add(
      top ? P.sandstoneLight : k % 2 ? P.sandstone : P.sandstoneShade,
      box(),
      f.at(
        [Math.cos(a) * radius, 0, center + Math.sin(a) * radius],
        [0, -(a + Math.PI / 2), 0],
        [length, top ? 0.75 : 0.6, top ? 0.7 : 0.5 + random() * 0.08],
      ),
    );
  }
  v.add(
    P.slate,
    torusArc(radius - 0.3, 0.07, -0.2, Math.PI + 0.2, 32, 4),
    f.at([0, 0, center]),
    'metal',
    { solid: false },
  );
  for (const side of [-1, 1]) {
    v.add(P.rock, box(), f.at([side * radius, 0, -0.2], undefined, [1.0, 0.9, 1.2]));
    v.add(P.slate, box(), f.at([side * radius, 0, 0.42], undefined, [1.06, 0.96, 0.06]), 'metal');
    v.add(
      P.amber,
      box(),
      f.at([side * radius, 0.47, 0.15], undefined, [0.22, 0.02, 0.22]),
      'metal',
    );
  }
}

/** La Vía de los Anillos: anillos de pie, cada vez más pequeños, que acompañan el camino. */
export function ringWay(
  b: LandmarkBuilder,
  stops: readonly { lat: number; lon: number; heading: number }[],
): void {
  stops.forEach((stop, k) => {
    const radius = 2.6 - k * 0.25;
    const f = b.place({ ...stop, footprint: radius, sink: 0.15 });
    standingRing(b, f, radius, 70 + k);
  });
}

/** La Atalaya: torre de estratos con un faro ámbar arriba, visible desde lejos. */
export function watchtower(b: LandmarkBuilder): void {
  const f = b.place(LANDMARKS.tower);
  const v = b.pieces;
  b.strata(
    f,
    [0, 0, 1.0],
    [
      [3.2, 0.3, P.sandstoneLight],
      [3.35, 0.12, P.slate],
      [3.5, 0.6, P.sandstone],
      [3.7, 1.6, P.rock],
    ],
    18,
  );
  // El fuste: tambores que adelgazan, con bandas de pizarra.
  let z = 1.0;
  const drums = [
    [1.9, 2.2, P.sandstone],
    [1.75, 0.18, P.slate],
    [1.7, 2.4, P.sandstoneShade],
    [1.55, 0.18, P.slate],
    [1.5, 2.6, P.sandstone],
    [1.35, 0.18, P.slate],
    [1.3, 2.2, P.sandstoneLight],
  ] as const;
  for (const [radius, height, tone] of drums) {
    v.add(
      tone,
      cylinder(radius, 14),
      f.at([0, 0, z + height / 2], undefined, [1, 1, height]),
      tone === P.slate ? 'metal' : 'stone',
    );
    z += height;
  }
  // Ventanas estrechas en espiral.
  for (let k = 0; k < 7; k++) {
    const a = k * 1.7;
    const r = 1.82 - k * 0.07;
    v.add(
      P.violet,
      box(),
      f.at([Math.cos(a) * r, Math.sin(a) * r, 2.0 + k * 1.3], [0, 0, a], [0.06, 0.32, 0.75]),
      'stone',
      { solid: false },
    );
  }
  // La linterna: plataforma, columnas, cúpula y el faro.
  v.add(P.sandstoneLight, cylinder(1.9, 16), f.at([0, 0, z + 0.12], undefined, [1, 1, 0.24]));
  v.add(P.slate, torus(1.9, 0.06, 32, 4), f.at([0, 0, z + 0.26], [Math.PI / 2, 0, 0]), 'metal');
  for (let k = 0; k < 6; k++) {
    const a = (2 * Math.PI * k) / 6;
    v.add(
      P.slate,
      cylinder(0.09, 6),
      f.at([Math.cos(a) * 1.5, Math.sin(a) * 1.5, z + 1.1], undefined, [1, 1, 1.7]),
      'metal',
    );
  }
  v.add(P.ochre, cone(1.95, 0.15, 16), f.at([0, 0, z + 2.3], undefined, [1, 1, 0.9]));
  v.add(P.amber, torus(0.25, 0.05, 12, 4), f.at([0, 0, z + 2.9], [Math.PI / 2, 0, 0]), 'metal');
  v.add(P.light, ball(0.75, 1), f.at([0, 0, z + 1.05]), 'light', { glow: BEACON_GLOW, vary: 0 });
  v.add(P.amber, torus(0.85, 0.06, 24, 4), f.at([0, 0, z + 1.05], [0, 0, 0.4]), 'metal', {
    solid: false,
  });
  // La puerta (cerrada) y un banco de piedra para esperar el faro.
  v.add(P.violet, box(), f.at([0, 1.88, 1.9], undefined, [0.9, 0.12, 1.7]), 'stone', {
    solid: false,
  });
  v.add(P.sandstoneShade, torusArc(0.45, 0.08, 0, Math.PI, 12, 4), f.at([0, 1.94, 2.75]), 'stone', {
    solid: false,
  });
  v.add(P.sandstoneShade, box(), f.at([1.6, 2.05, 1.22], [0, 0, -0.6], [1.4, 0.45, 0.45]));
  b.lamp(f, -2.6, 2.2, 1.0);
}

/** El Anfiteatro: gradas en anillos alrededor de un anillo tumbado, con una entrada a ras de suelo. */
export function amphitheatre(b: LandmarkBuilder): void {
  const f = b.place(LANDMARKS.amphitheatre);
  const v = b.pieces;
  // Hueco de entrada hacia −Y: con el rumbo 189 da a las Casas, de donde llega el camino.
  const gap = 0.32;
  const from = -Math.PI / 2 + gap;
  const to = (3 * Math.PI) / 2 - gap;
  v.add(P.sandstoneLight, cylinder(4.6, 24), f.at([0, 0, 0.02], undefined, [1, 1, 0.1]), 'stone', {
    solid: false,
  });
  const tiers = [
    [4.8, 6.0, 0.45, P.sandstone],
    [6.0, 7.2, 0.9, P.sandstoneShade],
    [7.2, 8.4, 1.35, P.sandstone],
    [8.4, 9.6, 1.8, P.sandstoneShade],
  ] as const;
  for (const [r0, r1, height, tone] of tiers) {
    v.add(tone, annulus(r0, r1, height + 0.6, 40, from, to), f.at([0, 0, height / 2 - 0.3]));
    v.add(
      P.slate,
      annulus(r0 - 0.03, r0 + 0.12, 0.05, 40, from, to),
      f.at([0, 0, height + 0.025]),
      'metal',
      { solid: false },
    );
  }
  // El anillo tumbado del centro, sobre cuatro bloques, y su marca ámbar.
  for (let k = 0; k < 4; k++) {
    const a = (2 * Math.PI * k) / 4 + Math.PI / 4;
    v.add(
      P.rock,
      box(),
      f.at([Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.3], [0, 0, a], [0.7, 0.5, 0.5]),
    );
  }
  v.add(P.slate, torus(2.2, 0.18, 40, 6), f.at([0, 0, 0.72], [Math.PI / 2, 0, 0]), 'metal');
  for (let k = 0; k < 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    v.add(
      k % 3 ? P.porcelain : P.amber,
      box(),
      f.at([Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.92], [0, 0, a], [0.06, 0.3, 0.04]),
      'metal',
    );
  }
  v.add(P.sandstoneLight, cylinder(0.5, 10), f.at([0, 0, 0.35], undefined, [1, 1, 0.5]));
  v.add(P.light, ball(0.18, 1), f.at([0, 0, 0.72]), 'light', { glow: 3, vary: 0 });
  // Postes de entrada con su luz.
  for (const side of [-1, 1]) {
    const x = side * 5.6 * Math.sin(gap);
    b.lamp(f, x * 1.25, -10.3, 0);
  }
  // El canal de las campanas (P1), su estante y el atril cerrado.
  bellsChannel(b, f);
  bellsRack(b, f);
  bellsLectern(b, f);
  bellsMarks(b, f);
}

/** El Anillo Caído: un primer anillo roto, medio enterrado, con dovelas sueltas por la arena. */
export function fallenRing(b: LandmarkBuilder): void {
  const f = b.place(LANDMARKS.fallen);
  const v = b.pieces;
  const random = seededRandom(83);
  const radius = 3.4;
  // Tumbado hacia un lado y hundido: la mitad de abajo queda bajo tierra.
  const ring = inner(f, [0, 0, 1.2], [0.35, 0, 0.25]);
  const count = 30;
  const length = ((2 * Math.PI * radius) / count) * 0.92;
  for (let k = 0; k < count; k++) {
    const a = (2 * Math.PI * k) / count;
    if (a > 1.2 && a < 2.1) continue; // la rotura
    v.add(
      k % 2 ? P.sandstoneShade : P.rockLight,
      box(),
      ring.at(
        [Math.cos(a) * radius, 0, Math.sin(a) * radius],
        [random() * 0.08, -(a + Math.PI / 2), random() * 0.08],
        [length, 0.9, 0.85],
      ),
      'stone',
      { vary: 0.08 },
    );
  }
  v.add(
    P.slateLight,
    torusArc(radius - 0.55, 0.15, 2.3, 2 * Math.PI + 0.9, 32, 5),
    ring.at([0, 0, 0]),
    'metal',
  );
  // Las dovelas caídas, rodadas por la arena.
  for (let k = 0; k < 9; k++) {
    const a = 1.3 + random() * 1.4;
    const d = radius + 1 + random() * 4;
    v.add(
      random() < 0.5 ? P.sandstoneShade : P.rockLight,
      box(),
      f.at(
        [Math.cos(a) * d, Math.sin(a) * d, 0.2],
        [random() * 0.5, random() * 0.5, random() * Math.PI],
        [length, 0.9, 0.7],
      ),
      'stone',
      { vary: 0.1 },
    );
  }
  // Un trozo del aro de pizarra, doblado, y la arena que se ha ido amontonando.
  v.add(
    P.slate,
    torusArc(1.5, 0.12, 0, 1.6, 12, 5),
    f.at([-3.5, -2.5, 0.1], [1.4, 0.3, 0.6]),
    'metal',
  );
  for (let k = 0; k < 5; k++) {
    const a = random() * Math.PI * 2;
    v.add(
      P.deepSand,
      ball(1, 1),
      f.at(
        [Math.cos(a) * 2.6, Math.sin(a) * 2.6, -0.35],
        [0, 0, a],
        [1.6 + random(), 1.0 + random() * 0.6, 0.6],
      ),
      'stone',
      { solid: false, vary: 0.04 },
    );
  }
}

/** La Estación del Hielo: un tambor al borde del casquete con una antena de anillo y sus luces. */
export function iceStation(b: LandmarkBuilder): void {
  const f = b.place({ ...LANDMARKS.station, sink: 0.2 });
  const v = b.pieces;
  v.add(P.sandstoneShade, cylinder(3.0, 14), f.at([0, 0, 0.1], undefined, [1, 1, 0.6]));
  v.add(P.sandstone, cylinder(2.4, 14), f.at([0, 0, 1.55], undefined, [1, 1, 2.5]));
  for (const z of [0.85, 2.0])
    v.add(P.slate, cylinder(2.44, 14), f.at([0, 0, z], undefined, [1, 1, 0.1]), 'metal');
  v.add(P.iceLight, ball(2.4, 2), f.at([0, 0, 2.8], undefined, [1, 1, 0.55]), 'stone', {
    solid: false,
  });
  v.add(P.violet, box(), f.at([0, 2.35, 1.2], undefined, [0.9, 0.14, 1.6]), 'stone', {
    solid: false,
  });
  for (const side of [-1, 1]) {
    v.add(P.amber, box(), f.at([side * 0.7, 2.42, 1.95], undefined, [0.12, 0.04, 0.12]), 'light', {
      glow: 3,
      vary: 0,
      solid: false,
    });
  }
  // El mástil con la antena: un anillo inclinado hacia el cielo, con su cruz y su punta de luz.
  v.add(P.slate, cylinder(0.12, 8), f.at([-1.8, -1.6, 4.2], undefined, [1, 1, 7.0]), 'metal');
  const dish = inner(f, [-1.8, -1.6, 7.4], [0.7, 0, 0.8]);
  v.add(P.slate, torus(1.6, 0.08, 36, 5), dish.at([0, 0, 0]), 'metal');
  v.add(P.slateLight, box(), dish.at([0, 0, 0], undefined, [3.2, 0.05, 0.05]), 'metal');
  v.add(P.slateLight, box(), dish.at([0, 0, 0], undefined, [0.05, 0.05, 3.2]), 'metal');
  v.add(P.light, ball(0.14, 1), f.at([-1.8, -1.6, 7.85]), 'light', { glow: 4, vary: 0 });
  // Vientos del mástil y estacas en el hielo.
  for (let k = 0; k < 3; k++) {
    const a = (2 * Math.PI * k) / 3 + 0.4;
    const foot: Triple = [-1.8 + Math.cos(a) * 3.2, -1.6 + Math.sin(a) * 3.2, 0.1];
    const top: Triple = [-1.8, -1.6, 6.2];
    const middle: Triple = [(foot[0] + top[0]) / 2, (foot[1] + top[1]) / 2, (foot[2] + top[2]) / 2];
    const dx = top[0] - foot[0];
    const dy = top[1] - foot[1];
    const dz = top[2] - foot[2];
    const span = Math.hypot(dx, dy, dz);
    const yaw = Math.atan2(dy, dx);
    const pitch = Math.atan2(Math.hypot(dx, dy), dz);
    v.add(P.porcelain, cylinder(0.015, 4), f.at(middle, [0, pitch, yaw], [1, 1, span]), 'metal', {
      solid: false,
    });
    v.add(P.rock, box(), f.at(foot, undefined, [0.3, 0.3, 0.3]));
  }
  // Cajas de instrumentos y la luz de la puerta.
  for (const [x, y, s] of [
    [2.6, 1.2, 0.7],
    [3.1, 0.3, 0.5],
    [2.8, -0.9, 0.6],
  ] as const) {
    v.add(P.slate, box(), f.at([x, y, s / 2], [0, 0, x], [s, s * 0.8, s]), 'metal');
  }
  b.lamp(f, 1.6, 3.2);
}

/** Los silos del Muelle: tres silos de cúpula en fila con su pasarela de carga. */
export function silos(b: LandmarkBuilder): void {
  const f = b.place(LANDMARKS.silos);
  const v = b.pieces;
  const tint = new Color(P.sandstone);
  [-4, 0, 4].forEach((x, k) => {
    const height = 5.2;
    v.add(P.sandstoneShade, cylinder(1.8, 14), f.at([x, 0, 0.0], undefined, [1, 1, 0.8]));
    v.add(
      tint.clone().offsetHSL(0, 0, (k - 1) * 0.03),
      cylinder(1.45, 14),
      f.at([x, 0, height / 2], undefined, [1, 1, height]),
    );
    for (const z of [1.2, height * 0.55, height - 0.3])
      v.add(P.slate, cylinder(1.5, 14), f.at([x, 0, z], undefined, [1, 1, 0.1]), 'metal');
    v.add(P.ochre, ball(1.45, 1), f.at([x, 0, height], undefined, [1, 1, 0.6]));
    v.add(P.slate, cylinder(0.12, 6), f.at([x, 0, height + 1.0], undefined, [1, 1, 0.5]), 'metal', {
      solid: false,
    });
    // Escalerilla de pates y la boca de carga.
    for (let z = 0.6; z < height - 0.4; z += 0.45) {
      v.add(P.slate, box(), f.at([x, -1.5, z], undefined, [0.45, 0.06, 0.05]), 'metal', {
        solid: false,
      });
    }
    v.add(P.violet, box(), f.at([x, 1.42, 0.95], undefined, [0.7, 0.1, 1.2]), 'stone', {
      solid: false,
    });
  });
  // Pasarela de pizarra apoyada en los mástiles de las cúpulas, que baja hacia el muelle.
  v.add(P.slate, box(), f.at([0, 0, 6.38], undefined, [8.6, 0.5, 0.1]), 'metal', { solid: false });
  v.add(P.slate, box(), f.at([-6.2, 0, 4.95], [0, 0.9, 0], [4.0, 0.4, 0.1]), 'metal', {
    solid: false,
  });
  b.lamp(f, 6.4, -1.6);
  b.lamp(f, -6.4, 1.6);
}
