// Superficies suaves para los Ausentes vivos (plan de finales, E3): secciones horizontales (absentShape.ts)
// interpoladas sin escalones (cúbica monótona: sin abombarse entre dos secciones), puntos sobre ellas con su normal, y
// una rejilla (u, v) → punto con normales suaves, para tejer troncos, miembros, cabezas, túnicas y chalecos.
// Las mallas salen sin índice (como las primitivas del kit) y con color por vértice, listas para fundirse.
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import type { Section } from './absentShape';
import type { SurfacePoint } from './explorerParts';

/** Una sección con todos sus datos. */
export interface FullSection {
  z: number;
  x: number;
  y: number;
  rx: number;
  front: number;
  back: number;
}

type Key = 'x' | 'y' | 'rx' | 'front' | 'back';
const KEYS: readonly Key[] = ['x', 'y', 'rx', 'front', 'back'];

const full = (p: Section): FullSection => ({
  z: p.z,
  x: p.x ?? 0,
  y: p.y ?? 0,
  rx: p.rx,
  front: p.front,
  back: p.back,
});

/** Pendiente de Hermite en la sección `k` (cero en los picos y valles: así no se pasa de largo). */
function slope(sections: readonly FullSection[], k: number, key: Key): number {
  const at = (i: number): FullSection | undefined => sections[i];
  const p = at(k);
  const prev = at(k - 1);
  const next = at(k + 1);
  if (!p) return 0;
  const before = prev ? (p[key] - prev[key]) / Math.max(1e-6, p.z - prev.z) : undefined;
  const after = next ? (next[key] - p[key]) / Math.max(1e-6, next.z - p.z) : undefined;
  if (before === undefined) return after ?? 0;
  if (after === undefined) return before;
  if (before * after <= 0) return 0;
  return (before + after) / 2;
}

/** La sección a la altura `z`, interpolada sin escalones; fuera del tramo, la del extremo. */
export function sectionAt(sections: readonly Section[], z: number): FullSection {
  const list = sections.map(full);
  const first = list[0];
  const last = list[list.length - 1];
  if (!first || !last) return { z, x: 0, y: 0, rx: 0, front: 0, back: 0 };
  if (z <= first.z) return { ...first, z };
  if (z >= last.z) return { ...last, z };
  let k = 0;
  while (k < list.length - 2 && (list[k + 1]?.z ?? z) < z) k++;
  const a = list[k] ?? first;
  const b = list[k + 1] ?? last;
  const h = Math.max(1e-6, b.z - a.z);
  const t = (z - a.z) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const out: FullSection = { z, x: 0, y: 0, rx: 0, front: 0, back: 0 };
  for (const key of KEYS) {
    const value =
      (2 * t3 - 3 * t2 + 1) * a[key] +
      (t3 - 2 * t2 + t) * h * slope(list, k, key) +
      (-2 * t3 + 3 * t2) * b[key] +
      (t3 - t2) * h * slope(list, k + 1, key);
    out[key] = key === 'x' || key === 'y' ? value : Math.max(0, value);
  }
  return out;
}

/** El punto de una sección en el acimut `azimuth` (0 = frente +Y, π/2 = derecha +X), separado `lift` metros. */
export function ringPoint(section: FullSection, azimuth: number, lift = 0): Vector3 {
  const sin = Math.sin(azimuth);
  const cos = Math.cos(azimuth);
  const depth = cos >= 0 ? section.front : section.back;
  return new Vector3(
    section.x + Math.max(0, section.rx + lift) * sin,
    section.y + Math.max(0, depth + lift) * cos,
    section.z,
  );
}

/** Un punto de la superficie con su normal hacia fuera (por diferencias finitas). */
export function onSections(
  sections: readonly Section[],
  azimuth: number,
  z: number,
  lift = 0,
): SurfacePoint {
  const at = (a: number, h: number): Vector3 => ringPoint(sectionAt(sections, h), a, lift);
  const e = 1e-3;
  const point = at(azimuth, z);
  const around = at(azimuth + e, z)
    .sub(at(azimuth - e, z))
    .divideScalar(2 * e);
  const up = at(azimuth, z + e)
    .sub(at(azimuth, z - e))
    .divideScalar(2 * e);
  const normal = new Vector3().crossVectors(up, around);
  if (normal.lengthSq() < 1e-12) normal.set(0, 0, z > (sections[0]?.z ?? 0) ? 1 : -1);
  return { point, normal: normal.normalize() };
}

/** Una rejilla de puntos: columnas `us` (alrededor) y filas `vs` (de abajo arriba). */
export interface GridSpec {
  us: readonly number[];
  vs: readonly number[];
  /** Une la última columna con la primera (un tubo cerrado). */
  closed?: boolean;
  /** Si las filas van de arriba abajo, o las columnas al revés, la cara de fuera es la otra. */
  flip?: boolean;
  point(u: number, v: number): Vector3;
  color(u: number, v: number): Color;
}

