// El mapa de órbitas de la mesa del Albatros II (Fase 11, decisión D3): una hoja que se abre con E desde la mesa del
// mapa y enseña la Brasa, la órbita de cada mundo y dónde está ahora, con el nombre que le puso el jugador y una
// marca en el mundo donde está la nave. El Nudo (oculto) no sale. Se cierra con E, Esc o con un clic (al abrirse
// suelta el ratón, como al leer).
// Mientras está abierta, el tiempo se detiene (como al leer).
import type { SystemSpec } from '../system/systemData';
import { t } from '../i18n';
import type { SystemSnapshot } from './debugOverlay';

export interface ShipMapOptions {
  spec: SystemSpec;
  read: () => SystemSnapshot;
  /** Nombre de cada mundo (el que le puso el jugador o el oficial). */
  nameOf: (world: string) => string;
  /** Mundo donde está la nave ahora. */
  shipWorld: () => string | undefined;
  /** Al abrir: suelta el ratón capturado, para que Esc y el clic lleguen a la hoja y no a la pausa. */
  onOpen?: () => void;
  /** Al cerrar (desde el gesto que lo cierra): vuelve a capturar el ratón. */
  onClose?: () => void;
}

export interface ShipMap {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  dispose(): void;
}

/** Lado del dibujo (px de lienzo; el CSS lo escala). */
const SIZE = 520;
const MARGIN = 46;
const REFRESH_SECONDS = 0.25;

export function createShipMap(options: ShipMapOptions): ShipMap {
  const { spec } = options;
  const root = document.createElement('div');
  root.className = 'ship-map';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', t('Mapa de órbitas'));
  const title = document.createElement('h2');
  title.textContent = t('Mapa de órbitas');
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t('La Brasa en el centro y cada mundo en su órbita'));
  const help = document.createElement('p');
  help.textContent = t('E o Esc para cerrar');
  root.append(title, canvas, help);
  document.body.append(root);
  const context = canvas.getContext('2d');
  const shown = spec.bodies.filter((body) => !body.hidden);
  const reach = Math.max(...shown.map((b) => b.orbitRadius)) * 1.05;
  const scale = (SIZE / 2 - MARGIN) / reach;
  let timer: number | undefined;
  let openedAt = 0;

  function draw(): void {
    if (!context) return;
    const snapshot = options.read();
    const half = SIZE / 2;
    context.clearRect(0, 0, SIZE, SIZE);
    context.lineWidth = 1.5;
    context.strokeStyle = 'rgba(15, 84, 66, 0.45)';
    context.setLineDash([4, 6]);
    for (const body of shown) {
      context.beginPath();
      context.arc(half, half, body.orbitRadius * scale, 0, Math.PI * 2);
      context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = '#c9752e';
    context.beginPath();
    context.arc(half, half, 12, 0, Math.PI * 2);
    context.fill();
    context.font = '600 15px Georgia, serif';
    context.textAlign = 'center';
    const here = options.shipWorld();
    for (const body of shown) {
      const position = snapshot.bodies[body.world];
      if (!position) continue;
      const x = half + position[0] * scale;
      const y = half + position[2] * scale;
      context.fillStyle = '#0f5442';
      context.beginPath();
      context.arc(x, y, 7, 0, Math.PI * 2);
      context.fill();
      context.fillText(options.nameOf(body.world), x, y - 14);
      if (body.world === here) {
        context.strokeStyle = '#c9752e';
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(x, y, 13, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = '#c9752e';
        context.fillText(t('la nave'), x, y + 28);
      }
    }
  }

  const map: ShipMap = {
    get isOpen() {
      return !root.hidden;
    },
    open() {
      if (!root.hidden) return;
      root.hidden = false;
      openedAt = performance.now();
      options.onOpen?.();
      draw();
      timer = window.setInterval(draw, REFRESH_SECONDS * 1000);
    },
    close() {
      if (root.hidden) return;
      root.hidden = true;
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
      options.onClose?.();
    },
    dispose() {
      map.close();
      window.removeEventListener('keydown', onKey, true);
      root.remove();
    },
  };

  function onKey(event: KeyboardEvent): void {
    if (root.hidden || event.repeat) return;
    // La misma pulsación de E que lo abrió no lo cierra.
    if (performance.now() - openedAt < 150) return;
    if (event.code === 'Escape' || event.code === 'KeyE') {
      event.preventDefault();
      event.stopPropagation();
      map.close();
    }
  }
  window.addEventListener('keydown', onKey, true);
  root.addEventListener('click', () => {
    map.close();
  });
  return map;
}
