// Las casas del Laboratorio Oculto (E7; medidas y cuentas en laboratorioArchitecture.ts): muros portantes de revoque
// sobre un zócalo de piedra oscura, pilastras de caliza en las esquinas y una cornisa que corre bajo el alero; cada
// hueco con su dintel, las ventanas con antepecho, alféizar y vidrio, y la puerta con su marco, su umbral y la hoja
// abierta hacia dentro (salieron deprisa). Encima, la cubierta de cada una, apoyada en los muros: bóveda de cobre con
// tirantes, azotea con vigas y pretil, tejado de teja con cerchas, invernadero de hierro y vidrio y tejado de pizarra
// a cuatro aguas con su techo. El templete de la cámara de frío está en laboratorioRotunda.ts.
import type { BufferGeometry, Matrix4 } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  geometryFrom,
  rampMatrix,
  type Frame,
  type Triple,
} from './kit';
import { FLOOR, LabBuilder, PALETTE as P } from './laboratorioKit';
import {
  PLINTH,
  WALL,
  doorOf,
  faceLength,
  openingsOf,
  pitchedHeight,
  roofThickness,
  segmentalArch,
  wallPieces,
  type Building,
  type Face,
  type Opening,
} from './laboratorioArchitecture';

const FACES: readonly Face[] = ['front', 'back', 'left', 'right'];
/** Lo que vuela la cubierta más allá de los muros (m). */
const OVERHANG = 0.35;
/** Cuánto se abrió la hoja de la puerta hacia dentro (rad). */
const DOOR_SWING = (100 * Math.PI) / 180;
/** Paso máximo entre montantes del invernadero y entre cabios de sus aguas (m). */
const GLASS_BAY = 1.25;
/** A qué distancia de la cumbrera van las correas del invernadero (m). */
export const PURLIN = 1.75;

/**
 * La matriz de una caja en una cara de la casa: `u` a lo largo de la cara, `out` hacia fuera desde el eje del muro,
 * `z` sobre el suelo de la zona y `size` = [a lo largo, de grueso, de alto].
 */
function onFace(
  f: Frame,
  b: Building,
  face: Face,
  u: number,
  out: number,
  z: number,
  size: Triple,
): Matrix4 {
  const along = face === 'front' || face === 'back';
  const sign = face === 'front' || face === 'right' ? 1 : -1;
  const x = along ? u : sign * (b.width / 2 + out);
  const y = along ? sign * (b.depth / 2 + out) : u;
  return f.at([x, y, FLOOR + z], [0, 0, along ? 0 : Math.PI / 2], size);
}

/**
 * Un prisma: el polígono convexo `points` (x, z) en el plano XZ, con grosor `thickness` a lo largo de Y y sus caras
 * hacia fuera.
 */
function prism(polygon: readonly (readonly [number, number])[], thickness: number): BufferGeometry {
  const t = thickness / 2;
  // Las cuentas de abajo piden el polígono en sentido antihorario (X a la derecha, Z arriba).
  let area = 0;
  polygon.forEach((p, k) => {
    const q = polygon[(k + 1) % polygon.length] ?? p;
    area += p[0] * q[1] - q[0] * p[1];
  });
  const points = area < 0 ? [...polygon].reverse() : polygon;
  const at = (k: number, y: number): number[] => {
    const p = points[k % points.length] ?? [0, 0];
    return [p[0], y, p[1]];
  };
  const out: number[] = [];
  for (let k = 1; k + 1 < points.length; k++) {
    out.push(...at(0, -t), ...at(k, -t), ...at(k + 1, -t));
    out.push(...at(0, t), ...at(k + 1, t), ...at(k, t));
  }
  for (let k = 0; k < points.length; k++) {
    out.push(...at(k, -t), ...at(k + 1, t), ...at(k + 1, -t));
    out.push(...at(k, -t), ...at(k, t), ...at(k + 1, t));
  }
  return geometryFrom(out);
}

/** Una viga recta de `from` a `to` (en el marco de la zona, z sobre el suelo), de sección `w`×`h`. */
function beam(f: Frame, from: Triple, to: Triple, w: number, h: number): Matrix4 {
  const lift = (p: Triple): Triple => [p[0], p[1], p[2] + FLOOR + h / 2];
  return f.base.clone().multiply(rampMatrix(lift(from), lift(to), w, h, 0));
}