/**
 * Teje la rejilla con normales suaves (compartidas entre caras vecinas, también en la costura de un tubo cerrado).
 * Con `us` creciendo hacia +X desde el frente y `vs` hacia arriba, la cara de fuera mira hacia fuera.
 */
export function gridGeometry(spec: GridSpec): BufferGeometry {
  const columns = spec.us.length;
  const rows = spec.vs.length;
  const positions: number[] = [];
  const colors: number[] = [];
  for (const v of spec.vs) {
    for (const u of spec.us) {
      const p = spec.point(u, v);
      const c = spec.color(u, v);
      positions.push(p.x, p.y, p.z);
      colors.push(c.r, c.g, c.b);
    }
  }
  const index: number[] = [];
  const spans = spec.closed ? columns : columns - 1;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < spans; i++) {
      const a = j * columns + i;
      const b = j * columns + ((i + 1) % columns);
      const c = a + columns;
      const d = b + columns;
      if (spec.flip) index.push(a, b, c, b, d, c);
      else index.push(a, c, b, b, c, d);
    }
  }
  const indexed = new BufferGeometry();
  indexed.setAttribute('position', new Float32BufferAttribute(positions, 3));
  indexed.setAttribute('color', new Float32BufferAttribute(colors, 3));
  indexed.setIndex(index);
  indexed.computeVertexNormals();
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  return geometry;
}

/** `count` valores de `from` a `to`, ambos incluidos (o sin el último si `open` es falso: un tubo cerrado). */
export function spread(from: number, to: number, count: number, closed = false): number[] {
  const steps = Math.max(1, closed ? count : count - 1);
  return Array.from({ length: Math.max(1, count) }, (_, k) => from + ((to - from) * k) / steps);
}

/** Alturas de filas de `from` a `to` separadas como mucho `step`, más las que se pidan (ranuras, bordes). */
export function rowsBetween(
  from: number,
  to: number,
  step: number,
  extra: readonly number[] = [],
): number[] {
  const count = Math.max(2, Math.ceil(Math.abs(to - from) / step) + 1);
  const rows = [...spread(from, to, count), ...extra.filter((z) => z > from && z < to)];
  return [...new Set(rows.map((z) => Math.round(z * 1e5) / 1e5))].sort((a, b) => a - b);
}

export interface LoftOptions {
  /** Alturas de las filas, de abajo arriba. */
  rows: readonly number[];
  /** Columnas alrededor; con `arc`, un tramo abierto de acimuts [desde, hasta] (ambos incluidos). */
  columns: number;
  arc?: readonly [number, number];
  /** Cuánto se separa la superficie (m) en (acimut, z): biseles, ranuras, pliegues. */
  lift?: (azimuth: number, z: number) => number;
  color: (azimuth: number, z: number) => Color;
}

/** Un tubo (o un tramo de él) que sigue unas secciones horizontales. */
export function loftGeometry(sections: readonly Section[], options: LoftOptions): BufferGeometry {
  const closed = !options.arc;
  const [from, to] = options.arc ?? [0, Math.PI * 2];
  const lift = options.lift ?? (() => 0);
  const cache = new Map<number, FullSection>();
  const section = (z: number): FullSection => {
    let hit = cache.get(z);
    if (!hit) {
      hit = sectionAt(sections, z);
      cache.set(z, hit);
    }
    return hit;
  };
  return gridGeometry({
    us: spread(from, to, options.columns + (closed ? 0 : 1), closed),
    vs: options.rows,
    closed,
    point: (azimuth, z) => ringPoint(section(z), azimuth, lift(azimuth, z)),
    color: options.color,
  });
}

/** Sube de 0 a 1 entre `a` y `b`, suave. */
export function smooth01(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
}

/**
 * Los bordes de una placa de cerámica de `from` a `to`: abajo se redondea hacia dentro (el labio de la placa) y
 * arriba sigue, metida bajo la siguiente, `tuck` metros más (hundida `inset`). Devuelve la separación en `z`.
 */
export function plateEdge(
  from: number,
  to: number,
  z: number,
  options: { lip?: number; inset?: number; tuck?: number } = {},
): number {
  const lip = options.lip ?? 0.016;
  const inset = options.inset ?? 0.006;
  const tuck = options.tuck ?? 0;
  let lift = 0;
  if (lip > 0 && z < from + lip) lift -= inset * (1 - smooth01(from - 1e-6, from + lip, z)) ** 2;
  if (tuck > 0 && z > to) lift -= inset * smooth01(to, to + Math.min(0.01, tuck), z);
  return lift;
}

/** Un color un poco más oscuro (o claro, con `k` < 0). */
export function shade(color: Color, k: number): Color {
  return color.clone().multiplyScalar(1 - k);
}
