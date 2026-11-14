// El cuello y la cabeza de los dos Ausentes vivos (plan de finales, E3; aspecto ✅ Anthony 2026-11-06): la cabeza no
// tiene rostro, es un óvalo de vidrio mineral oscuro con dibujos de luz (rombos y triángulos, nunca espirales ni
// hexágonos) y, congelada, una costra de escarcha. 🟡 (2026-11-14) La de ella se alarga hacia atrás como una cresta,
// sobre un cuello largo y fino de anillos de cerámica; la de él es más ancha y redonda, sobre un cuello corto y grueso.
// Coordenadas absolutas de diseño (Z arriba, frente +Y), como el resto de piezas (absentParts.ts).
import { Color } from 'three';
import { box, cylinder } from '../worlds/procedural/kit';
import { surfaceMatrix } from './explorerParts';
import { loftGeometry, rowsBetween } from './absentLoft';
import { ceramicPlate } from './absentCeramic';
import { headHeightAt } from './absentShape';
import type { AbsentWho } from './absentSkeleton';
import {
  circuit,
  frostOn,
  sectionsSurface,
  type AbsentContext,
  type AbsentSegment,
} from './absentParts';

/** El cuello: anillos de cerámica (ella, tres; él, dos) con el cobre subiendo por los lados y la nuca. */
export function buildNeck(s: AbsentSegment, c: AbsentContext): void {
  const neck = c.shape.neck;
  const from = neck[0]?.z ?? c.joints.neck[2];
  const to = neck[neck.length - 1]?.z ?? c.joints.head[2];
  const span = to - from;
  const seams =
    c.who === 'cientifica'
      ? [from + span * 0.36, from + span * 0.58, from + span * 0.8]
      : [from + span * 0.5];
  ceramicPlate(s, c, neck, from, to, {
    lip: 0,
    seams,
    columns: c.who === 'esceptico' ? 16 : 12,
    step: 0.05,
  });
  const surface = sectionsSurface(neck);
  for (const side of [-1, 1]) {
    circuit(
      s,
      c.look.copper,
      surface,
      [
        [side * 1.5, from + span * 0.15],
        [side * 1.45, to - 0.02],
      ],
      0.011,
    );
  }
  circuit(
    s,
    c.look.copperDark,
    surface,
    [
      [Math.PI, from + span * 0.1],
      [Math.PI, to - 0.03],
    ],
    0.011,
  );
}

/** Un dibujo: rombo o triángulo (con la punta arriba o abajo), en (acimut, fracción de la cabeza) y `size` metros. */
export type Pattern = readonly [
  shape: 'rombo' | 'up' | 'down',
  azimuth: number,
  height: number,
  size: number,
];

/** Una corona de dibujos pequeños por detrás de la cabeza, de un lado al otro. */
function diadem(
  shape: Pattern[0],
  azimuths: readonly number[],
  height: number,
  size: number,
): Pattern[] {
  return azimuths.flatMap((a): Pattern[] => [
    [shape, a, height, size],
    [shape, -a, height, size],
  ]);
}

/**
 * 🟡 Sus dibujos: una columna por delante y una corona por detrás. Ella, rombos que se tocan por la punta y suben por
 * la cresta; él, triángulos con la punta abajo que menguan (cabizbajo hasta en la luz). Nada en fila ni en pareja a lo
 * ancho del óvalo por delante: una franja parece una boca con dientes y dos marcas iguales, unos ojos, y la cabeza no
 * tiene rostro.
 */
export const HEAD_PATTERNS: Record<AbsentWho, readonly Pattern[]> = {
  cientifica: [
    ['rombo', 0, 0.3, 0.03],
    ['rombo', 0, 0.4, 0.045],
    ['rombo', 0, 0.53, 0.06],
    ['rombo', 0, 0.66, 0.045],
    ['rombo', 0, 0.76, 0.032],
    ['rombo', 0, 0.85, 0.024],
    ['rombo', 0, 0.92, 0.017],
    ...diadem('rombo', [1.55, 2.0, 2.45], 0.55, 0.028),
    ['rombo', Math.PI, 0.6, 0.048],
    ['rombo', Math.PI, 0.78, 0.03],
  ],
  esceptico: [
    ['down', 0, 0.47, 0.044],
    ['down', 0, 0.59, 0.037],
    ['down', 0, 0.69, 0.03],
    ['down', 0, 0.78, 0.024],
    ...diadem('down', [1.55, 2.0, 2.45], 0.56, 0.032),
    ['down', Math.PI, 0.64, 0.048],
  ],
};

/** La cabeza sin rostro: el óvalo de vidrio, los dibujos de luz y la escarcha. */
export function buildHead(s: AbsentSegment, c: AbsentContext): void {
  const head = c.shape.head;
  const bottom = head[0]?.z ?? 0;
  const crown = head[head.length - 1]?.z ?? 0;
  const glass = new Color(c.look.glass);
  s.addWoven(
    'glass',
    loftGeometry(head, {
      rows: rowsBetween(bottom, crown, 0.045, [bottom + 0.012, crown - 0.006]),
      columns: 24,
      color: () => glass,
    }),
  );
  const surface = sectionsSurface(head);
  for (const [shape, azimuth, height, size] of HEAD_PATTERNS[c.who]) {
    const at = surface(azimuth, headHeightAt(c.who, height), 0.002);
    if (shape === 'rombo') {
      s.add('glow', c.look.glow, box(), surfaceMatrix(at, [size, size, 0.006], Math.PI / 4), 0);
    } else {
      const tilt = shape === 'down' ? 0 : Math.PI;
      s.add('glow', c.look.glow, cylinder(1, 3), surfaceMatrix(at, [size, size, 0.006], tilt), 0);
    }
  }
  // Congelada, una costra de escarcha que tapa todo el vidrio y unas astillas en la coronilla.
  const frost = new Color('#e6f2fb');
  s.addWoven(
    'frost',
    loftGeometry(head, {
      rows: rowsBetween(bottom, crown, 0.065),
      columns: 16,
      // Una costra desigual: facetas de hielo de tamaños distintos (el material de la escarcha es facetado).
      lift: (az, z) => 0.012 + 0.004 * Math.sin(az * 5 + z * 31) * Math.cos(az * 3 - z * 17),
      color: () => frost,
    }),
  );
  frostOn(
    s,
    surface,
    [
      [0.2, headHeightAt(c.who, 0.86)],
      [-0.9, headHeightAt(c.who, 0.72)],
      [2.4, headHeightAt(c.who, 0.8)],
      [-2.2, headHeightAt(c.who, 0.6)],
    ],
    0.035,
  );
}
