// Panel de depuración (F3): posición, altitud, suelo, gravedad, fps y coste de render.
// Con `?debug` en la URL arranca visible y expone `window.__juego` para las pruebas de Playwright.
import type { WebGLRenderer } from 'three';
import type { Player } from '../core/player';

export interface DebugSnapshot {
  world: string;
  altitude: number;
  grounded: boolean;
  speed: number;
  gravity: number;
  playing: boolean;
  respawns: number;
  fps: number;
  drawCalls: number;
  triangles: number;
}

declare global {
  interface Window {
    __juego?: { snapshot(): DebugSnapshot };
  }
}

const REFRESH_SECONDS = 0.25;

export interface DebugOverlay {
  update(dt: number, gravity: number, playing: boolean): void;
  dispose(): void;
}

export function createDebugOverlay(
  worldId: string,
  radius: number,
  player: Player,
  renderer: WebGLRenderer,
): DebugOverlay {
  const params = new URLSearchParams(window.location.search);
  const panel = document.createElement('pre');
  panel.className = 'debug';
  panel.hidden = !params.has('debug');
  panel.setAttribute('aria-live', 'off');
  document.body.append(panel);

  let snapshot: DebugSnapshot | undefined;
  let elapsed = 0;
  let frames = 0;
  let fps = 0;

  const onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'F3') return;
    event.preventDefault();
    panel.hidden = !panel.hidden;
  };
  window.addEventListener('keydown', onKey);
  if (params.has('debug')) {
    window.__juego = {
      snapshot: () => {
        if (!snapshot) throw new Error('El juego aún no ha dibujado ningún fotograma');
        return snapshot;
      },
    };
  }

  return {
    update(dt, gravity, playing) {
      frames++;
      elapsed += dt;
      if (elapsed < REFRESH_SECONDS) return;
      fps = frames / elapsed;
      frames = 0;
      elapsed = 0;
      const { state } = player;
      snapshot = {
        world: worldId,
        altitude: state.position.length() - radius,
        grounded: state.grounded,
        speed: state.velocity.length(),
        gravity,
        playing,
        respawns: player.respawnCount,
        fps,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
      if (panel.hidden) return;
      const p = state.position;
      panel.textContent = [
        `mundo     ${worldId}`,
        `posición  ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
        `altitud   ${snapshot.altitude.toFixed(2)} m sobre el radio`,
        `suelo     ${state.grounded ? 'sí' : 'no'}`,
        `velocidad ${snapshot.speed.toFixed(2)} m/s`,
        `gravedad  ${gravity.toFixed(2)} m/s²`,
        `reapariciones ${player.respawnCount}`,
        `fps       ${fps.toFixed(0)}`,
        `draw calls ${snapshot.drawCalls} · triángulos ${snapshot.triangles}`,
      ].join('\n');
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      panel.remove();
      delete window.__juego;
    },
  };
}
