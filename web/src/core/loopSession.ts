// Une el director del ciclo (lógica pura) con el navegador: guardado, reloj doble, fundidos, efectos
// del cielo y teclas de depuración. Lo cubren las pruebas de Playwright (e2e/loop.spec.ts).
import type { DirectionalLight, Scene, Vector3 } from 'three';
import chronologyData from '../data/cronologia.json';
import { TIME_MODE } from '../data/loop';
import { createLoopEffects } from '../render/loopEffects';
import { createClockHud } from '../ui/clockHud';
import type { LoopSnapshot } from '../ui/debugOverlay';
import { createFadeLayer } from '../ui/fade';
import { LoopDirector } from './loopDirector';
import type { Player } from './player';
import { browserStore, clearSave, loadSave, writeSave } from './save';
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
  /** Borra la partida guardada y recarga la página. */
  resetProgress(): void;
  dispose(): void;
}

function loadChronology() {
  const chronology = parseChronology(chronologyData);
  const testLength = cycleLengthFromQuery(window.location.search);
  return testLength === undefined ? chronology : scaleChronology(chronology, testLength);
}

export function createLoopSession(options: LoopSessionOptions): LoopSession {
  const { scene, sun, worldId, baseRate, triggers, player, onRestart } = options;
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
    persist: (data) => writeSave(store, data),
  });
  const hud = createClockHud();
  const fade = createFadeLayer();
  const effects = createLoopEffects(scene, sun);

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
      }
      effects.update(director.clock.t, director.active(), director.absorption, playing ? dt : 0);
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
        events: director.active().map((e) => e.id),
      };
    },
    resetProgress() {
      clearSave(store);
      window.location.reload();
    },
    dispose() {
      abort.abort();
      hud.dispose();
      fade.dispose();
      effects.dispose();
    },
  };
}