/** Los muros portantes (de `height`), con el zócalo, las pilastras de las esquinas y la cornisa del alero. */
function walls(lb: LabBuilder, f: Frame, b: Building, color: string, height = b.eaves): void {
  const s = lb.inside;
  for (const face of FACES) {
    const length = faceLength(b, face);
    for (const p of wallPieces(length, openingsOf(b, face), height)) {
      const size: Triple = [p.to - p.from, WALL, p.top - p.bottom];
      lb.solid(
        s,
        color,
        box(),
        onFace(f, b, face, (p.from + p.to) / 2, 0, (p.bottom + p.top) / 2, size),
      );
    }
    // El zócalo corre por toda la cara salvo bajo la puerta.
    const doors = openingsOf(b, face).filter((o) => o.kind === 'door');
    const extra = face === 'front' || face === 'back' ? 0.1 : 0;
    for (const p of wallPieces(length + extra, doors, PLINTH)) {
      const size: Triple = [p.to - p.from, WALL + 0.1, PLINTH + 0.05];
      lb.view(
        s,
        P.plinth,
        box(),
        onFace(f, b, face, (p.from + p.to) / 2, 0, (PLINTH - 0.05) / 2, size),
      );
    }
    const cornice = length + (extra > 0 ? 0.24 : 0.02);
    lb.view(
      s,
      P.limestone,
      box(),
      onFace(f, b, face, 0, 0.02, height - 0.1, [cornice, WALL + 0.16, 0.2]),
    );
  }
  for (const x of [-b.width / 2, b.width / 2]) {
    for (const y of [-b.depth / 2, b.depth / 2]) {
      const pilaster: Triple = [WALL + 0.16, WALL + 0.16, height - PLINTH];
      lb.view(
        s,
        P.limestone,
        box(),
        f.at([x, y, FLOOR + (height + PLINTH) / 2], undefined, pilaster),
      );
    }
  }
}

/** Una ventana: alféizar de piedra, el vidrio y su cruz de madera. */
function windowFill(lb: LabBuilder, f: Frame, b: Building, o: Opening): void {
  const s = lb.inside;
  const h = o.head - o.sill;
  const mid = (o.sill + o.head) / 2;
  lb.view(
    s,
    P.limestone,
    box(),
    onFace(f, b, o.face, o.at, 0.04, o.sill - 0.04, [o.width + 0.2, WALL + 0.14, 0.08]),
  );
  lb.pane(box(), onFace(f, b, o.face, o.at, 0, mid, [o.width, 0.03, h]));
  lb.view(s, P.woodDark, box(), onFace(f, b, o.face, o.at, 0, mid, [0.05, 0.07, h]));
  lb.view(
    s,
    P.woodDark,
    box(),
    onFace(f, b, o.face, o.at, 0, mid + h * 0.15, [o.width, 0.07, 0.05]),
  );
}

/** La puerta: umbral, marco por las dos caras, la hoja abierta hacia dentro y un farol de pared junto a ella. */
function doorFill(lb: LabBuilder, f: Frame, b: Building, o: Opening): void {
  const s = lb.inside;
  lb.view(s, P.limestone, box(), onFace(f, b, o.face, o.at, 0, 0.02, [o.width, WALL + 0.2, 0.04]));
  for (const side of [-1, 1]) {
    const u = o.at + side * (o.width / 2 + 0.06);
    for (const out of [WALL / 2 + 0.02, -WALL / 2 - 0.02]) {
      lb.view(s, P.woodDark, box(), onFace(f, b, o.face, u, out, o.head / 2, [0.12, 0.04, o.head]));
    }
  }
  // La hoja, girada sobre su gozne hacia dentro (solo en la cara de delante: ahí están todas las puertas).
  const leaf = o.width - 0.06;
  const hinge: Triple = [o.at - o.width / 2 + 0.05, b.depth / 2 - WALL / 2 - 0.04, 0];
  const dx = Math.cos(DOOR_SWING) * (leaf / 2);
  const dy = -Math.sin(DOOR_SWING) * (leaf / 2);
  const leafAt = (z: number, size: Triple): Matrix4 =>
    f.at([hinge[0] + dx, hinge[1] + dy, FLOOR + z], [0, 0, -DOOR_SWING], size);
  lb.solid(s, P.woodDark, box(), leafAt(o.head / 2, [leaf, 0.06, o.head - 0.04]));
  for (const z of [0.9, o.head - 0.5])
    lb.view(s, P.wood, box(), leafAt(z, [leaf - 0.12, 0.09, 0.1]));
  // Farol de pared a la derecha de la puerta, por fuera: se ve de lejos dónde se entra.
  const u = o.at + o.width / 2 + 0.55;
  lb.view(s, P.brass, box(), onFace(f, b, o.face, u, WALL / 2 + 0.12, 2.45, [0.06, 0.24, 0.06]));
  lb.view(
    s,
    P.brass,
    cone(0.12, 0.05, 6),
    onFace(f, b, o.face, u, WALL / 2 + 0.24, 2.58, [1, 1, 0.12]),
  );
  lb.lamp(s, ball(0.08, 0), onFace(f, b, o.face, u, WALL / 2 + 0.24, 2.46, [1, 1, 1]));
}

