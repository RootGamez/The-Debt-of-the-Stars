// Las medidas de los edificios cerrados de Umbral (plan de la llegada, hito D; ✅ el estilo, Anthony 2026-11-06:
// el cuerpo como el Observatorio —líneas limpias, ángulos rectos, paneles tallados— con remates de cobre oxidado, y
// anillos y estratos en puertas y frisos). Los Ausentes medían más de 2,5 m: puertas de 3,2 m y techos de 4,2 m,
// enormes para un Ool de 1,45 m. Marco de cada edificio: Z arriba, +Y hacia su puerta (su rumbo).

/** Un tabique interior: a lo largo de X (`axis: 'x'`, en y = `at`) o de Y (en x = `at`), con un hueco de paso. */
export interface Partition {
  axis: 'x' | 'y';
  at: number;
  from: number;
  to: number;
  /** Centro del hueco de paso (en el eje del tabique). */
  door: number;
}

export interface HallShape {
  /** Dónde está (lat/lon) y hacia qué lugar mira su puerta (lat/lon). */
  lat: number;
  lon: number;
  facing: { lat: number; lon: number };
  /** Ancho (X) y fondo (Y) por fuera (m). */
  width: number;
  depth: number;
  partitions: readonly Partition[];
}

/** Grosor de los muros, alto de los muros y de la puerta, y ancho de la puerta (m). */
export const HALL = {
  wall: 0.5,
  height: 4.2,
  doorHeight: 3.2,
  doorWidth: 2,
  /** Grosor del suelo de losas, sobre la explanada (m): menos que lo que se sube andando. */
  floor: 0.16,
  /** Separación de las pilastras de los paneles tallados (m). */
  pilaster: 2.2,
  /** Lo que la hoja de la puerta, dejada a medio abrir, tapa del hueco (m). */
  leafCover: 0.55,
} as const;

/** Los tres edificios (🟡 D7, aceptado por Anthony el 2026-11-06 al seguir con el hito D). */
export const HALLS = {
  /** La Casa de Estudio, junto al despertar: el primer edificio que se encuentra. */
  study: {
    lat: -14,
    lon: 14,
    facing: { lat: -8, lon: 5 },
    width: 12,
    depth: 9,
    partitions: [{ axis: 'y', at: 1.5, from: -4, to: 4, door: 2 }],
  },
  /** La Sala de Mando de La Boca: la sala de control antigua, al norte del anillo. */
  command: {
    lat: 17,
    lon: 33,
    facing: { lat: 8, lon: 22.5 },
    width: 11,
    depth: 11,
    partitions: [],
  },
  /** El Taller del Tallista, al norte de la plaza de las Casas. */
  carver: {
    lat: 18,
    lon: 135,
    facing: { lat: 5, lon: 150 },
    width: 10,
    depth: 8,
    partitions: [{ axis: 'x', at: -1.5, from: -4.5, to: 4.5, door: -2.5 }],
  },
} as const satisfies Record<string, HallShape>;

export type HallId = keyof typeof HALLS;

/** Radio de la explanada de un edificio (m): la mitad de su diagonal y un margen para rodearlo. */
export function hallPad(shape: Pick<HallShape, 'width' | 'depth'>): number {
  return Math.hypot(shape.width, shape.depth) / 2 + 1.5;
}

/** Los tramos de un muro de longitud `length` con un hueco centrado en `gap` de ancho `gapWidth`. */
export function wallSpans(
  from: number,
  to: number,
  gap: number | undefined,
  gapWidth: number,
): [number, number][] {
  if (gap === undefined) return [[from, to]];
  const spans: [number, number][] = [];
  const a = gap - gapWidth / 2;
  const b = gap + gapWidth / 2;
  if (a > from) spans.push([from, Math.min(a, to)]);
  if (b < to) spans.push([Math.max(b, from), to]);
  return spans;
}
