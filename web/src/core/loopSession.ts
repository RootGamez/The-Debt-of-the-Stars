// Une el director del ciclo (lógica pura) con el navegador: guardado, reloj doble, fundidos, efectos
// del cielo y teclas de depuración. Lo cubren las pruebas de Playwright (e2e/loop.spec.ts).
import type { DirectionalLight, Scene, Vector3 } from 'three';
import chronologyData from '../data/cronologia.json';
import { TIME_MODE } from '../data/loop';
import { createLoopEffects } from '../render/loopEffects';
import { createClockHud } from '../ui/clockHud';
import type { LoopSnapshot } from '../ui/debugOverlay';
import { createFadeLayer } from '../ui/fade';
import { WORLD_IDS } from '../worlds/worldSelection';
import { LoopDirector } from './loopDirector';
import type { Player } from './player';
import { browserStore, clearSave, loadSave, saveProgress, SAVE_VERSION } from './save';
import {
  cycleLengthFromQuery,
  parseChronology,
  scaleChronology,
  triggersAsEvents,
  type TimelineEvent,
} from './timeline';

/** Con `?debug`, `[` y `]` saltan esta fracción del ciclo (1 min de 15). */
const DEBUG_SKIP_FRACTION = 1 / 15;

export interface LoopSessionOptions {
  scene: Scene;
  sun: DirectionalLight;
  worldId: string;
  baseRate: number;
  triggers: readonly {
    event: string;
    loopTime: number | undefined;
    duration: number | undefined;
  }[];
  player: Player;
  /** Dónde se ve el agujero negro en el cielo (provisional). */
  skyDirection: Vector3;
  /** Al empezar un ciclo nuevo: reaparecer y reiniciar lo que haga falta. */
  onRestart: () => void;
}

export interface LoopSession {
  readonly director: LoopDirector;
  /** El jugador puede moverse (no está muriendo). */
  readonly acceptsInput: boolean;
  /** Temblor de cámara de los eventos (se suma a la posición de los ojos). */
  readonly shake: Vector3;
  update(dt: number, playing: boolean): void;
  snapshot(): LoopSnapshot;
  /** Hechos guardados (sin filtrar: la sesión de lectura descarta los que ya no existen). */
  readonly savedFacts: readonly string[];
  /** Guarda los hechos (fusionados con lo guardado); false si no se pudo. */
  saveFacts(facts: readonly string[]): boolean;
  /** Ids de los eventos en curso, recalculados una vez por fotograma. */
  readonly activeEventIds: readonly string[];
  /** El progreso se está guardando (falso en modo privado o con una partida más nueva). */
  readonly savingWorks: boolean;
  /** Borra la partida guardada y recarga la página; false si no se pudo borrar. */
  resetProgress(): boolean;
  dispose(): void;
}

function loadChronology() {
  const chronology = parseChronology(chronologyData, WORLD_IDS);
  const testLength = cycleLengthFromQuery(window.location.search);
  return testLength === undefined ? chronology : scaleChronology(chronology, testLength);
}

export function createLoopSession(options: LoopSessionOptions): LoopSession {
  const { scene, sun, worldId, baseRate, triggers, player, onRestart, skyDirection } = options;
  const chronology = loadChronology();
  const store = browserStore();
  const loaded = loadSave(store);
  if (loaded.warning) console.warn(loaded.warning);

  const extraEvents: TimelineEvent[] = triggersAsEvents(triggers, worldId);
  const director = new LoopDirector({
    chronology,
    worldId,
    baseRate,
    mode: TIME_MODE,
    extraEvents,
    save: loaded.data,
    // Partida de una versión más nueva: se juega sin guardar para no estropearla.
    persist: (data) => !loaded.readOnly && saveProgress(store, data),
  });
  let factsFailed = false;
  let activeEventIds: readonly string[] = [];
  const savingWorks = (): boolean =>
    store !== null && !loaded.readOnly && !director.saveFailed && !factsFailed;
  const hud = createClockHud();
  const fade = createFadeLayer();
  const effects = createLoopEffects(scene, sun, skyDirection);

  const abort = new AbortController();
  if (new URLSearchParams(window.location.search).has('debug')) {
    const step = chronology.duration * DEBUG_SKIP_FRACTION;
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.code === 'BracketRight') director.skip(step);
        else if (event.code === 'BracketLeft') director.skip(-step);
      },
      { signal: abort.signal },
    );
  }

  return {
    director,
    get acceptsInput() {
      return director.phase !== 'dying';
    },
    shake: effects.shake,
    update(dt, playing) {
      if (playing) {
        const result = director.update(dt, player.state);
        if (result.restart) onRestart();
      } else {
        director.observe(player.state); // la física sigue en pausa: no juzgar esos aterrizajes
      }
      const active = director.active();
      activeEventIds = active.map((e) => e.id);
      effects.update(director.clock.t, active, director.absorption, playing ? dt : 0);
      fade.set(director.fade);
      hud.update(director.clock.tau, director.clock.t, playing && director.phase !== 'dying');
    },
    snapshot() {
      return {
        umbral: director.clock.t,
        player: director.clock.tau,
        phase: director.phase,
        loops: director.loopsCompleted,
        rate: director.rate,
        events: [...activeEventIds],
        fired: [...director.recentEvents],
        saving: savingWorks(),
      };
    },
    get savingWorks() {
      return savingWorks();
    },
    savedFacts: loaded.data.facts,
    saveFacts(facts) {
      const ok =
        !loaded.readOnly &&
        saveProgress(store, {
          version: SAVE_VERSION,
          loopsCompleted: director.loopsCompleted,
          facts,
        });
      factsFailed = !ok;
      return ok;
    },
    get activeEventIds() {
      return activeEventIds;
    },
    resetProgress() {
      if (!clearSave(store)) {
        console.error('No se pudo borrar la partida: el navegador bloquea el almacenamiento.');
        return false;
      }
      window.location.reload();
      return true;
    },
    dispose() {
      abort.abort();
      hud.dispose();
      fade.dispose();
      effects.dispose();
    },
  };
}