/** Dinteles, ventanas y la puerta. */
function openings(lb: LabBuilder, f: Frame, b: Building): void {
  for (const o of b.openings) {
    const lintel: Triple = [o.width + 0.4, WALL + 0.08, 0.26];
    lb.view(lb.inside, P.lintel, box(), onFace(f, b, o.face, o.at, 0, o.head + 0.13, lintel));
    if (o.kind === 'window') windowFill(lb, f, b, o);
    else doorFill(lb, f, b, o);
  }
}

/** Una lámpara colgada de `top` (z sobre el suelo), a `drop` por debajo: varilla, pantalla de latón y la luz. */
export function pendant(
  lb: LabBuilder,
  f: Frame,
  x: number,
  y: number,
  top: number,
  drop = 0.9,
): void {
  const s = lb.inside;
  lb.view(s, P.iron, box(), f.at([x, y, FLOOR + top - drop / 2], undefined, [0.03, 0.03, drop]));
  lb.view(
    s,
    P.brass,
    cone(0.3, 0.07, 8),
    f.at([x, y, FLOOR + top - drop - 0.08], undefined, [1, 1, 0.2]),
  );
  lb.lamp(s, ball(0.1, 0), f.at([x, y, FLOOR + top - drop - 0.16]));
}

/** La bóveda rebajada de cobre (a lo largo de Y), revocada por dentro, con sus lunetos, arcos y tirantes. */
function vaultRoof(lb: LabBuilder, f: Frame, b: Building): void {
  const s = lb.inside;
  const span = b.width + WALL;
  const { radius, half } = segmentalArch(span, b.rise);
  const centre = b.eaves + b.rise - radius;
  const length = b.depth + WALL + 0.3;
  const staves = 14;
  const t = roofThickness('vault');
  for (let k = 0; k < staves; k++) {
    const phi = -half + ((k + 0.5) * 2 * half) / staves;
    const chord = (r: number): number => 2 * r * Math.sin(half / staves) + 0.03;
    for (const [r, thick, color] of [
      [radius + t * 0.7, t * 0.6, P.verdigris],
      [radius + t * 0.2, t * 0.4, P.plaster],
    ] as const) {
      const at: Triple = [Math.sin(phi) * r, 0, FLOOR + centre + Math.cos(phi) * r];
      lb.solid(s, color, box(), f.at(at, [0, phi, 0], [chord(r), length, thick]));
    }
  }
  // Los lunetos de las testeras: el muro sube hasta la bóveda.
  const arc: [number, number][] = [];
  for (let k = 0; k <= 12; k++) {
    const phi = -half + (k * 2 * half) / 12;
    arc.push([Math.sin(phi) * radius, centre + Math.cos(phi) * radius]);
  }
  const lunette = prism(arc, WALL);
  for (const y of [-b.depth / 2, b.depth / 2]) lb.solid(s, P.plaster, lunette, f.at([0, y, FLOOR]));
  // Un arco de caliza en cada testera, sobre las pilastras, y los tirantes de hierro contra el empuje.
  for (const y of [-b.depth / 2, b.depth / 2]) {
    for (let k = 0; k < 10; k++) {
      const a = -half + ((k + 0.5) * 2 * half) / 10;
      const r = radius + t + 0.06;
      const voussoir: Triple = [2 * r * Math.sin(half / 10) + 0.02, WALL + 0.1, 0.14];
      lb.view(
        s,
        P.limestone,
        box(),
        f.at([Math.sin(a) * r, y, FLOOR + centre + Math.cos(a) * r], [0, a, 0], voussoir),
      );
    }
  }
  for (const y of [-b.depth / 4, b.depth / 4]) {
    lb.view(
      s,
      P.iron,
      box(),
      f.at([0, y, FLOOR + b.eaves - 0.2], undefined, [b.width + WALL + 0.1, 0.04, 0.04]),
    );
    for (const x of [-1, 1]) {
      const plate: Triple = [0.04, 0.22, 0.22];
      lb.view(
        s,
        P.iron,
        box(),
        f.at([x * (b.width / 2 + WALL / 2 + 0.03), y, FLOOR + b.eaves - 0.2], undefined, plate),
      );
    }
  }
}

