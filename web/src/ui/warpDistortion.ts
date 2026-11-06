// La distorsión del gusano (plan de la llegada, A.1): mientras el gusano arrastra la nave, la imagen se separa en
// sus colores (aberración cromática) y un destello cálido crece desde el centro. Es un filtro SVG sobre el lienzo y
// una capa de luz encima; solo existe mientras dura la cinemática. Con movimiento reducido no hay aberración.
const SVG_NS = 'http://www.w3.org/2000/svg';
const FILTER_ID = 'gusano-aberracion';
/** Lo más que se separan los colores al final (px). */
const MAX_SPLIT = 9;
/** Lo más brillante que llega el destello (0–1). */
const MAX_FLARE = 0.75;

export interface WarpDistortion {
  /** `progress` 0–1 de la apertura del gusano; 0 la quita. */
  update(progress: number): void;
  dispose(): void;
}

function channel(
  svg: SVGFilterElement,
  matrix: string,
  result: string,
): { offset: SVGFEOffsetElement } {
  const color = document.createElementNS(SVG_NS, 'feColorMatrix');
  color.setAttribute('in', 'SourceGraphic');
  color.setAttribute('type', 'matrix');
  color.setAttribute('values', matrix);
  color.setAttribute('result', `${result}-color`);
  const offset = document.createElementNS(SVG_NS, 'feOffset');
  offset.setAttribute('in', `${result}-color`);
  offset.setAttribute('result', result);
  svg.append(color, offset);
  return { offset };
}

/** @param canvas el lienzo del juego, al que se aplica el filtro. */
export function createWarpDistortion(canvas: HTMLElement): WarpDistortion {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = FILTER_ID;
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  const red = channel(filter, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'rojo');
  channel(filter, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'verde');
  const blue = channel(filter, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'azul');
  const merge = document.createElementNS(SVG_NS, 'feBlend');
  merge.setAttribute('in', 'rojo');
  merge.setAttribute('in2', 'verde');
  merge.setAttribute('mode', 'screen');
  merge.setAttribute('result', 'rojo-verde');
  const all = document.createElementNS(SVG_NS, 'feBlend');
  all.setAttribute('in', 'rojo-verde');
  all.setAttribute('in2', 'azul');
  all.setAttribute('mode', 'screen');
  filter.append(merge, all);
  svg.append(filter);
  document.body.append(svg);

  const flare = document.createElement('div');
  flare.className = 'gusano-destello';
  flare.setAttribute('aria-hidden', 'true');
  document.body.append(flare);

  let filtered = false;
  return {
    update(progress) {
      const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
      const split = reducedMotion ? 0 : MAX_SPLIT * p * p;
      if (split > 0.2) {
        red.offset.setAttribute('dx', split.toFixed(2));
        red.offset.setAttribute('dy', (split * 0.3).toFixed(2));
        blue.offset.setAttribute('dx', (-split).toFixed(2));
        blue.offset.setAttribute('dy', (-split * 0.3).toFixed(2));
        if (!filtered) canvas.style.filter = `url(#${FILTER_ID})`;
        filtered = true;
      } else if (filtered) {
        canvas.style.filter = '';
        filtered = false;
      }
      flare.style.opacity = (MAX_FLARE * p ** 3).toFixed(3);
      flare.style.transform = `scale(${(0.6 + p * 0.9).toFixed(3)})`;
    },
    dispose() {
      canvas.style.filter = '';
      svg.remove();
      flare.remove();
    },
  };
}
