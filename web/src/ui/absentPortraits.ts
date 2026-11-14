// Los retratos de los dos Ausentes vivos para las charlas (plan de finales, E3), con la tinta de los de los Ool
// (portraits.ts): la cabeza es un óvalo de vidrio oscuro sin rostro, con dibujos de luz (solo rombos y triángulos),
// y su signo brilla en el pecho (🟡 D13). Sin boca, el gesto va en la postura: ella esbelta y erguida; él ancho, con
// los hombros caídos y la cabeza baja e inclinada. Mientras hablan, el signo y los dibujos laten (CSS).
import type { PortraitShape } from './portraits';

const rombo = (x: number, y: number, r: number): string =>
  `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`;

/** Un triángulo de «radio» `r` con la punta hacia `toward`. */
function triangle(x: number, y: number, r: number, toward: 'up' | 'down'): string {
  const h = r * 0.87;
  const tip = toward === 'up' ? -r : r;
  const points: readonly (readonly [number, number])[] = [
    [x, y + tip],
    [x - h, y - tip / 2],
    [x + h, y - tip / 2],
  ];
  return points.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
}

/** Ella: hombros estrechos y altos, cuello largo, la cabeza alta y derecha. */
const CIENTIFICA: readonly PortraitShape[] = [
  ['path', 'skin', { d: 'M17 100 C18 87 27 80 39 78 L61 78 C73 80 82 87 83 100 Z' }],
  ['path', 'hatch', { d: 'M22 95 L29 88 M24 100 L33 91 M72 93 L78 87 M69 100 L78 91' }],
  ['path', 'neck', { d: 'M45 78 L45.5 60 M55 78 L54.5 60' }],
  ['path', 'copper', { d: 'M44.5 66 H55.5 M44.5 71 H55.5' }],
  ['path', 'copper', { d: 'M50 83 V81 H61 L69 85 M50 83 V81 H39 L31 85' }],
  ['path', 'copper', { d: 'M44 89 H37 V97 M56 89 H63 V97' }],
  ['circle', 'node', { cx: 69, cy: 85, r: 1.3 }],
  ['circle', 'node', { cx: 31, cy: 85, r: 1.3 }],
  ['circle', 'node', { cx: 37, cy: 97, r: 1.1 }],
  ['circle', 'node', { cx: 63, cy: 97, r: 1.1 }],
  ['ellipse', 'head', { cx: 50, cy: 35, rx: 15.5, ry: 25 }],
  ['path', 'shine', { d: 'M38.5 23 C40 17 44 13 48 12' }],
  // La columna de rombos que se tocan por la punta, como en su cabeza (absentHead.ts).
  ['polygon', 'pattern', { points: rombo(50, 21.3, 2.2) }],
  ['polygon', 'pattern', { points: rombo(50, 27.1, 3.2) }],
  ['polygon', 'pattern', { points: rombo(50, 35, 4.3) }],
  ['polygon', 'pattern', { points: rombo(50, 42.9, 3.2) }],
  ['polygon', 'pattern', { points: rombo(50, 48.7, 2.2) }],
  ['ellipse', 'plate', { cx: 50, cy: 89, rx: 8.5, ry: 9.5 }],
  ['polygon', 'sign', { points: rombo(50, 89, 6) }],
  ['circle', 'sign sign-dot', { cx: 50, cy: 89, r: 1.7 }],
];

/** Él: ancho, los hombros caídos, el cuello corto y la cabeza baja, ladeada. */
const HEAD_TILT = 'rotate(-7 50 70)';
const ESCEPTICO: readonly PortraitShape[] = [
  ['path', 'skin', { d: 'M5 100 C8 91 17 86 33 84 L67 84 C83 86 92 91 95 100 Z' }],
  [
    'path',
    'hatch',
    { d: 'M10 96 L17 89 M14 100 L23 91 M80 92 L87 86 M78 100 L88 90 M26 99 L31 94' },
  ],
  ['path', 'neck', { d: 'M44 84 L44.5 70 M56 84 L55.5 70' }],
  ['path', 'copper', { d: 'M43.5 77 H56.5' }],
  ['path', 'copper', { d: 'M45 88.5 H34 L24 93 M55 88.5 H66 L76 93' }],
  ['path', 'copper', { d: 'M42 94 H33 V100 M58 94 H67 V100 M24 93 V99' }],
  ['circle', 'node', { cx: 76, cy: 93, r: 1.3 }],
  ['circle', 'node', { cx: 24, cy: 99, r: 1.1 }],
  ['circle', 'node', { cx: 33, cy: 100, r: 1.1 }],
  ['ellipse', 'head', { cx: 50, cy: 46, rx: 16.5, ry: 23.5, transform: HEAD_TILT }],
  ['path', 'shine', { d: 'M37 36 C38.5 30 42 26 46 25', transform: HEAD_TILT }],
  // Los triángulos con la punta abajo, cada vez más pequeños, como en su cabeza (absentHead.ts).
  ['polygon', 'pattern', { points: triangle(50, 32, 3.6, 'down'), transform: HEAD_TILT }],
  ['polygon', 'pattern', { points: triangle(50, 39, 3.1, 'down'), transform: HEAD_TILT }],
  ['polygon', 'pattern', { points: triangle(50, 45, 2.6, 'down'), transform: HEAD_TILT }],
  ['polygon', 'pattern', { points: triangle(50, 50.5, 2.1, 'down'), transform: HEAD_TILT }],
  ['ellipse', 'plate', { cx: 50, cy: 91.8, rx: 8.5, ry: 8.2 }],
  ['polygon', 'sign', { points: triangle(50, 87.6, 4.4, 'down') }],
  ['polygon', 'sign', { points: triangle(50, 96.4, 4.4, 'up') }],
];

export type AbsentPortraitKind = 'cientifica' | 'esceptico';

export const ABSENT_PORTRAITS: Record<AbsentPortraitKind, readonly PortraitShape[]> = {
  cientifica: CIENTIFICA,
  esceptico: ESCEPTICO,
};