/** La azotea: losa sobre vigas que van de muro a muro por la luz corta, con su pretil y gárgolas. */
function flatRoof(lb: LabBuilder, f: Frame, b: Building): void {
  const s = lb.inside;
  const t = roofThickness('flat');
  const w = b.width + WALL + 0.3;
  const d = b.depth + WALL + 0.3;
  const top = FLOOR + b.eaves + t;
  lb.solid(s, P.plasterShade, box(), f.at([0, 0, top - t / 2], undefined, [w, d, t]));
  for (const [x, y, sw, sd] of [
    [0, d / 2 - 0.09, w, 0.18],
    [0, -d / 2 + 0.09, w, 0.18],
    [w / 2 - 0.09, 0, 0.18, d - 0.36],
    [-w / 2 + 0.09, 0, 0.18, d - 0.36],
  ] as const) {
    lb.solid(s, P.plaster, box(), f.at([x, y, top + b.rise / 2], undefined, [sw, sd, b.rise]));
    lb.view(
      s,
      P.limestone,
      box(),
      f.at([x, y, top + b.rise + 0.03], undefined, [sw + 0.04, sd + 0.04, 0.06]),
    );
  }
  const across = b.depth < b.width;
  const span = across ? b.width : b.depth;
  const count = Math.round(span / 1.1);
  for (let k = 1; k < count; k++) {
    const at = -span / 2 + (k * span) / count;
    const size: Triple = across ? [0.18, b.depth, 0.3] : [b.width, 0.18, 0.3];
    lb.view(
      s,
      P.woodDark,
      box(),
      f.at(
        across ? [at, 0, FLOOR + b.eaves - 0.15] : [0, at, FLOOR + b.eaves - 0.15],
        undefined,
        size,
      ),
    );
  }
  for (const y of [-b.depth / 4, b.depth / 4]) {
    lb.view(
      s,
      P.limestone,
      box(),
      f.at([-w / 2 - 0.15, y, top + 0.05], undefined, [0.4, 0.12, 0.1]),
    );
  }
}

/** Las aguas de un tejado (o del invernadero) a lo largo de Y: la losa de cada lado y su ángulo. */
function slopes(
  b: Building,
  thickness: number,
): { side: number; at: Triple; theta: number; run: number }[] {
  const half = b.width / 2 + WALL / 2;
  const theta = Math.atan(b.rise / half);
  const reach = half + OVERHANG;
  const drop = OVERHANG * Math.tan(theta);
  const run = Math.hypot(reach, b.rise + drop);
  return [-1, 1].map((side) => {
    const x = (side * reach) / 2 + side * Math.sin(theta) * (thickness / 2);
    const z = b.eaves + (b.rise - drop) / 2 + Math.cos(theta) * (thickness / 2);
    return { side, at: [x, 0, z] as Triple, theta, run };
  });
}

/** Las testeras de un tejado a dos aguas: el muro sube en triángulo hasta la cumbrera. */
function gableEnds(b: Building): BufferGeometry {
  const half = b.width / 2 + WALL / 2;
  return prism(
    [
      [-half, b.eaves],
      [half, b.eaves],
      [0, b.eaves + b.rise],
    ],
    WALL,
  );
}

