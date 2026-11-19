// Las casas del Laboratorio Oculto (E7, pedido de Anthony: «todas las habitaciones con su techo y estructuras que
// sigan la lógica de la arquitectura real»; 🟡 las medidas). Cada cuarto es un edificio de muros portantes sobre un
// zócalo, con pilastras en las esquinas, dinteles sobre puertas y ventanas y una cubierta apoyada en los muros: la
// bóveda de cobre del Archivo de Mediciones (con tirantes de hierro contra el empuje), la azotea con pretil de la
// Radio, el tejado a dos aguas con cerchas del Comedor, el invernadero de hierro y vidrio y el tejado de pizarra a
// cuatro aguas del Dormitorio. La cámara de frío es un templete redondo: columnas, un anillo de dinteles y una cúpula
// con óculo que mira a la semilla. Aquí solo hay medidas y cuentas (puras, con tests); lo que se dibuja está en
// laboratorioBuildings.ts. En el marco de cada zona: Z hacia el centro del Nudo (las cubiertas miran a la semilla),
// +Y hacia la zona por donde se llega (ahí está la puerta) y el origen en el suelo.
import type { InnerSiteId } from './laboratorioShape';

/** Grosor de los muros portantes (m). */
export const WALL = 0.22;
/** Alto del zócalo de piedra oscura que asienta los muros (m sobre el suelo de la zona). */
export const PLINTH = 0.45;
/** La puerta: cabe uno de ellos (2,78 m) con holgura, y el jugador pasa de sobra. */
export const DOOR = { width: 1.5, height: 3.0 } as const;
/** Lo más que puede subir una cubierta sobre el suelo de su zona: por encima pasan los restos que orbitan. */
export const ROOF_LIMIT = 5.8;
/** El pilar más estrecho que se admite entre dos huecos o junto a una esquina (m). */
export const MIN_PIER = 0.4;

export type RoofKind = 'vault' | 'flat' | 'gable' | 'glass' | 'hip';
export type Face = 'front' | 'back' | 'left' | 'right';

/** Un hueco en una cara: centrado en `at` (a lo largo de la cara), de `sill` (antepecho) a `head` (dintel). */
export interface Opening {
  kind: 'door' | 'window';
  face: Face;
  at: number;
  width: number;
  sill: number;
  head: number;
}

export interface Building {
  site: InnerSiteId;
  /** La zona hacia la que mira la puerta (+Y). */
  facing: InnerSiteId;
  /** Entre ejes de muros (m): ancho en X y fondo en Y. */
  width: number;
  depth: number;
  /** Altura de los muros hasta el alero (m sobre el suelo de la zona). */
  eaves: number;
  roof: RoofKind;
  /** Lo que sube la cubierta sobre el alero (la cumbrera, la clave de la bóveda o el pretil). */
  rise: number;
  openings: readonly Opening[];
}

/** Grosor de cada cubierta y lo que cuelga por dentro bajo el alero (vigas, tirantes, cerchas). */
const ROOF_PARTS: Record<RoofKind, { thickness: number; below: number }> = {
  vault: { thickness: 0.2, below: 0.22 },
  flat: { thickness: 0.25, below: 0.3 },
  gable: { thickness: 0.22, below: 0.24 },
  glass: { thickness: 0.1, below: 0.12 },
  hip: { thickness: 0.16, below: 0.26 },
};

const door: Opening = {
  kind: 'door',
  face: 'front',
  at: 0,
  width: DOOR.width,
  sill: 0,
  head: DOOR.height,
};
const windowAt = (face: Face, at: number, width = 1.0, sill = 1.0, head = 2.6): Opening => ({
  kind: 'window',
  face,
  at,
  width,
  sill,
  head,
});

/** Los cuartos con muros del Laboratorio y su casa (las medidas de dentro son las de antes de E7). */
export const BUILDINGS = {
  mediciones: {
    site: 'mediciones',
    facing: 'banco',
    width: 7.0,
    depth: 6.0,
    eaves: 3.6,
    roof: 'vault',
    rise: 1.2,
    // Ventanas a los lados de la puerta y, en lo alto de los muros largos, por encima de las estanterías.
    openings: [
      door,
      windowAt('front', -2.35),
      windowAt('front', 2.35),
      windowAt('left', -1.3, 1.2, 2.45, 3.2),
      windowAt('left', 1.3, 1.2, 2.45, 3.2),
      windowAt('right', -1.3, 1.2, 2.45, 3.2),
      windowAt('right', 1.3, 1.2, 2.45, 3.2),
    ],
  },
  radio: {
    site: 'radio',
    facing: 'esceptico',
    width: 6.0,
    depth: 5.2,
    eaves: 3.4,
    roof: 'flat',
    rise: 0.45,
    openings: [door, windowAt('front', 1.95), windowAt('right', -0.6, 1.2)],
  },
  comedor: {
    site: 'comedor',
    facing: 'investigadora',
    width: 7.0,
    depth: 6.0,
    eaves: 3.4,
    roof: 'gable',
    rise: 1.45,
    openings: [
      door,
      windowAt('front', -2.35),
      windowAt('front', 2.35),
      windowAt('right', -1.0, 1.1),
      windowAt('right', 1.3, 1.1),
    ],
  },
  invernadero: {
    site: 'invernadero',
    facing: 'dormitorio',
    width: 7.0,
    depth: 6.0,
    eaves: 3.3,
    roof: 'glass',
    rise: 1.6,
    // De vidrio entre montantes de hierro: el zócalo es un murete y la puerta, una más de las calles.
    openings: [door],
  },
  dormitorio: {
    site: 'dormitorio',
    facing: 'cruce',
    width: 4.8,
    depth: 4.6,
    eaves: 3.3,
    roof: 'hip',
    rise: 1.3,
    openings: [
      door,
      windowAt('back', 0, 1.0, 1.3, 2.5),
      windowAt('left', -0.9, 0.9, 1.2, 2.5),
      windowAt('right', -0.9, 0.9, 1.2, 2.5),
    ],
  },
} as const satisfies Record<string, Building>;

