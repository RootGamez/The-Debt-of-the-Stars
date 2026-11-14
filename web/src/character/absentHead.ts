// El cuello y la cabeza de los dos Ausentes vivos (plan de finales, E3; aspecto ✅ Anthony 2026-11-06): la cabeza
// no tiene rostro, es un óvalo de vidrio mineral oscuro con dibujos de luz (rombos y triángulos, nunca espirales ni
// hexágonos), con su aro de cobre en la base y, congelada, una costra de escarcha.
// Coordenadas absolutas de diseño (Z arriba, frente +Y), como el resto de piezas (absentParts.ts).
import { Vector3 } from 'three';
import { ball, box, cone, cylinder, pieceMatrix } from '../worlds/procedural/kit';
import { ABSENT_HEAD, type AbsentWho } from './absentSkeleton';
import { between, onEllipsoid, ring, surfaceMatrix, type Ellipsoid } from './explorerParts';
import { frostOn, type AbsentContext, type AbsentSegment } from './absentParts';

/** El cuello: un núcleo de cobre con dos anillos de cerámica. */
export function buildNeck(s: AbsentSegment, c: AbsentContext): void {
  const k = (1 + c.width) / 2;
  s.add(
    'copper',
    c.look.copper,
    cone(0.07 * k, 0.055 * k, 8),
    between(new Vector3(0, 0, 2.11), new Vector3(0, 0.01, 2.36), 1, 1),
  );
  for (const z of [2.2, 2.27]) {
    s.add(
      'ceramic',
      c.look.ceramicShade,
      cylinder(1, 8),
      pieceMatrix([0, 0.005, z], [0, 0, 0], [0.085 * k, 0.08 * k, 0.03]),
    );
  }
}

/** Un dibujo: rombo o triángulo (con la punta arriba o abajo), en (acimut, z) del óvalo y de `size` metros. */
type Pattern = readonly [shape: 'rombo' | 'up' | 'down', azimuth: number, z: number, size: number];

/** Una corona de dibujos pequeños por detrás de la cabeza, de un lado al otro. */
function diadem(
  shape: Pattern[0],
  azimuths: readonly number[],
  z: number,
  size: number,
): Pattern[] {
  return azimuths.flatMap((a): Pattern[] => [
    [shape, a, z, size],
    [shape, -a, z, size],
  ]);
}

/**
 * 🟡 Sus dibujos: una columna por delante y una corona por detrás. Ella, rombos que se tocan por la punta; él,
 * triángulos con la punta abajo que menguan (cabizbajo hasta en la luz). Nada en fila ni en pareja a lo ancho del
 * óvalo: una franja parece una boca con dientes y dos marcas iguales, unos ojos, y la cabeza no tiene rostro.
 */
const PATTERNS: Record<AbsentWho, readonly Pattern[]> = {
  cientifica: [
    ['rombo', 0, 2.665, 0.03],
    ['rombo', 0, 2.612, 0.045],
    ['rombo', 0, 2.535, 0.06],
    ['rombo', 0, 2.458, 0.045],
    ['rombo', 0, 2.405, 0.03],
    ...diadem('rombo', [1.35, 1.85, 2.35], 2.56, 0.032),
    ['rombo', Math.PI, 2.6, 0.05],
  ],
  esceptico: [
    ['down', 0, 2.69, 0.042],
    ['down', 0, 2.625, 0.036],
    ['down', 0, 2.568, 0.03],
    ['down', 0, 2.52, 0.024],
    ...diadem('down', [1.35, 1.85, 2.35], 2.57, 0.03),
    ['down', Math.PI, 2.62, 0.045],
  ],
};

/** La cabeza sin rostro: el óvalo de vidrio, su aro de cobre, los dibujos de luz y la escarcha. */
export function buildHead(s: AbsentSegment, c: AbsentContext): void {
  const head: Ellipsoid = { center: ABSENT_HEAD.center, radii: ABSENT_HEAD.radii };
  const [cx, cy, cz] = head.center;
  const [rx, ry, rz] = head.radii;
  s.add('glass', c.look.glass, ball(1, 2), pieceMatrix(head.center, [0, 0, 0], head.radii), 0);
  s.add(
    'copper',
    c.look.copper,
    ring(1, 0.012 / 0.105, 12, 3),
    pieceMatrix([cx, cy, 2.32], [0, 0, 0], [0.105, 0.118, 0.105]),
    0.03,
  );
  for (const [shape, azimuth, z, size] of PATTERNS[c.who]) {
    const at = onEllipsoid(head, azimuth, z, 0.002);
    if (shape === 'rombo') {
      s.add('glow', c.look.glow, box(), surfaceMatrix(at, [size, size, 0.008], Math.PI / 4), 0);
    } else {
      const tilt = shape === 'down' ? 0 : Math.PI;
      s.add('glow', c.look.glow, cylinder(1, 3), surfaceMatrix(at, [size, size, 0.008], tilt), 0);
    }
  }
  // Congelada, una costra de escarcha que tapa todo el vidrio (las caras de la esfera baja se hunden un 5 %, de
  // ahí el margen) y unas astillas en la coronilla.
  s.add(
    'frost',
    '#e6f2fb',
    ball(1, 1),
    pieceMatrix([cx, cy, cz], [0, 0, 0], [rx * 1.09, ry * 1.09, rz * 1.06]),
    0,
  );
  frostOn(
    s,
    head,
    [
      [0.2, 2.7],
      [-0.9, 2.66],
      [2.4, 2.68],
      [-2.2, 2.62],
    ],
    0.035,
  );
}