/** El tejado de teja a dos aguas: durmientes, cerchas de madera, la cubierta con sus canales y la cumbrera. */
function gableRoof(lb: LabBuilder, f: Frame, b: Building): void {
  const s = lb.inside;
  const t = roofThickness('gable') * 0.55;
  const length = b.depth + WALL + 2 * OVERHANG;
  const ends = gableEnds(b);
  for (const y of [-b.depth / 2, b.depth / 2]) lb.solid(s, P.plaster, ends, f.at([0, y, FLOOR]));
  for (const x of [-b.width / 2, b.width / 2]) {
    lb.view(
      s,
      P.woodDark,
      box(),
      f.at([x, 0, FLOOR + b.eaves + 0.06], undefined, [WALL, b.depth, 0.12]),
    );
  }
  for (const { side, at, theta, run } of slopes(b, t)) {
    lb.solid(
      s,
      P.roofTile,
      box(),
      f.at([at[0], 0, FLOOR + at[2]], [0, side * theta, 0], [run, length, t]),
    );
    const rows = Math.floor((length - 0.2) / 0.42);
    for (let k = 0; k <= rows; k++) {
      const y = -length / 2 + 0.1 + (k * (length - 0.2)) / rows;
      const lift = t / 2 + 0.03;
      const pos: Triple = [
        at[0] + side * Math.sin(theta) * lift,
        y,
        FLOOR + at[2] + Math.cos(theta) * lift,
      ];
      lb.view(
        s,
        P.roofTileDark,
        cylinder(0.055, 5),
        f.at(pos, [0, Math.PI / 2 + side * theta, 0], [1, 1, run]),
      );
    }
  }
  const ridge = FLOOR + b.eaves + b.rise + t;
  lb.view(
    s,
    P.roofTileDark,
    cylinder(0.12, 6),
    f.at([0, 0, ridge], [Math.PI / 2, 0, 0], [1, 1, length]),
  );
  // Cerchas: tirante, dos pares y el pendolón; y la hilera bajo la cumbrera.
  const inner = b.width / 2 - WALL / 2;
  for (const y of [-b.depth / 3, 0, b.depth / 3]) {
    lb.view(
      s,
      P.wood,
      box(),
      f.at([0, y, FLOOR + b.eaves - 0.12], undefined, [b.width, 0.16, 0.24]),
    );
    for (const side of [-1, 1]) {
      lb.view(
        s,
        P.wood,
        box(),
        beam(f, [side * inner, y, b.eaves - 0.05], [0, y, b.eaves + b.rise - 0.32], 0.14, 0.18),
      );
    }
    const post = b.rise - 0.1;
    lb.view(
      s,
      P.wood,
      box(),
      f.at([0, y, FLOOR + b.eaves + post / 2 - 0.05], undefined, [0.14, 0.14, post]),
    );
  }
  lb.view(
    s,
    P.wood,
    box(),
    f.at([0, 0, FLOOR + b.eaves + b.rise - 0.22], undefined, [0.16, b.depth, 0.2]),
  );
}

/** Montantes cada `GLASS_BAY` como mucho entre los extremos de cada machón de una cara (el invernadero). */
function glassBays(b: Building, face: Face): number[] {
  const posts = new Set<number>();
  for (const p of wallPieces(faceLength(b, face), openingsOf(b, face), b.eaves)) {
    if (p.bottom > 0) continue;
    const count = Math.max(1, Math.ceil((p.to - p.from) / GLASS_BAY));
    for (let k = 0; k <= count; k++)
      posts.add(+(p.from + ((p.to - p.from) * k) / count).toFixed(4));
  }
  return [...posts].sort((a, c) => a - c);
}

