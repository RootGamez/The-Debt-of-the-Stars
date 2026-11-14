// La ropa de los Ausentes vivos (plan de finales, E3; 🟡 Anthony 2026-11-14): tela pesada y cuero con pliegues
// modelados, tejidos como superficies suaves (absentLoft.ts). Un cuerpo rígido por huesos no deja que la tela se doble,
// así que la falda se parte por piernas: cada mitad cuelga de su muslo y de su espinilla, y al sentarse se queda sobre
// el regazo y cae desde la rodilla, que es lo que hace la tela de verdad. Por delante y por detrás, cada mitad se mete
// un poco bajo la otra para que no se abra una raja. Ella lleva una túnica larga y un manto (absentRobe.ts); él, un
// chaleco, un delantal de forja partido y una bandolera (absentWorkwear.ts).
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Vector3,
} from 'three';
import {
  gridGeometry,
  ringPoint,
  rowsBetween,
  sectionAt,
  smooth01,
  spread,
  type FullSection,
} from './absentLoft';
import type { Bulb, Section } from './absentShape';
import type { AbsentPartKind, AbsentSegment } from './absentParts';
import type { SurfacePoint } from './explorerParts';

/** Pliegues verticales: una cresta redonda y un valle estrecho (solo hacia fuera). */
export function folds(azimuth: number, z: number, count: number, phase = 0): number {
  const wave = 0.5 + 0.5 * Math.cos(count * azimuth + phase + 0.7 * Math.sin(z * 3.1 + phase));
  return wave ** 1.6;
}

/** Una curva suave por unos puntos (x, y), sin pasarse entre ellos. */
export function curve(points: readonly (readonly [number, number])[], x: number): number {
  const sections: Section[] = points.map(([px, py]) => ({ z: px, rx: py, front: 0, back: 0 }));
  return sectionAt(sections, x).rx;
}

export interface PanelOptions {
  /** Las secciones de la falda entera (centradas en el cuerpo), de abajo arriba. */
  sections: readonly Section[];
  from: number;
  to: number;
  side: number;
  /** El tramo de acimuts del lado derecho (el izquierdo es su espejo): por defecto, de delante a detrás. */
  arc?: readonly [number, number];
  /** Lo que se mete bajo la otra mitad, pasado el centro (rad). */
  overlap?: number;
  /** Profundidad de los pliegues (m) a cada altura, y cuántos caben en una vuelta entera. */
  depth: (z: number) => number;
  count: number;
  /** Atenúa los pliegues por acimut (1 = enteros). */
  fade?: (azimuth: number) => number;
  colors: { base: string; shade: string; trim?: string };
  /** Un dobladillo del color del hilo (m) abajo. */
  hem?: number;
  step?: number;
  columns?: number;
}

/** Media falda (o un faldón de delantal) para una pierna. */
export function skirtPanel(s: AbsentSegment, options: PanelOptions): void {
  const overlap = options.overlap ?? 0.12;
  const [a0, a1] = options.arc ?? [-overlap, Math.PI + overlap];
  // El lado izquierdo recorre los acimuts simétricos, también de menos a más (la cara de fuera sigue fuera).
  const [from, to] = options.side > 0 ? [a0, a1] : [-a1, -a0];
  const base = new Color(options.colors.base);
  const shadeTone = new Color(options.colors.shade);
  const trim = new Color(options.colors.trim ?? options.colors.shade);
  const hem = options.hem ?? 0;
  const fade = options.fade ?? (() => 1);
  /** Pasado el centro, hundida bajo la otra mitad. */
  const tucked = (az: number): number => {
    const r = options.side > 0 ? az : -az;
    const past = Math.max(-r, r - Math.PI, 0);
    return smooth01(0, overlap * 0.6, past);
  };
  // Unas tres columnas y media por pliegue: con menos, los pliegues se deshacen en dientes de sierra.
  const columns =
    options.columns ?? Math.max(8, Math.round(((to - from) / (Math.PI * 2)) * options.count * 3.5));
  const cache = new Map<number, FullSection>();
  const section = (z: number): FullSection => {
    let hit = cache.get(z);
    if (!hit) {
      hit = sectionAt(options.sections, z);
      cache.set(z, hit);
    }
    return hit;
  };
  const lift = (az: number, z: number): number =>
    options.depth(z) *
      fade(options.side > 0 ? az : -az) *
      folds(az, z, options.count, options.side) -
    0.014 * tucked(az);
  s.addWoven(
    'cloth',
    gridGeometry({
      us: spread(from, to, columns + 1),
      vs: rowsBetween(
        options.from,
        options.to,
        options.step ?? 0.05,
        hem > 0 ? [options.from + hem] : [],
      ),
      point: (az, z) => ringPoint(section(z), az, lift(az, z)),
      color: (az, z) => {
        if (hem > 0 && z <= options.from + hem) return trim;
        const valley = 1 - folds(az, z, options.count, options.side);
        return base
          .clone()
          .lerp(shadeTone, 0.55 * valley * Math.min(1, options.depth(z) * 60) + 0.5 * tucked(az));
      },
    }),
  );
}

