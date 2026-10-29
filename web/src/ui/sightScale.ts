// La mira graduada: anillos cada 10° (con su número) y marcas cada 2° en cruz, centrados en la pantalla. Se
// enciende y apaga con la G, a pie o pilotando. Mide ángulos de verdad según el campo de visión de la cámara
// (ui/sightMarks.ts, con tests): con ella se puede girar la vista "dieciocho grados" sin calcular nada.
import type { PerspectiveCamera } from 'three';
import { sightMarks } from './sightMarks';

const SVG = 'http://www.w3.org/2000/svg';

export interface SightScale {
  readonly visible: boolean;
  /** Una vez por fotograma: se redibuja solo si cambió el tamaño o el campo de visión. */
  update(): void;
  dispose(): void;
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function createSightScale(camera: PerspectiveCamera, canvas: HTMLCanvasElement): SightScale {
  const root = svg('svg', { class: 'sight', 'aria-hidden': 'true' });
  document.body.append(root);
  let visible = false;
  let drawn = '';
  root.style.display = 'none';

  const abort = new AbortController();
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.code !== 'KeyG' || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (event.target instanceof HTMLInputElement) return;
      visible = !visible;
      root.style.display = visible ? '' : 'none';
      drawn = '';
    },
    { signal: abort.signal },
  );

  function draw(width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;
    root.setAttribute('viewBox', `0 0 ${String(width)} ${String(height)}`);
    const parts: SVGElement[] = [svg('circle', { cx, cy, r: 2, class: 'sight-dot' })];
    for (const { degrees, radius, major } of sightMarks(camera.fov, height)) {
      const tick = major ? 14 : 7;
      // Marcas en cruz: arriba, abajo, izquierda y derecha.
      parts.push(
        svg('line', { x1: cx - tick / 2, y1: cy - radius, x2: cx + tick / 2, y2: cy - radius }),
        svg('line', { x1: cx - tick / 2, y1: cy + radius, x2: cx + tick / 2, y2: cy + radius }),
        svg('line', { x1: cx - radius, y1: cy - tick / 2, x2: cx - radius, y2: cy + tick / 2 }),
        svg('line', { x1: cx + radius, y1: cy - tick / 2, x2: cx + radius, y2: cy + tick / 2 }),
      );
      if (major) {
        parts.push(svg('circle', { cx, cy, r: radius, class: 'sight-ring' }));
        const label = svg('text', { x: cx + radius + 4, y: cy - 6, class: 'sight-label' });
        label.textContent = `${String(degrees)}°`;
        parts.push(label);
      }
    }
    root.replaceChildren(...parts);
  }

  return {
    get visible() {
      return visible;
    },
    update() {
      if (!visible) return;
      const { clientWidth: width, clientHeight: height } = canvas;
      const key = `${String(width)}x${String(height)}@${String(camera.fov)}`;
      if (key === drawn) return;
      drawn = key;
      draw(width, height);
    },
    dispose() {
      abort.abort();
      root.remove();
    },
  };
}