export type BuildingId = keyof typeof BUILDINGS;

/** Largo de una cara: las de delante y detrás llegan a las esquinas de fuera; las de los lados, entre ellas. */
export function faceLength(b: Building, face: Face): number {
  return face === 'front' || face === 'back' ? b.width + WALL : b.depth - WALL;
}

/** Un trozo macizo de una cara: de `from` a `to` a lo largo de ella y de `bottom` a `top` en altura. */
export interface WallPiece {
  from: number;
  to: number;
  bottom: number;
  top: number;
}

/**
 * Los trozos de muro de una cara de largo `length` (centrada en 0) y alto `height` alrededor de sus huecos: los
 * machones entre hueco y hueco (de abajo arriba), el antepecho bajo cada ventana y el muro sobre cada dintel.
 */
export function wallPieces(
  length: number,
  openings: readonly Pick<Opening, 'at' | 'width' | 'sill' | 'head'>[],
  height: number,
): WallPiece[] {
  const sorted = [...openings].sort((a, b) => a.at - b.at);
  const pieces: WallPiece[] = [];
  let cursor = -length / 2;
  for (const o of sorted) {
    const left = o.at - o.width / 2;
    const right = o.at + o.width / 2;
    if (left > cursor) pieces.push({ from: cursor, to: left, bottom: 0, top: height });
    if (o.sill > 0) pieces.push({ from: left, to: right, bottom: 0, top: o.sill });
    if (o.head < height) pieces.push({ from: left, to: right, bottom: o.head, top: height });
    cursor = right;
  }
  if (cursor < length / 2) pieces.push({ from: cursor, to: length / 2, bottom: 0, top: height });
  return pieces;
}

/** Los huecos de una cara. */
export function openingsOf(b: Building, face: Face): Opening[] {
  return b.openings.filter((o) => o.face === face);
}

/** La puerta del edificio (siempre una, en la cara de delante). */
export function doorOf(b: Building): Opening {
  const found = b.openings.find((o) => o.kind === 'door');
  if (!found) throw new Error(`${b.site}: un cuarto sin puerta`);
  return found;
}

/** El punto más alto de la cubierta sobre el suelo de la zona. */
export function roofTop(b: Building): number {
  return b.eaves + b.rise + ROOF_PARTS[b.roof].thickness;
}

/** La altura libre por dentro: hasta lo más bajo de lo que sostiene la cubierta (vigas, cerchas, tirantes). */
export function clearHeight(b: Building): number {
  return b.eaves - ROOF_PARTS[b.roof].below;
}

/**
 * La altura de la cara de abajo de un tejado a dos aguas (o del invernadero) a `x` del eje de la cumbrera: pasa por
 * la arista de fuera de lo alto de los muros y sube hasta la cumbrera.
 */
export function pitchedHeight(b: Building, x: number): number {
  const half = b.width / 2 + WALL / 2;
  return b.eaves + b.rise * (1 - Math.abs(x) / half);
}

/** Grosor de la cubierta de un tipo. */
export function roofThickness(kind: RoofKind): number {
  return ROOF_PARTS[kind].thickness;
}

/**
 * La bóveda rebajada (un arco de círculo) que salva `span` con una flecha `rise`: su radio y el ángulo de cada
 * arranque desde la vertical.
 */
export function segmentalArch(span: number, rise: number): { radius: number; half: number } {
  const a = span / 2;
  const radius = (a * a + rise * rise) / (2 * rise);
  return { radius, half: Math.asin(a / radius) };
}

/** El templete de la cámara de frío: columnas en corro, un anillo de dinteles y una cúpula rebajada con óculo. */
export const ROTUNDA = {
  /** Radio del corro de columnas (a sus ejes). */
  radius: 3.0,
  columns: 8,
  /** La basa (lado) y el fuste (radio) de cada columna. */
  base: 0.55,
  shaft: 0.2,
  /** Alto de las columnas sobre el suelo de la zona: por encima de los anillos de piedra (3,81 m). */
  column: 4.0,
  /** Alto del anillo de dinteles que reparte el peso de la cúpula. */
  entablature: 0.4,
  /** La cúpula: radio, cuánto se rebaja (alto/radio) y el ángulo del óculo desde la vertical. */
  dome: 3.05,
  flatten: 0.42,
  oculus: 0.42,
} as const;

/** Los ángulos de las columnas del templete (desde +X): ninguna en +Y, por donde se llega. */
export function columnAngles(): number[] {
  const step = (2 * Math.PI) / ROTUNDA.columns;
  return Array.from({ length: ROTUNDA.columns }, (_, k) => step * (k + 0.5));
}

/** El paso libre entre dos basas vecinas del templete (m). */
export function colonnadeGap(): number {
  return 2 * ROTUNDA.radius * Math.sin(Math.PI / ROTUNDA.columns) - ROTUNDA.base;
}

/** Lo más alto del templete sobre el suelo de la zona (el borde del óculo). */
export function rotundaTop(): number {
  const { column, entablature, dome, flatten, oculus } = ROTUNDA;
  return column + entablature + dome * flatten * Math.cos(oculus);
}
