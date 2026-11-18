// Los muros de la casa del escéptico (plan de finales, E5): un corro de losas de piedra alrededor de la Cámara, de
// pie sobre el núcleo, labradas a mano (bordes irregulares) y llenas de rayas, una por vuelta, en sus dos caras. La
// cuenta empieza en el primer muro y sigue muro a muro; el muro abierto aún se está llenando.
import { Matrix4, Vector3 } from 'three';
import { createNoise } from './noise';
import { grid, type CentroParts } from './tallerCentroParts';
import {
  OPEN_WALL,
  OPEN_WALL_FILL,
  TALLY_MARGIN,
  TALLY_ROWS,
  WALL_COLATITUDE,
  WALL_THICKNESS,
  WALLS,
  tallyGroupsPerRow,
  wallWidth,
  type WallSpec,
} from './tallerCentroShape';
import { CORE_RADIUS } from './tallerShape';

const DEG = Math.PI / 180;
const STONE = '#6c6470';
/** Cuánto se hunde el muro bajo el suelo (para que no se vea el borde en la curva). */
const SINK = 0.35;
const noise = createNoise(51);
const IDENTITY = new Matrix4();

/** Arriba (radial) y hacia fuera de la Cámara (a lo largo del meridiano) en la longitud `lon` del muro. */
function axes(lon: number): { up: Vector3; away: Vector3 } {
  const t = WALL_COLATITUDE * DEG;
  const l = lon * DEG;
  return {
    up: new Vector3(Math.sin(t) * Math.cos(l), Math.sin(t) * Math.sin(l), Math.cos(t)),
    away: new Vector3(Math.cos(t) * Math.cos(l), Math.cos(t) * Math.sin(l), -Math.sin(t)),
  };
}

/** Lo alto del muro en cada punto: el borde de arriba, desigual, labrado a golpes. */
function topAt(wall: WallSpec, lon: number): number {
  const chips =
    noise(lon * 0.21, wall.height, 3.1) * 0.22 + noise(lon * 0.9, 1.7, wall.from) * 0.07;
  return wall.height + chips;
}

/** Un punto del muro: longitud, altura sobre el suelo y lado (−1 la cara de dentro, +1 la de fuera). */
function wallPoint(wall: WallSpec, lon: number, height: number, side: number): Vector3 {
  const { up, away } = axes(lon);
  const rough = noise(lon * 0.6, height * 1.3, side * 4 + wall.from) * 0.035;
  return up
    .clone()
    .multiplyScalar(CORE_RADIUS + height)
    .addScaledVector(away, side * (WALL_THICKNESS / 2 + rough));
}

interface Face {
  side: number;
  offset: number;
  fill?: number;
}

function face(parts: CentroParts, wall: WallSpec, { side, offset, fill }: Face): void {
  const cols = Math.max(8, Math.round(wallWidth(wall) / 0.22));
  const rows = 16;
  const lonAt = (u: number): number => wall.from + (wall.to - wall.from) * u;
  const heightAt = (u: number, v: number): number => -SINK + (topAt(wall, lonAt(u)) + SINK) * v;
  const geometry = grid(
    cols,
    rows,
    (u, v) => wallPoint(wall, lonAt(u), heightAt(u, v), side),
    (p) => axes(Math.atan2(p.y, p.x) / DEG).away.multiplyScalar(side),
  );
  const width = wallWidth(wall);
  const top = wall.height - 0.2 - TALLY_MARGIN;
  // u: metros a lo largo del muro desde el margen (al revés por fuera, para leer siempre de izquierda a derecha).
  const positions = geometry.getAttribute('position');
  const p = new Vector3();
  const uv = (i: number): readonly [number, number] => {
    p.fromBufferAttribute(positions, i);
    const lon = Math.atan2(p.y, p.x) / DEG;
    const along = ((((lon - wall.from) % 360) + 360) % 360) / (wall.to - wall.from);
    const u = (side < 0 ? along : 1 - along) * width - TALLY_MARGIN;
    return [u, top - (p.length() - CORE_RADIUS)];
  };
  const perRow = tallyGroupsPerRow(width);
  parts.add(geometry, IDENTITY, STONE, {
    solid: true,
    tally: { uv, face: fill === undefined ? { offset, perRow } : { offset, perRow, fill } },
  });
}

function caps(parts: CentroParts, wall: WallSpec): void {
  const cols = Math.max(8, Math.round(wallWidth(wall) / 0.22));
  const lonAt = (u: number): number => wall.from + (wall.to - wall.from) * u;
  // Lo alto: de la cara de dentro a la de fuera.
  const top = grid(
    cols,
    2,
    (u, v) => wallPoint(wall, lonAt(u), topAt(wall, lonAt(u)), v * 2 - 1),
    (p) => p.clone().normalize(),
  );
  parts.add(top, IDENTITY, STONE, { solid: true });
  // Los dos cantos.
  for (const [lon, sign] of [
    [wall.from, -1],
    [wall.to, 1],
  ] as const) {
    const end = grid(
      2,
      12,
      (u, v) => wallPoint(wall, lon, -SINK + (topAt(wall, lon) + SINK) * v, u * 2 - 1),
      () => {
        const l = lon * DEG;
        return new Vector3(-Math.sin(l), Math.cos(l), 0).multiplyScalar(sign);
      },
    );
    parts.add(end, IDENTITY, STONE, { solid: true });
  }
}

/** Todos los muros, con la cuenta corrida de uno a otro: primero las caras de dentro, luego las de fuera. */
export function buildWalls(parts: CentroParts): void {
  const groups = WALLS.map((wall) => tallyGroupsPerRow(wallWidth(wall)) * TALLY_ROWS);
  const total = groups.reduce((sum, g) => sum + g, 0);
  let offset = 0;
  WALLS.forEach((wall, i) => {
    const open = i === OPEN_WALL;
    face(parts, wall, open ? { side: -1, offset, fill: OPEN_WALL_FILL } : { side: -1, offset });
    face(parts, wall, { side: 1, offset: total + offset });
    caps(parts, wall);
    offset += groups[i] ?? 0;
  });
}
