// Doblar el edificio del Observatorio sobre su terraza (observatorioShape.ts): el edificio se construye en el plano
// del mapa (marco `terraceFrame()`) y aquí cada vértice pasa a su sitio en la esfera del suelo. Lo que está a una
// altura z del plano queda a z sobre el suelo, y las líneas verticales siguen verticales. Antes se parten los
// triángulos largos para que suelos, paredes y techos sigan la curva y no la corten en cuerda.
import { BufferAttribute, BufferGeometry, Quaternion, Vector3 } from 'three';
import { TERRACE, mapPoint, mapTurn } from './observatorioShape';

/** El lado más largo (m, medido a lo largo del suelo) que puede tener un triángulo antes de doblarse. */
const MAX_EDGE = 1.2;

/** Coordenadas del mapa (x, y, altura) de un punto del marco plano de la terraza. */
export function flatToMap(p: Vector3): Vector3 {
  const offset = p.clone().addScaledVector(TERRACE.up, -TERRACE.radius);
  return new Vector3(offset.dot(TERRACE.right), offset.dot(TERRACE.north), offset.dot(TERRACE.up));
}

/** Un punto del marco plano, llevado a la terraza doblada. */
export function drapePoint(p: Vector3): Vector3 {
  const m = flatToMap(p);
  return mapPoint(m.x, m.y, m.z);
}

/** El giro que hay que añadir a algo puesto en `p` (marco plano) para que siga derecho sobre la terraza. */
export function drapeTurn(p: Vector3): Quaternion {
  const m = flatToMap(p);
  return mapTurn(m.x, m.y);
}

type Corner = { p: Vector3; c: readonly number[] };

/** Parte el triángulo por la mitad de su lado más largo (en planta) hasta que ninguno pase de MAX_EDGE. */
function split(a: Corner, b: Corner, c: Corner, out: Corner[]): void {
  const flat = (u: Vector3, v: Vector3): number => Math.hypot(u.x - v.x, u.y - v.y);
  const ab = flat(a.p, b.p);
  const bc = flat(b.p, c.p);
  const ca = flat(c.p, a.p);
  const longest = Math.max(ab, bc, ca);
  if (longest <= MAX_EDGE) {
    out.push(a, b, c);
    return;
  }
  const mid = (u: Corner, v: Corner): Corner => ({
    p: u.p.clone().lerp(v.p, 0.5),
    c: u.c.map((x, i) => (x + (v.c[i] ?? x)) / 2),
  });
  if (longest === ab) {
    const m = mid(a, b);
    split(a, m, c, out);
    split(m, b, c, out);
  } else if (longest === bc) {
    const m = mid(b, c);
    split(a, b, m, out);
    split(a, m, c, out);
  } else {
    const m = mid(c, a);
    split(a, b, m, out);
    split(m, b, c, out);
  }
}

/**
 * Dobla una geometría (en coordenadas del marco plano de la terraza) sobre la terraza. Devuelve una geometría sin
 * índice con posición, normal (salvo que se pida sin ella: las colisiones solo llevan posición) y, si la tenía, color.
 */
export function drapeGeometry(geometry: BufferGeometry, normals = true): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute('position');
  const color = source.getAttribute('color') as BufferAttribute | undefined;
  const corners: Corner[] = [];
  for (let i = 0; i < position.count; i++) {
    const p = flatToMap(new Vector3(position.getX(i), position.getY(i), position.getZ(i)));
    corners.push({ p, c: color ? [color.getX(i), color.getY(i), color.getZ(i)] : [] });
  }
  const out: Corner[] = [];
  for (let i = 0; i + 2 < corners.length; i += 3) {
    const [a, b, c] = [corners[i], corners[i + 1], corners[i + 2]];
    if (a && b && c) split(a, b, c, out);
  }
  const positions = new Float32Array(out.length * 3);
  const colors = color ? new Float32Array(out.length * 3) : undefined;
  out.forEach(({ p, c }, i) => {
    const w = mapPoint(p.x, p.y, p.z);
    positions.set([w.x, w.y, w.z], i * 3);
    colors?.set(c, i * 3);
  });
  const result = new BufferGeometry();
  result.setAttribute('position', new BufferAttribute(positions, 3));
  if (colors) result.setAttribute('color', new BufferAttribute(colors, 3));
  if (normals) result.computeVertexNormals();
  return result;
}

/** Dobla en su sitio todas las geometrías de una lista. */
export function drapeAll(list: BufferGeometry[], normals = true): void {
  list.forEach((g, i) => {
    list[i] = drapeGeometry(g, normals);
  });
}
