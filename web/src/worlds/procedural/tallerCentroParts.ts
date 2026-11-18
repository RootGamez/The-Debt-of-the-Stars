// Piezas de la casa del escéptico (plan de finales, E5): formas suaves (cajas redondeadas, columnas, rejillas) y el
// saco que las junta, cuece su luz y las une en una malla. Todo en el marco del Taller (Z arriba). Las formas son
// nuevas en cada llamada (no las primitivas en caché de kit.ts), así que se pueden mover sin clonar.
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  bake,
  setTally,
  type BakedLight,
  type BakedSky,
  type TallyFace,
} from './tallerCentroMaterial';

/** Sin índices ni uv: así todas las piezas se pueden unir. */
export function plain(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute('uv');
  return flat;
}

const corner = new Vector3();
const inner = new Vector3();

/** Caja de `w × d × h` con las aristas redondeadas (radio `r`), centrada. */
export function softBox(w: number, d: number, h: number, r: number, steps = 3): BufferGeometry {
  const geometry = new BoxGeometry(w, d, h, steps * 2, steps * 2, steps * 2);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const half = new Vector3(w / 2 - r, d / 2 - r, h / 2 - r).max(new Vector3(0, 0, 0));
  for (let i = 0; i < positions.count; i++) {
    corner.fromBufferAttribute(positions, i);
    inner.copy(corner).clamp(half.clone().negate(), half);
    const out = corner.clone().sub(inner);
    if (out.lengthSq() < 1e-12) continue;
    out.normalize();
    positions.setXYZ(i, inner.x + out.x * r, inner.y + out.y * r, inner.z + out.z * r);
    normals.setXYZ(i, out.x, out.y, out.z);
  }
  return plain(geometry);
}

/** Columna con eje Z, del suelo (z = 0) a `h`, de radio `bottom` abajo y `top` arriba. */
export function column(bottom: number, top: number, h: number, sides = 24): BufferGeometry {
  return plain(
    new CylinderGeometry(top, bottom, h, sides, Math.max(1, Math.round(h / 0.4)))
      .rotateX(Math.PI / 2)
      .translate(0, 0, h / 2),
  );
}

/** Rejilla de `cols × rows` celdas a partir de una función de posición (u, v en 0–1); normales suaves. */
export function grid(
  cols: number,
  rows: number,
  at: (u: number, v: number) => Vector3,
  outward?: Vector3 | ((p: Vector3) => Vector3),
): BufferGeometry {
  const positions: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const p = at(i / cols, j / rows);
      positions.push(p.x, p.y, p.z);
    }
  }
  const index: number[] = [];
  const row = cols + 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * row + i;
      index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  if (outward) faceOutward(geometry, outward);
  return plain(geometry);
}

/** Si las normales miran al revés de `outward` (en el primer vértice), da la vuelta a las caras. */
function faceOutward(geometry: BufferGeometry, outward: Vector3 | ((p: Vector3) => Vector3)): void {
  const p = new Vector3().fromBufferAttribute(geometry.getAttribute('position'), 0);
  const n = new Vector3().fromBufferAttribute(geometry.getAttribute('normal'), 0);
  const want = outward instanceof Vector3 ? outward : outward(p);
  if (n.dot(want) >= 0) return;
  const index = geometry.getIndex();
  if (index) {
    const a = index.array;
    for (let k = 0; k < a.length; k += 3) {
      const t = a[k + 1] ?? 0;
      a[k + 1] = a[k + 2] ?? 0;
      a[k + 2] = t;
    }
    index.needsUpdate = true;
  }
  geometry.computeVertexNormals();
}

/** Cómo se cuece la luz de toda la casa. */
export interface Lighting {
  sky: BakedSky;
  steady: readonly BakedLight[];
  glowing: readonly BakedLight[];
  occlusion: (p: Vector3) => number;
}

interface Part {
  geometry: BufferGeometry;
  color: Color;
  /** Brilla por sí misma (la lámpara): no se cuece, se pinta con su color. */
  emissive: boolean;
  tally?: { uv: (i: number) => readonly [number, number]; face: TallyFace };
  /** Tono punto a punto (multiplica el color, después de cocer). */
  tint?: (p: Vector3) => number;
}

export interface AddOptions {
  /** Variación de luminosidad de esta pieza. */
  vary?: number;
  emissive?: boolean;
  /** Multiplica el color (> 1 en lo que brilla). */
  glow?: number;
  /** Se choca con ella (por defecto, no). */
  solid?: boolean;
  tally?: Part['tally'];
  tint?: Part['tint'];
}

/** Junta las piezas, cuece su luz y las une en una malla. */
export class CentroParts {
  private readonly parts: Part[] = [];
  readonly colliders: BufferGeometry[] = [];

  constructor(private readonly random: () => number) {}

  add(geometry: BufferGeometry, matrix: Matrix4, color: string, options: AddOptions = {}): void {
    const placed = plain(geometry).applyMatrix4(matrix);
    const c = new Color(color);
    const vary = options.vary ?? 0.04;
    if (vary) c.offsetHSL(0, 0, (this.random() - 0.5) * vary);
    if (options.glow) c.multiplyScalar(options.glow);
    this.parts.push({
      geometry: placed,
      color: c,
      emissive: options.emissive === true,
      ...(options.tally ? { tally: options.tally } : {}),
      ...(options.tint ? { tint: options.tint } : {}),
    });
    if (options.solid) this.colliders.push(onlyPositions(placed));
  }

  /** Cuece y une todo; `matrix` (opcional) lleva el resultado a otro marco después de cocerlo. */
  mesh(name: string, material: Material, lighting: Lighting, matrix?: Matrix4): Mesh {
    const ready = this.parts.map((part) => {
      if (part.emissive) paint(part.geometry, part.color);
      else bake(part.geometry, part.color, lighting);
      if (part.tint) tintBy(part.geometry, part.tint);
      setTally(part.geometry, part.tally?.uv, part.tally?.face);
      if (matrix) part.geometry.applyMatrix4(matrix);
      return part.geometry;
    });
    const mesh = new Mesh(mergeGeometries(ready), material);
    mesh.name = name;
    return mesh;
  }
}

function onlyPositions(geometry: BufferGeometry): BufferGeometry {
  const only = new BufferGeometry();
  only.setAttribute('position', geometry.getAttribute('position').clone());
  return only;
}

function paint(geometry: BufferGeometry, color: Color): void {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aGlow', new Float32BufferAttribute(new Float32Array(count * 3), 3));
}

function tintBy(geometry: BufferGeometry, tint: (p: Vector3) => number): void {
  const positions = geometry.getAttribute('position');
  const p = new Vector3();
  for (const name of ['color', 'aGlow']) {
    const attribute = geometry.getAttribute(name);
    for (let i = 0; i < attribute.count; i++) {
      const k = tint(p.fromBufferAttribute(positions, i));
      attribute.setXYZ(i, attribute.getX(i) * k, attribute.getY(i) * k, attribute.getZ(i) * k);
    }
  }
}