/** El invernadero: murete, montantes y peinazos de hierro, vidrio entre ellos y dos aguas de vidrio con sus cabios. */
function glassHouse(lb: LabBuilder, f: Frame, b: Building): void {
  const s = lb.inside;
  const knee = 0.8;
  for (const face of FACES) {
    const length = faceLength(b, face);
    const holes = openingsOf(b, face);
    for (const p of wallPieces(length, holes, knee)) {
      const size: Triple = [p.to - p.from, WALL, knee];
      lb.solid(
        s,
        P.roofTileDark,
        box(),
        onFace(f, b, face, (p.from + p.to) / 2, 0, knee / 2, size),
      );
      lb.view(
        s,
        P.limestone,
        box(),
        onFace(f, b, face, (p.from + p.to) / 2, 0, knee + 0.03, [p.to - p.from, WALL + 0.08, 0.06]),
      );
    }
    const posts = glassBays(b, face);
    for (const u of posts) {
      lb.solid(s, P.iron, box(), onFace(f, b, face, u, 0, b.eaves / 2, [0.12, 0.12, b.eaves]));
    }
    for (let k = 0; k + 1 < posts.length; k++) {
      const a = posts[k] ?? 0;
      const c = posts[k + 1] ?? 0;
      const door = holes.find((o) => Math.abs(o.at - (a + c) / 2) < o.width / 2);
      const bottom = door ? door.head : knee + 0.06;
      if (b.eaves - bottom < 0.05) continue;
      lb.pane(
        box(),
        onFace(f, b, face, (a + c) / 2, 0, (bottom + b.eaves) / 2, [
          c - a - 0.1,
          0.025,
          b.eaves - bottom,
        ]),
      );
    }
    lb.view(s, P.iron, box(), onFace(f, b, face, 0, 0, 2.05, [length, 0.08, 0.06]));
    lb.view(
      s,
      P.iron,
      box(),
      onFace(f, b, face, 0, 0, b.eaves - 0.05, [length + 0.12, 0.14, 0.12]),
    );
  }
  // La puerta (hoja de hierro y vidrio, abierta) y su dintel de hierro.
  const door = doorOf(b);
  lb.view(
    s,
    P.iron,
    box(),
    onFace(f, b, 'front', door.at, 0, door.head + 0.05, [door.width + 0.12, 0.14, 0.1]),
  );
  doorFill(lb, f, b, door);
  // Testeras de vidrio, aguas de vidrio, cabios de hierro cada `GLASS_BAY` y la cumbrera.
  const half = b.width / 2 + WALL / 2;
  const gable = prism(
    [
      [-half, b.eaves],
      [half, b.eaves],
      [0, b.eaves + b.rise],
    ],
    0.025,
  );
  for (const y of [-b.depth / 2, b.depth / 2]) {
    lb.pane(gable, f.at([0, y, FLOOR]));
    lb.view(
      s,
      P.iron,
      box(),
      f.at([0, y, FLOOR + b.eaves + b.rise / 2], undefined, [0.08, 0.08, b.rise]),
    );
  }
  const length = b.depth + WALL + 0.2;
  const rafters = Math.ceil(length / GLASS_BAY);
  for (const { side, at, theta, run } of slopes(b, 0.025)) {
    lb.pane(box(), f.at([at[0], 0, FLOOR + at[2]], [0, side * theta, 0], [run, length, 0.025]));
    // Los cabios, bajo el vidrio: lo sostienen.
    const below: Triple = [
      at[0] - side * Math.sin(theta) * 0.06,
      0,
      FLOOR + at[2] - Math.cos(theta) * 0.06,
    ];
    for (let k = 0; k <= rafters; k++) {
      const y = -length / 2 + (k * length) / rafters;
      lb.view(
        s,
        P.iron,
        box(),
        f.at([below[0], y, below[2]], [0, side * theta, 0], [run, 0.07, 0.08]),
      );
    }
  }
  // Dos correas a lo largo, de las que cuelgan las lámparas de cultivo.
  for (const x of [-PURLIN, PURLIN]) {
    lb.view(
      s,
      P.iron,
      box(),
      f.at([x, 0, FLOOR + pitchedHeight(b, x) - 0.16], undefined, [0.08, length, 0.08]),
    );
  }
  lb.view(
    s,
    P.iron,
    box(),
    f.at([0, 0, FLOOR + b.eaves + b.rise + 0.03], undefined, [0.12, length, 0.12]),
  );
  lb.view(s, P.iron, box(), f.at([0, 0, FLOOR + b.eaves - 0.04], undefined, [b.width, 0.06, 0.06]));
}

/**
 * El tejado de pizarra a cuatro aguas como un sólido: cuatro faldones (dos trapecios y dos triángulos) que suben de
 * un alero rectangular de semiejes `a` ≥ `c` a una cumbrera corta, con su cara de abajo y su canto.
 */