export interface DrapeOptions {
  /** El cuerpo de debajo: sus secciones y lo que se separa la tela de él (m) en (acimut, z). */
  body: readonly Section[];
  lift: (azimuth: number, z: number) => number;
  /** Bultos que la tela debe rodear por fuera (los hombros), con su holgura (m). */
  avoid?: readonly Bulb[];
  clearance?: number;
  /** El tramo de acimuts (abierto por delante) y la altura del borde de abajo y de arriba en cada acimut. */
  arc: readonly [number, number];
  hem: (azimuth: number) => number;
  top: (azimuth: number) => number;
  columns: number;
  rows: number;
  colors: { base: string; shade: string; trim: string };
  /** Ancho del ribete (m) en los bordes de delante y abajo. */
  trim: number;
  /** Pliegues: profundidad (m) según la fracción de caída (0 arriba, 1 abajo). */
  foldDepth?: (drop: number) => number;
  foldCount?: number;
  kind?: AbsentPartKind;
  /** Para un tronco encorvado: lo que cuelga por debajo de la articulación de su hueso (absentCloth.ts, `leanBelow`). */
  lean?: Lean;
}

/**
 * Un hueso que se inclina hacia delante sobre el de debajo (él va encorvado) mete en la barriga lo que cuelga por
 * debajo de su articulación. Por debajo de `pivot`, la prenda se diseña adelantada (`slope` m por metro), así que
 * encorvado queda en su sitio.
 */
export interface Lean {
  pivot: number;
  slope: number;
}

/** Adelanta (+Y) lo que queda por debajo de la articulación, en proporción a la distancia. */
export function leanBelow(point: Vector3, lean: Lean | undefined): Vector3 {
  if (!lean || point.z >= lean.pivot) return point;
  return new Vector3(point.x, point.y + (lean.pivot - point.z) * lean.slope, point.z);
}

/** El punto de una prenda que cuelga sobre el cuerpo (absoluto, de diseño). */
export function drapePoint(options: DrapeOptions, azimuth: number, drop: number): Vector3 {
  const z = options.top(azimuth) + (options.hem(azimuth) - options.top(azimuth)) * drop;
  const body = sectionAt(options.body, z);
  const lift =
    options.lift(azimuth, z) +
    (options.foldDepth?.(drop) ?? 0) * folds(azimuth, z, options.foldCount ?? 16);
  const point = ringPoint(
    { ...body, rx: body.rx + lift, front: body.front + lift, back: body.back + lift },
    azimuth,
    0,
  );
  const clear = (options.avoid ?? []).reduce(
    (p, bulb) => outside(p, bulb, options.clearance ?? 0.015),
    point,
  );
  return leanBelow(clear, options.lean);
}

