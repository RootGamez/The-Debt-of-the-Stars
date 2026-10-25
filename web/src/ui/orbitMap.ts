// Mapa cenital de las órbitas, SOLO con `?debug` (F4 lo muestra u oculta): sirve para ajustar
// src/data/sistema.json viendo dónde está cada mundo. No forma parte del juego.
import type { SystemSpec } from '../system/systemData';
import type { SystemSnapshot } from './debugOverlay';

const SIZE = 220;
const MARGIN = 14;
const REFRESH_SECONDS = 0.2;

export interface OrbitMap {
  update(dt: number): void;
  dispose(): void;
}

export function createOrbitMap(
  system: SystemSpec,
  read: () => SystemSnapshot,
): OrbitMap | undefined {
  if (!new URLSearchParams(window.location.search).has('debug')) return undefined;
  const canvas = document.createElement('canvas');
  canvas.className = 'orbit-map';
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  const reach = Math.max(...system.bodies.map((b) => b.orbitRadius)) * 1.08;
  const scale = (SIZE / 2 - MARGIN) / reach;
  let elapsed = 0;

  const onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'F4') return;
    event.preventDefault();
    canvas.hidden = !canvas.hidden;
  };
  window.addEventListener('keydown', onKey);

  function draw(): void {
    if (!context) return;
    const snapshot = read();
    const half = SIZE / 2;
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillStyle = 'rgba(8, 8, 14, 0.8)';
    context.fillRect(0, 0, SIZE, SIZE);
    context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    for (const body of system.bodies) {
      context.beginPath();
      context.arc(half, half, body.orbitRadius * scale, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = '#ffc890';
    context.beginPath();
    context.arc(half, half, Math.max(3, system.star.radius * scale), 0, Math.PI * 2);
    context.fill();
    context.font = '10px monospace';
    for (const [world, [x, , z]] of Object.entries(snapshot.bodies)) {
      const px = half + x * scale;
      const py = half + z * scale;
      context.fillStyle = world === snapshot.reference ? '#7fe0ff' : '#e8e0d0';
      context.beginPath();
      context.arc(px, py, world === snapshot.reference ? 4 : 3, 0, Math.PI * 2);
      context.fill();
      context.fillText(world, px + 5, py - 4);
    }
  }

  return {
    update(dt) {
      elapsed += dt;
      if (canvas.hidden || elapsed < REFRESH_SECONDS) return;
      elapsed = 0;
      draw();
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      canvas.remove();
    },
  };
}
