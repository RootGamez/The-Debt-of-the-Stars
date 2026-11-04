// Piezas sueltas para vestir al explorador: segmentos del esqueleto con sus mallas por material, y ayudas para
// poner cosas sobre la superficie de un elipsoide (parches, costuras, correas). Marco de diseño de los Ool:
// Z arriba, frente +Y, derecha +X, los pies en z = 0 (ver worlds/procedural/ool.ts).
import { BufferAttribute, Color, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { box, torus, type Triple } from '../worlds/procedural/kit';
import { seededRandom, type Random } from '../worlds/procedural/noise';

/** Tela y cuero (mate), metal (latón, cobre, hierro), lo que brilla, el cristal del casco y sus reflejos. */
export type PartKind = 'suit' | 'metal' | 'glow' | 'glass' | 'shine';

export const PART_KINDS: readonly PartKind[] = ['suit', 'metal', 'glow', 'glass', 'shine'];

/** Un hueso rígido: todo lo que cuelga de una articulación, en coordenadas absolutas de diseño. */
export class Segment {
  readonly parts: Record<PartKind, BufferGeometry[]> = {
    suit: [],
    metal: [],
    glow: [],
    glass: [],
    shine: [],
  };
  private readonly random: Random;

  constructor(seed: number) {
    this.random = seededRandom(seed);
  }

  add(
    kind: PartKind,
    color: string | Color,
    geometry: BufferGeometry,
    matrix: Matrix4,
    vary = 0.03,
  ): void {
    const g = geometry.clone().applyMatrix4(matrix);
    g.deleteAttribute('uv');
    const c = new Color(color);
    if (vary) c.offsetHSL(0, 0, (this.random() - 0.5) * vary);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    this.parts[kind].push(g);
  }

  /** Un poco de azar estable (para que las fibras y las puntadas no sean todas iguales). */
  next(): number {
    return this.random();
  }
}

/** Un elipsoide de diseño: centro y semiejes. */
export interface Ellipsoid {
  center: Triple;
  radii: Triple;
}

/** Un punto de la superficie y su normal: `azimuth` desde el frente (+Y) hacia la derecha (+X), `z` absoluta. */
export interface SurfacePoint {
  point: Vector3;
  normal: Vector3;
}

export function onEllipsoid(e: Ellipsoid, azimuth: number, z: number, lift = 0): SurfacePoint {
  const [cx, cy, cz] = e.center;
  const [rx, ry, rz] = e.radii;
  const u = Math.max(-0.999, Math.min(0.999, (z - cz) / rz));
  const ring = Math.sqrt(1 - u * u);
  const local = new Vector3(rx * ring * Math.sin(azimuth), ry * ring * Math.cos(azimuth), rz * u);
  const normal = new Vector3(
    local.x / (rx * rx),
    local.y / (ry * ry),
    local.z / (rz * rz),
  ).normalize();
  const point = local.add(new Vector3(cx, cy, cz)).addScaledVector(normal, lift);
  return { point, normal };
}

/** Radio horizontal (en X) de un elipsoide a la altura `z`. */
export function ringRadius(e: Ellipsoid, z: number): number {
  const u = (z - e.center[2]) / e.radii[2];
  return e.radii[0] * Math.sqrt(Math.max(0, 1 - u * u));
}

const Z_UP = new Vector3(0, 0, 1);

/**
 * Una base pegada a la superficie: Z local = la normal, Y local = lo más parecido a "arriba", X = el lado. Una
 * caja de tamaño (ancho, alto, grosor) con esta matriz queda plana sobre la tela.
 */
export function surfaceMatrix(at: SurfacePoint, size: Triple, tilt = 0): Matrix4 {
  const n = at.normal;
  const upHint = Math.abs(n.dot(Z_UP)) > 0.95 ? new Vector3(0, 1, 0) : Z_UP;
  const side = new Vector3().crossVectors(upHint, n).normalize();
  const up = new Vector3().crossVectors(n, side).normalize();
  const basis = new Matrix4().makeBasis(side, up, n);
  const spin = new Matrix4().makeRotationZ(tilt);
  return new Matrix4()
    .compose(
      at.point,
      new Quaternion().setFromRotationMatrix(basis.multiply(spin)),
      new Vector3(1, 1, 1),
    )
    .multiply(new Matrix4().makeScale(...size));
}

/** Una pieza alargada de `from` a `to` (una caja o un cilindro de eje Z y largo 1), con ese grosor. */
export function between(from: Vector3, to: Vector3, width: number, depth = width): Matrix4 {
  const along = to.clone().sub(from);
  const q = new Quaternion().setFromUnitVectors(Z_UP, along.clone().normalize());
  return new Matrix4().compose(
    from.clone().add(to).multiplyScalar(0.5),
    q,
    new Vector3(width, depth, along.length()),
  );
}

/** Un parche cosido: el trozo de tela y sus puntadas alrededor. */
export function patch(
  segment: Segment,
  at: SurfacePoint,
  width: number,
  height: number,
  color: string,
  stitch: string,
  tilt = 0,
): void {
  segment.add('suit', color, box(), surfaceMatrix(at, [width, height, 0.014], tilt), 0.06);
  const half = [width / 2 - 0.008, height / 2 - 0.008] as const;
  const stitches = Math.max(3, Math.round((width + height) / 0.03));
  for (let k = 0; k < stitches; k++) {
    const t = k / stitches;
    // Recorre el borde: arriba, derecha, abajo, izquierda.
    const edge = Math.floor(t * 4);
    const f = t * 4 - edge;
    const x =
      edge === 0
        ? -half[0] + 2 * half[0] * f
        : edge === 1
          ? half[0]
          : edge === 2
            ? half[0] - 2 * half[0] * f
            : -half[0];
    const y =
      edge === 0
        ? half[1]
        : edge === 1
          ? half[1] - 2 * half[1] * f
          : edge === 2
            ? -half[1]
            : -half[1] + 2 * half[1] * f;
    const across = edge % 2 === 0 ? [0.012, 0.004] : [0.004, 0.012];
    const local = new Matrix4().compose(
      new Vector3(x, y, 0.009),
      new Quaternion(),
      new Vector3(across[0] ?? 0.01, across[1] ?? 0.01, 0.004),
    );
    segment.add('suit', stitch, box(), surfaceMatrix(at, [1, 1, 1], tilt).multiply(local), 0);
  }
}

/** Una correa que sigue la superficie por unos puntos (con un poco de holgura hacia fuera). */
export function strap(
  segment: Segment,
  points: readonly Vector3[],
  width: number,
  color: string,
  thickness = 0.014,
): void {
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    if (!a || !b) continue;
    // Un poco más larga para que los tramos se solapen sin huecos.
    const along = b.clone().sub(a).normalize().multiplyScalar(0.006);
    const m = between(a.clone().sub(along), b.clone().add(along), width, thickness);
    segment.add('suit', color, box(), alignFlat(m, a, b), 0.02);
  }
}

/** Gira una caja alargada sobre su eje para que su cara ancha mire hacia fuera del cuerpo (desde el eje Z). */
function alignFlat(m: Matrix4, a: Vector3, b: Vector3): Matrix4 {
  const middle = a.clone().add(b).multiplyScalar(0.5);
  const outward = new Vector3(middle.x, middle.y, 0).normalize();
  const along = b.clone().sub(a).normalize();
  const side = new Vector3().crossVectors(along, outward).normalize();
  const face = new Vector3().crossVectors(side, along).normalize();
  const basis = new Matrix4().makeBasis(side, face, along);
  const position = new Vector3();
  const scale = new Vector3();
  m.decompose(position, new Quaternion(), scale);
  return new Matrix4().compose(position, new Quaternion().setFromRotationMatrix(basis), scale);
}

/** Un anillo tumbado (eje Z de diseño): los toros del kit están de pie. */
export const ring = (radius: number, tube: number, sides = 24, section = 6): BufferGeometry =>
  torus(radius, tube, sides, section)
    .clone()
    .rotateX(Math.PI / 2);
