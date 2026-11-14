// Los retratos de los dos Ausentes vivos para las charlas (plan de finales, E3), con la tinta de los de los Ool
// (portraits.ts): la cabeza es un óvalo de vidrio oscuro sin rostro, con dibujos de luz (solo rombos y triángulos),
// y su signo brilla en el pecho (🟡 D13). Sin boca, el gesto va en la postura: ella esbelta y erguida; él ancho, con
// los hombros caídos y la cabeza baja e inclinada. Mientras hablan, el signo y los dibujos laten (CSS).
// Como los modelos (character/absent*.ts), y todo 🟡: ella, cuello largo con muchos aros finos de oro, dos aros que
// flotan alrededor de la cabeza y el manto ocre abierto por delante, cerrado con dos broches y una cadena; él, cuello
// grueso con un aro ancho, un solo aro grueso alrededor de la cabeza, el chaleco en pico y la bandolera con
// herramientas. Los aros de la cabeza van detrás del vidrio: nunca tapan sus dibujos.
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

/** Ella: hombros estrechos y altos, el cuello largo, la cabeza alta y derecha. */
const CIENTIFICA: readonly PortraitShape[] = [
  ['path', 'skin', { d: 'M22 100 C23 89 30 82.5 40 80.5 L60 80.5 C70 82.5 77 89 78 100 Z' }],
  ['path', 'copper', { d: 'M44.5 84.5 L42 87.5 V97 M55.5 84.5 L58 87.5 V97' }],
  ['circle', 'node', { cx: 42, cy: 97, r: 1.1 }],
  ['circle', 'node', { cx: 58, cy: 97, r: 1.1 }],
  // El manto, abierto por delante: deja ver la placa del signo.
  [
    'path',
    'drape mantle',
    { d: 'M17 100 C18 88 26.5 80.5 40 78.5 C42 79 43 80 43.5 81.5 C40 87 38 93 37.5 100 Z' },
  ],
  [
    'path',
    'drape mantle',
    { d: 'M83 100 C82 88 73.5 80.5 60 78.5 C58 79 57 80 56.5 81.5 C60 87 62 93 62.5 100 Z' },
  ],
  ['path', 'hatch', { d: 'M22 96 L27.5 90 M25 100 L31 93.5 M78 96 L72.5 90 M75 100 L69 93.5' }],
  ['path', 'gold thin', { d: 'M42.5 82.6 Q50 84 57.5 82.6' }],
  ['polygon', 'gold thin brooch', { points: rombo(42.5, 82.6, 1.9) }],
  ['polygon', 'gold thin brooch', { points: rombo(57.5, 82.6, 1.9) }],
  ['ellipse', 'plate', { cx: 50, cy: 91.6, rx: 7.4, ry: 7.8 }],
  ['polygon', 'sign', { points: rombo(50, 91.6, 5.1) }],
  ['circle', 'sign sign-dot', { cx: 50, cy: 91.6, r: 1.5 }],
  ['path', 'neck', { d: 'M46.2 80 L46.6 57 M53.8 80 L53.4 57' }],
  // Muchos aros finos en el cuello.
  ['ellipse', 'gold thin', { cx: 50, cy: 63.5, rx: 4.6, ry: 1.1 }],
  ['ellipse', 'gold thin', { cx: 50, cy: 67, rx: 4.7, ry: 1.1 }],
  ['ellipse', 'gold thin', { cx: 50, cy: 70.5, rx: 4.8, ry: 1.1 }],
  ['ellipse', 'gold thin', { cx: 50, cy: 74, rx: 4.9, ry: 1.1 }],
  // Dos aros inclinados alrededor de la cabeza (por delante pasan bajo el óvalo; por detrás, el vidrio los tapa).
  [
    'ellipse',
    'gold thin head-ring',
    { cx: 50, cy: 55.5, rx: 20, ry: 5, transform: 'rotate(-7 50 55.5)' },
  ],
  [
    'ellipse',
    'gold thin head-ring',
    { cx: 50, cy: 53.5, rx: 18.5, ry: 5, transform: 'rotate(9 50 53.5)' },
  ],
  ['ellipse', 'head', { cx: 50, cy: 33, rx: 15, ry: 24.5 }],
  ['path', 'shine', { d: 'M38.5 22 C40 16 44 12 48 11' }],
  // La columna de rombos que se tocan por la punta, como en su cabeza (absentHead.ts).
  ['polygon', 'pattern', { points: rombo(50, 19.3, 2.2) }],
  ['polygon', 'pattern', { points: rombo(50, 25.1, 3.2) }],
  ['polygon', 'pattern', { points: rombo(50, 33, 4.3) }],
  ['polygon', 'pattern', { points: rombo(50, 40.9, 3.2) }],
  ['polygon', 'pattern', { points: rombo(50, 46.7, 2.2) }],
];

