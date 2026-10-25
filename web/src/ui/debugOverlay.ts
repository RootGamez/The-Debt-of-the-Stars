// Panel de depuración (F3): posición, altitud, suelo, gravedad, fps y coste de render.
// Con `?debug` en la URL arranca visible y expone `window.__juego` para las pruebas de Playwright.
// Sin `?debug` y con el panel oculto no calcula nada.
import { Vector3, type WebGLRenderer } from 'three';
import type { Player } from '../core/player';
import { gravityAt, type GravityWell } from '../physics/gravity';

export interface DebugSnapshot {
  world: string;
  /** Distancia de los pies al radio nominal del planeta (m). */
  altitude: number;
  grounded: boolean;
  speed: number;
  gravity: number;
  playing: boolean;
  respawns: number;
  /** Veces que el jugador ha despegado del suelo (contadas en cada paso de física). */
  takeoffs: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  /** Ciclo: tiempo de Umbral, tiempo del jugador, fase, ciclos vividos, ritmo y eventos en curso. */
  loop: LoopSnapshot;
}

export interface LoopSnapshot {
  umbral: number;
  player: number;
  phase: string;
  loops: number;
  rate: number;
  events: string[];
  /** Últimos eventos que empezaron (incluidos los instantáneos, como un TRIG_ sin duración). */
  fired: string[];
  /** El progreso se guarda. */
  saving: boolean;
}

declare global {
  interface Window {
    /** Solo con `?debug`. `snapshot()` es null hasta el primer fotograma. */
    __juego?: { snapshot(): DebugSnapshot | null };
  }
}

const REFRESH_SECONDS = 0.25;

export interface DebugOverlay {
  update(dt: number, playing: boolean): void;
  dispose(): void;
}

export function createDebugOverlay(
  worldId: string,
  home: GravityWell,
  wells: readonly GravityWell[],
  player: Player,
  renderer: WebGLRenderer,
  loopInfo: () => LoopSnapshot,
): DebugOverlay {
  const exposed = new URLSearchParams(window.location.search).has('debug');
  const panel = document.createElement('pre');
  panel.className = 'debug';
  panel.hidden = !exposed;
  panel.setAttribute('aria-live', 'off');
  document.body.append(panel);

  const gravity = new Vector3();
  let snapshot: DebugSnapshot | null = null;
  let elapsed = 0;
  let frames = 0;
  let fps = 0;

  const onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'F3') return;
    event.preventDefault();
    panel.hidden = !panel.hidden;
  };
  window.addEventListener('keydown', onKey);
  if (exposed) window.__juego = { snapshot: () => snapshot };

  const takeSnapshot = (playing: boolean): DebugSnapshot => {
    const { state } = player;
    return {
      world: worldId,
      altitude: state.position.distanceTo(home.center) - home.radius,
      grounded: state.grounded,
      speed: state.velocity.length(),
      gravity: gravityAt(state.position, wells, gravity).length(),
      playing,
      respawns: player.respawnCount,
      takeoffs: state.takeoffs,
      fps,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      loop: loopInfo(),
    };
  };

  const render = (s: DebugSnapshot): void => {
    const p = player.state.position;
    panel.textContent = [
      `mundo     ${s.world}`,
      `posición  ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      `altitud   ${s.altitude.toFixed(2)} m sobre el radio`,
      `suelo     ${s.grounded ? 'sí' : 'no'} · despegues ${s.takeoffs}`,
      `velocidad ${s.speed.toFixed(2)} m/s`,
      `gravedad  ${s.gravity.toFixed(2)} m/s²`,
      `reapariciones ${s.respawns}`,
      `fps       ${fps.toFixed(0)}`,
      `draw calls ${s.drawCalls} · triángulos ${s.triangles}`,
      `ciclo ${s.loop.loops} · ${s.loop.phase} · Umbral ${s.loop.umbral.toFixed(1)} s · tú ${s.loop.player.toFixed(1)} s`,
      `ritmo ${s.loop.rate.toFixed(2)} · eventos ${s.loop.events.join(', ') || '—'}`,
    ].join('\n');
  };

  return {
    update(dt, playing) {
      frames++;
      elapsed += dt;
      const refresh = elapsed >= REFRESH_SECONDS;
      if (refresh) {
        fps = frames / elapsed;
        frames = 0;
        elapsed = 0;
      }
      if (!exposed && panel.hidden) return;
      snapshot = takeSnapshot(playing);
      if (refresh && !panel.hidden) render(snapshot);
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      panel.remove();
      delete window.__juego;
    },
  };
}
