// Piezas comunes del Albatros II por código: la paleta (los colores de Hogar: crema, ocre y verde, con latón y la
// luz verde azulada de los Ool), las geometrías de revolución y las de suelo con agujero. Las piezas se acumulan en
// un PieceSet de kit.ts (vertex colors, pocas mallas) y su colisión se usa para andar por la nave posada.
import {
  BufferGeometry,
  LatheGeometry,
  Matrix4,
  Path,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { pieceMatrix, type PieceSet, type Triple } from '../../worlds/procedural/kit';

/** Colores del Albatros II (🟡 D5: los de Hogar). */
export const ALBATROS_PALETTE = Object.freeze({
  cream: '#e9dcc0',
  creamDark: '#cdbb98',
  ochre: '#c98f3e',
  green: '#5f8f5a',
  greenDark: '#3f6440',
  brass: '#c7a14f',
  dark: '#3b352f',
  fabric: '#b9905e',
  fabricLight: '#d8b98a',
  wood: '#8a6342',
  woodDark: '#5d412b',
  paper: '#f1e6cc',
  ink: '#3a3029',
  glow: '#8fe3d0',
  glowWarm: '#ffd38a',
  map: '#24334a',
});

/** Para las piezas propias (no las primitivas en caché): sin índices ni UV, como las de kit.ts. */
export function prepared(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat.hasAttribute('uv')) flat.deleteAttribute('uv');
  flat.computeVertexNormals();
  return flat;
}

/**
 * Superficie de revolución alrededor del eje Y a partir de un perfil (radio, altura), entre dos ángulos (0 = +Z,
 * creciendo hacia +X; la proa, −Z, es π). Con el perfil de abajo arriba las caras miran hacia fuera; al revés,
 * hacia dentro (los forros de la sala).
 */
export function lathe(
  profile: readonly (readonly [number, number])[],
  segments: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
): BufferGeometry {
  const points = profile.map(([r, y]) => new Vector2(r, y));
  return prepared(new LatheGeometry(points, segments, phiStart, phiLength));
}

/**
 * Disco plano (en el plano XZ, a la altura `y`) de radio `radius` con un agujero rectangular; mira hacia arriba o
 * hacia abajo.
 */
export function discWithHole(
  radius: number,
  y: number,
  hole: { minX: number; maxX: number; minZ: number; maxZ: number },
  facing: 'up' | 'down',
  segments = 48,
): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const gap = new Path();
  // En el plano de la forma, su Y es la −Z de la nave (se tumba con rotateX(−π/2)). Mirando abajo se da la
  // vuelta con rotateZ(π), que invierte X (e Y) pero conserva Z: por eso la X del agujero va reflejada.
  const minX = facing === 'down' ? -hole.maxX : hole.minX;
  const maxX = facing === 'down' ? -hole.minX : hole.maxX;
  gap.moveTo(minX, -hole.minZ);
  gap.lineTo(minX, -hole.maxZ);
  gap.lineTo(maxX, -hole.maxZ);
  gap.lineTo(maxX, -hole.minZ);
  gap.lineTo(minX, -hole.minZ);
  shape.holes.push(gap);
  const geometry = new ShapeGeometry(shape, segments).rotateX(-Math.PI / 2);
  if (facing === 'down') geometry.rotateZ(Math.PI);
  geometry.translate(0, y, 0);
  return prepared(geometry);
}

/** Atajo: una pieza con posición, giro (Euler de kit.ts) y escala. */
export function at(position: Triple, rotation?: Triple, scale?: Triple): Matrix4 {
  return pieceMatrix(position, rotation, scale);
}

const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Matriz que estira una pieza con eje Z y largo 1 (cilindros y conos de kit.ts) de `from` a `to`, con grosor
 * `width` (escala en X e Y).
 */
export function between(from: Triple, to: Triple, width = 1): Matrix4 {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const axis = b.clone().sub(a);
  const length = axis.length();
  const turn = new Quaternion().setFromUnitVectors(Z_AXIS, axis.normalize());
  return new Matrix4().compose(
    a.add(b).multiplyScalar(0.5),
    turn,
    new Vector3(width, width, length),
  );
}

export type { PieceSet };