/** Él: ancho, los hombros caídos, el cuello corto y grueso y la cabeza baja, ladeada. */
const HEAD_TILT = 'rotate(-7 50 70)';
const ESCEPTICO: readonly PortraitShape[] = [
  ['path', 'skin', { d: 'M4 100 C7 90.5 17 85.5 32 83.5 L68 83.5 C83 85.5 93 90.5 96 100 Z' }],
  ['path', 'copper', { d: 'M10.5 95 L15 90.5 M89.5 95 L85 90.5' }],
  ['circle', 'node', { cx: 10.5, cy: 95, r: 1.2 }],
  ['circle', 'node', { cx: 89.5, cy: 95, r: 1.2 }],
  // El chaleco de lona, en pico para dejar ver la placa.
  ['path', 'drape vest', { d: 'M7.5 100 C10 91.5 19 87 32 85 L39 84 C40.5 90 44 96 48.5 100 Z' }],
  ['path', 'drape vest', { d: 'M92.5 100 C90 91.5 81 87 68 85 L61 84 C59.5 90 56 96 51.5 100 Z' }],
  ['path', 'hatch', { d: 'M12 97 L18 91 M16 100 L22 94 M88 97 L82 91 M84 100 L78 94' }],
  // La bandolera, del hombro derecho hacia la cadera, por debajo de la placa, con la presilla de una herramienta.
  ['path', 'strap', { d: 'M22.5 85.5 L48.2 100' }],
  [
    'rect',
    'buckle',
    { x: 28, y: 86.6, width: 5.4, height: 3.6, transform: 'rotate(29.5 30.7 88.4)' },
  ],
  ['ellipse', 'plate', { cx: 50, cy: 90.5, rx: 7.6, ry: 7.4 }],
  ['polygon', 'sign', { points: triangle(50, 86.5, 4, 'down') }],
  ['polygon', 'sign', { points: triangle(50, 94.5, 4, 'up') }],
  ['path', 'neck', { d: 'M43 84 L43.5 70 M57 84 L56.5 70' }],
  // Un solo aro ancho en el cuello y uno grueso alrededor de la cabeza.
  ['ellipse', 'gold thick', { cx: 50, cy: 78.5, rx: 8.4, ry: 2.3 }],
  [
    'ellipse',
    'gold thick head-ring',
    { cx: 50, cy: 61, rx: 24, ry: 9, transform: `${HEAD_TILT} rotate(-9 50 61)` },
  ],
  ['ellipse', 'head', { cx: 50, cy: 46, rx: 16.5, ry: 23.5, transform: HEAD_TILT }],
  ['path', 'shine', { d: 'M37 36 C38.5 30 42 26 46 25', transform: HEAD_TILT }],
  // Los triángulos con la punta abajo, cada vez más pequeños, como en su cabeza (absentHead.ts).
  ['polygon', 'pattern', { points: triangle(50, 32, 3.6, 'down'), transform: HEAD_TILT }],
  ['polygon', 'pattern', { points: triangle(50, 39, 3.1, 'down'), transform: HEAD_TILT }],
  ['polygon', 'pattern', { points: triangle(50, 45, 2.6, 'down'), transform: HEAD_TILT }],
  ['polygon', 'pattern', { points: triangle(50, 50.5, 2.1, 'down'), transform: HEAD_TILT }],
];

export type AbsentPortraitKind = 'cientifica' | 'esceptico';

export const ABSENT_PORTRAITS: Record<AbsentPortraitKind, readonly PortraitShape[]> = {
  cientifica: CIENTIFICA,
  esceptico: ESCEPTICO,
};
