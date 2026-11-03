// Panel de depuración (F3): posición, altitud, suelo, gravedad, fps y coste de render.
// Con `?debug` en la URL arranca visible y expone `window.__juego` para las pruebas de Playwright.
// Sin `?debug` y con el panel oculto no calcula nada.
import { Vector3, type WebGLRenderer } from 'three';
import type { Player } from '../core/player';
import type { CounterweightSnapshot } from '../game/counterweightPlay';
import type { Ending } from '../game/epilogue';
import type { HomecomingPhase } from '../game/homecomingRig';
import type { ShipSnapshot } from '../game/shipFlight';
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
  /** Registro: hechos, conclusiones, rumores y lectura abierta. */
  registry: RegistrySnapshot;
  /** Ciclo: tiempo de Umbral, tiempo del jugador, fase, ciclos vividos, ritmo y eventos en curso. */
  loop: LoopSnapshot;
  /** El sistema: en qué marco estás y dónde está cada mundo en el marco del sistema. */
  system: SystemSnapshot;
  /** La nave (null si el mundo no está en el sistema). */
  ship: ShipSnapshot | null;
}

export interface SystemSnapshot {
  /** Mundo de referencia; null = espacio abierto. */
  reference: string | null;
  /** Posición de cada mundo en el marco del sistema (origen = la Brasa), en metros. */
  bodies: Record<string, [number, number, number]>;
}

export interface RegistrySnapshot {
  facts: string[];
  conclusions: string[];
  rumors: string[];
  reading: string | null;
  registryOpen: boolean;
  /** La grabación que suena, o null. */
  recording: { speed: number; clarity: number; understood: boolean } | null;
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
  /** De qué se está muriendo (mientras dura el fundido a blanco); null si no. */
  cause: string | null;
}

declare global {
  interface Window {
    /** Solo con `?debug`. `snapshot()` es null hasta el primer fotograma. */
    __juego?: {
      snapshot(): DebugSnapshot | null;
      /** Coloca al jugador frente a una fuente (`clue_id`). false si no existe. */
      teleportTo?(clueId: string): boolean;
      /** Pasa a pie a otro mundo del sistema (sin volar). false si no existe. */
      warpTo?(world: string): boolean;
      /** Pilotando: la nave aparece quieta a esa altura sobre un mundo. false si no se puede. */
      shipTo?(world: string, altitude: number): boolean;
      /** A pie: el jugador aparece junto a la escotilla de la nave. */
      toShip?(): boolean;
      /** Lleva el reloj de Umbral a ese instante del ciclo (s); devuelve dónde quedó. */
      skipTo?(seconds: number): number;
      /**
       * El agujero negro: su radio (m), si se ve, su radio aparente desde quien mira (rad) y cuánto ha caído hacia
       * él quien está en el mundo que se traga (0–1).
       */
      blackHole?(): { radius: number; visible: boolean; span: number; approach: number };
      /** A pie, gira la vista hacia un mundo o hacia el agujero (`'agujero'`), para encuadrar capturas. */
      aimAt?(target: string): boolean;
      /** El gusano de la Luna: si se ha abierto y cuánto (0–1). */
      wormhole?(): { active: boolean; progress: number };
      /** La guía del prólogo: el aviso a la vista y lo ya aprendido. */
      guide?(): { shown: string | null; done: string[] };
      /** Los Ool: cuánto se ha girado cada uno hacia ti (rad) y tus filamentos (si brillan, cuántas veces latieron). */
      ool?(): { turns: Record<string, number>; filaments: { glowing: boolean; beats: number } };
      /** El cielo de un mundo con aire: cuánto se ve (0 = el espacio, 1 = todo cielo). */
      sky?(): { density: number };
      /** La absorción de los mundos: avance de cada uno (0–1), los ya tragados y los trozos que caen. */
      absorption?(): {
        progress: Record<string, number>;
        swallowed: string[];
        debris: number;
      } | null;
      /**
       * El Contrapeso: dónde está (`bench`, `carried`, `cradle`, `installed`…), lo que marca su esfera (s), si va en
       * el relicario de la nave, si el motor viejo está fuera y lo que marca la máquina (s). null sin el Laboratorio.
       */
      counterweight?(): CounterweightSnapshot | null;
      /** El horizonte estable: su radio (m; 0 si no lo hay) y lo cerca que está quien mira (0–1). */
      horizon?(): { radius: number; closeness: number };
      /** Pilotando: la nave aparece quieta delante del horizonte estable, a `radii` radios de su centro. */
      nearHorizon?(radii: number): boolean;
      /** En el Archivo de las Puertas: si se llevan los planos del Contrapeso. null fuera de allí. */
      epilogue?(): { carryingPlans: boolean } | null;
      /** De vuelta en casa (`?final=`): el final, en qué punto va el cierre y lo que aún no ha llegado. null si no. */
      homecoming?(): { ending: Ending; phase: HomecomingPhase; without: readonly string[] } | null;
      /** La marea donde estás y la tensión acumulada (0–1; a 1, muerte `marea`). */
      tide?(): { tide: number; strain: number };
      dive?(): { underwater: boolean; breath: number };
      /**
       * La imagen del Nudo: si se ve, con qué claridad y cuánto la desvía la lente (grados); si las estrellas se
       * doblan (no con calidad baja) y cuánto las dobla el agujero negro (rad).
       */
      lens?(): {
        visible: boolean;
        clarity: number;
        offsetDegrees: number | null;
        bending: boolean;
        holeLens: number;
      };
      /** Dónde está el jugador a pie: mundo, si está dentro de una cavidad y anillos cruzados. */
      place?(): { world: string; inside: boolean; crossings: number };
      /**
       * El sonido: si el audio está activo, si está silenciado, qué voces suenan y la última mezcla (volumen
       * general y el de cada voz).
       */
      audio?(): {
        muted: boolean;
        running: boolean;
        voices: string[];
        master: number;
        levels: Record<string, number>;
      };
    };
  }
}

const REFRESH_SECONDS = 0.25;

export interface DebugOverlay {
  update(dt: number, playing: boolean): void;
  dispose(): void;
}

/** De dónde saca el panel lo que muestra (todo cambia al pasar de un mundo a otro). */
export interface DebugSources {
  where: () => { world: string; home: GravityWell; wells: readonly GravityWell[] };
  player: Player;
  renderer: WebGLRenderer;
  loop: () => LoopSnapshot;
  registry: () => RegistrySnapshot;
  system: () => SystemSnapshot;
  ship: () => ShipSnapshot | null;
}

export function createDebugOverlay(sources: DebugSources): DebugOverlay {
  const { where, player, renderer } = sources;
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
    const { world, home, wells } = where();
    return {
      world,
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
      loop: sources.loop(),
      registry: sources.registry(),
      system: sources.system(),
      ship: sources.ship(),
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
      `marco     ${s.system.reference ?? 'espacio abierto'}`,
      `registro ${s.registry.facts.length} hechos · ${s.registry.conclusions.join(' ') || '—'}`,
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