/** Si `p` cae dentro del bulto (con su holgura), lo saca a su superficie desde el centro del bulto. */
function outside(p: Vector3, bulb: Bulb, clearance: number): Vector3 {
  const [cx, cy, cz] = bulb.center;
  const [rx, ry, rz] = bulb.radii;
  const q = new Vector3(
    (p.x - cx) / (rx + clearance),
    (p.y - cy) / (ry + clearance),
    (p.z - cz) / (rz + clearance),
  );
  const length = q.length();
  if (length >= 1 || length < 1e-6) return p;
  q.divideScalar(length);
  return new Vector3(
    cx + q.x * (rx + clearance),
    cy + q.y * (ry + clearance),
    cz + q.z * (rz + clearance),
  );
}

/** El punto de una prenda y su normal hacia fuera (para coser o colgar algo encima). */
export function drapeFrame(options: DrapeOptions, azimuth: number, drop: number): SurfacePoint {
  const e = 0.01;
  const point = drapePoint(options, azimuth, drop);
  const across = drapePoint(options, azimuth + e, drop).sub(drapePoint(options, azimuth - e, drop));
  const down = drapePoint(options, azimuth, Math.min(1, drop + e)).sub(
    drapePoint(options, azimuth, Math.max(0, drop - e)),
  );
  const normal = new Vector3().crossVectors(across, down).normalize();
  if (normal.dot(new Vector3(point.x, point.y, 0)) < 0) normal.negate();
  return { point, normal };
}

/** Una prenda que cuelga sobre el tronco: un manto, un chaleco, el peto de un delantal. */
export function drape(s: AbsentSegment, options: DrapeOptions): void {
  const [from, to] = options.arc;
  const base = new Color(options.colors.base);
  const shadeTone = new Color(options.colors.shade);
  const trim = new Color(options.colors.trim);
  const edge = (az: number, drop: number): boolean => {
    const z0 = options.top(az);
    const z1 = options.hem(az);
    const height = Math.abs(z0 - z1);
    const fromEdge = Math.min(az - from, to - az) * 0.2;
    return drop * height > height - options.trim || fromEdge < options.trim;
  };
  s.addWoven(
    options.kind ?? 'cloth',
    gridGeometry({
      us: spread(from, to, options.columns + 1),
      // De abajo arriba: la cara de fuera, fuera.
      vs: spread(1, 0, options.rows + 1),
      point: (az, drop) => drapePoint(options, az, drop),
      color: (az, drop) => {
        if (edge(az, drop)) return trim;
        const valley = 1 - folds(az, options.top(az), options.foldCount ?? 16);
        return base.clone().lerp(shadeTone, 0.45 * valley * drop);
      },
    }),
  );
}

let sleeveGeometry: BufferGeometry | undefined;

/** Una caja sin tapas en sus extremos (a lo largo de Z): los tramos de una tira se tapan unos a otros. */
function sleeve(): BufferGeometry {
  if (!sleeveGeometry) {
    const full = new BoxGeometry(1, 1, 1).toNonIndexed();
    // Las caras van en orden +X, −X, +Y, −Y, +Z, −Z: las cuatro primeras son los lados (24 vértices).
    const sides = 24;
    sleeveGeometry = new BufferGeometry();
    for (const name of ['position', 'normal'] as const) {
      const attribute = full.getAttribute(name);
      sleeveGeometry.setAttribute(
        name,
        new Float32BufferAttribute(Array.from(attribute.array).slice(0, sides * 3), 3),
      );
    }
    full.dispose();
  }
  return sleeveGeometry;
}

/** Una tira plana (correa, ribete) de `a` a `b`, con la cara ancha mirando hacia `normal`. */
export function flatStrip(
  s: AbsentSegment,
  kind: AbsentPartKind,
  color: string,
  a: Vector3,
  b: Vector3,
  normal: Vector3,
  width: number,
  thick: number,
): void {
  const along = b.clone().sub(a);
  const length = along.length();
  if (length < 1e-5) return;
  along.normalize();
  const across = new Vector3().crossVectors(normal, along).normalize();
  const out = new Vector3().crossVectors(along, across).normalize();
  const m = new Matrix4()
    .makeBasis(across, out, along)
    .setPosition(a.clone().add(b).multiplyScalar(0.5))
    .multiply(new Matrix4().makeScale(width, thick, length + 0.004));
  s.add(kind, color, sleeve(), m, 0.02);
}