function hipSolid(a: number, c: number, rise: number, thickness: number): BufferGeometry {
  const r = a - c;
  const e = [
    [-a, -c, 0],
    [a, -c, 0],
    [a, c, 0],
    [-a, c, 0],
  ] as const;
  const top = [
    [-r, 0, rise],
    [r, 0, rise],
  ] as const;
  const faces: (readonly (readonly [number, number, number])[])[] = [
    [e[0], e[1], top[1], top[0]],
    [e[1], e[2], top[1]],
    [e[2], e[3], top[0], top[1]],
    [e[3], e[0], top[0]],
  ];
  const out: number[] = [];
  const lower = (p: readonly [number, number, number]): number[] => [p[0], p[1], p[2] - thickness];
  for (const face of faces) {
    for (let k = 1; k + 1 < face.length; k++) {
      const p0 = face[0];
      const p1 = face[k];
      const p2 = face[k + 1];
      if (!p0 || !p1 || !p2) continue;
      out.push(...p0, ...p1, ...p2);
      out.push(...lower(p0), ...lower(p2), ...lower(p1));
    }
  }
  for (let k = 0; k < 4; k++) {
    const p = e[k];
    const q = e[(k + 1) % 4];
    if (!p || !q) continue;
    out.push(...p, ...lower(p), ...lower(q));
    out.push(...p, ...lower(q), ...q);
  }
  return geometryFrom(out);
}

/** El tejado de pizarra a cuatro aguas, con limas de plomo, y el techo de tablas sobre viguetas. */
function hipRoof(lb: LabBuilder, f: Frame, b: Building): void {
  const s = lb.inside;
  const t = roofThickness('hip');
  const wide = b.width >= b.depth;
  const halfShort = Math.min(b.width, b.depth) / 2 + WALL / 2;
  const slope = b.rise / halfShort;
  const a = Math.max(b.width, b.depth) / 2 + WALL / 2 + OVERHANG;
  const c = halfShort + OVERHANG;
  const eave = b.eaves - OVERHANG * slope;
  const rise = c * slope;
  const turn: Triple = [0, 0, wide ? 0 : Math.PI / 2];
  lb.solid(s, P.slate, hipSolid(a, c, rise, t), f.at([0, 0, FLOOR + eave + t], turn));
  const r = a - c;
  const ridge = FLOOR + eave + rise + t;
  lb.view(s, P.iron, box(), f.at([0, 0, ridge], turn, [2 * r + 0.2, 0.14, 0.08]));
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const corner: Triple = wide
        ? [sx * a, sy * c, eave + t + 0.02]
        : [sy * c, sx * a, eave + t + 0.02];
      const end: Triple = wide
        ? [sx * r, 0, eave + rise + t + 0.02]
        : [0, sx * r, eave + rise + t + 0.02];
      lb.view(s, P.iron, box(), beam(f, corner, end, 0.1, 0.05));
    }
  }
  // Por dentro, un techo de tablas a la altura del alero sobre viguetas que van de muro a muro.
  lb.solid(
    s,
    P.woodPale,
    box(),
    f.at([0, 0, FLOOR + b.eaves - 0.04], undefined, [b.width - WALL, b.depth - WALL, 0.08]),
  );
  for (let k = -1; k <= 1; k++) {
    const x = (k * b.width) / 3.2;
    lb.view(
      s,
      P.woodDark,
      box(),
      f.at([x, 0, FLOOR + b.eaves - 0.17], undefined, [0.14, b.depth - WALL, 0.18]),
    );
  }
}

/** Una casa entera del Laboratorio en el marco `f` de su zona: su losa, sus muros, sus huecos y su cubierta. */
export function house(lb: LabBuilder, f: Frame, b: Building): void {
  lb.platform(f, b.width + 0.8, b.depth + 0.8);
  if (b.roof === 'glass') {
    glassHouse(lb, f, b);
    return;
  }
  walls(lb, f, b, P.plaster);
  openings(lb, f, b);
  if (b.roof === 'vault') vaultRoof(lb, f, b);
  else if (b.roof === 'flat') flatRoof(lb, f, b);
  else if (b.roof === 'gable') gableRoof(lb, f, b);
  else hipRoof(lb, f, b);
}
