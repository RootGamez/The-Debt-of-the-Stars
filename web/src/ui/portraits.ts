// Retratos de las charlas (plan del HUD, C.2 y decisión 5): un dibujo a tinta por personaje, como en la maqueta.
// La Directora lleva tres filamentos; la Maestra, gafas y bufanda; los demás Ool, dos filamentos. Mientras hablan,
// los filamentos laten (CSS). Los dibujos son constantes del juego: nunca llevan texto de fuera.
import type { PortraitKind } from '../typewriter/speech';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Shape = readonly [tag: string, className: string, attributes: Record<string, number | string>];

const BODY: readonly Shape[] = [
  [
    'path',
    'body',
    { d: 'M50 24 C74 24 86 42 86 62 C86 80 70 90 50 90 C30 90 14 80 14 62 C14 42 26 24 50 24 Z' },
  ],
  ['path', 'hatch', { d: 'M20 70 L28 62 M22 78 L32 68 M70 84 L80 74 M74 76 L84 66' }],
  ['circle', 'dot', { cx: 26, cy: 48, r: 1.6 }],
  ['circle', 'dot', { cx: 76, cy: 66, r: 1.6 }],
  ['circle', 'dot', { cx: 70, cy: 40, r: 1.3 }],
  ['ellipse', 'eye', { cx: 38, cy: 54, rx: 7, ry: 8.5 }],
  ['ellipse', 'eye', { cx: 62, cy: 54, rx: 7, ry: 8.5 }],
  ['circle', 'shine', { cx: 40, cy: 51, r: 2.2 }],
  ['circle', 'shine', { cx: 64, cy: 51, r: 2.2 }],
];

const TWO_FILAMENTS: readonly Shape[] = [
  ['path', 'fil', { d: 'M44 26 C40 18 36 16 32 14' }],
  ['path', 'fil', { d: 'M56 26 C60 18 64 16 68 14' }],
  ['circle', 'tip', { cx: 32, cy: 14, r: 3.2 }],
  ['circle', 'tip', { cx: 68, cy: 14, r: 3.2 }],
];

const THREE_FILAMENTS: readonly Shape[] = [
  ['path', 'fil', { d: 'M42 26 C38 14 34 10 30 6' }],
  ['path', 'fil', { d: 'M50 24 C50 12 51 8 52 2' }],
  ['path', 'fil', { d: 'M58 26 C64 16 68 12 74 8' }],
  ['circle', 'tip', { cx: 30, cy: 6, r: 3.2 }],
  ['circle', 'tip', { cx: 52, cy: 2, r: 3.2 }],
  ['circle', 'tip', { cx: 74, cy: 8, r: 3.2 }],
];

const MAESTRA: readonly Shape[] = [
  ['circle', 'acc', { cx: 38, cy: 54, r: 10 }],
  ['circle', 'acc', { cx: 62, cy: 54, r: 10 }],
  ['path', 'acc', { d: 'M48 54 H52' }],
  ['path', 'acc scarf', { d: 'M24 78 C38 86 62 86 76 78 L74 86 C60 93 40 93 26 86 Z' }],
];

const COLLAR: readonly Shape[] = [['path', 'acc', { d: 'M30 84 C42 88 58 88 70 84' }]];

function shapesOf(kind: PortraitKind): readonly Shape[] {
  const filaments = kind === 'directora' ? THREE_FILAMENTS : TWO_FILAMENTS;
  return [...filaments, ...BODY, ...(kind === 'maestra' ? MAESTRA : COLLAR)];
}

/** El retrato de `kind` como SVG decorativo (el nombre ya se lee al lado). */
export function portraitSvg(kind: PortraitKind): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'portrait-ool');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, className, attributes] of shapesOf(kind)) {
    const shape = document.createElementNS(SVG_NS, tag);
    shape.setAttribute('class', className);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, String(value));
    svg.append(shape);
  }
  return svg;
}
