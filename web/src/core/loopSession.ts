// Une el director del ciclo (lógica pura) con el navegador: guardado, reloj doble, fundidos, efectos
// del cielo y teclas de depuración. En casa (el prólogo) no hay ciclo ni reloj doble, y al cruzar el gusano se
// guarda que el prólogo está hecho. Lo cubren las pruebas de Playwright (e2e/loop.spec.ts y prologue.spec.ts).
import type { Light, Scene, Vector3 } from 'three';
import { TIME_MODE } from '../data/loop';
import { createLoopEffects } from '../render/loopEffects';
import { createClockHud } from '../ui/clockHud';
import type { LoopSnapshot } from '../ui/debugOverlay';
import { createFadeLayer } from '../ui/fade';
import { LoopDirector, type DeathCause, type Locale } from './loopDirector';
import type { Player } from './player';
import {
  browserStore,
  clearSave,
  isSaveErased,
  loadSave,
  markPrologueDone,
  saveProgress,
  SAVE_VERSION,
  type LoadResult,
} from './save';
import type { Chronology, TimelineEvent } from './timeline';

/** Con `?debug`, `[` y `]` saltan esta fracción del ciclo (1 min de 15). */
const DEBUG_SKIP_FRACTION = 1 / 15;

export interface LoopSessionOptions {
  scene: Scene;
  sun: Light;
  chronology: Chronology;
  /** Dónde está el jugador en cada instante del ciclo (mundo, ritmo del reloj, absorción en el espacio). */
  locate: (t: number) => Locale;
  /** Eventos propios de los mundos (marcas TRIG_ con loop_time). */
  extraEvents: readonly TimelineEvent[];
  player: Player;
  /** Dónde se ve el agujero negro en el cielo (provisional). */
  skyDirection: Vector3;
  /** Al empezar un ciclo nuevo (o, en casa, tras un accidente): reaparecer y reiniciar lo que haga falta. */
  onRestart: () => void;
  /** Si corre el ciclo (sí por defecto); en casa, en el prólogo, no. */
  looping?: boolean;
  /** El guardado ya leído (si no, se lee aquí). */
  saved?: LoadResult;
  /** Cuando el fundido del gusano cubre la pantalla: el prólogo ya está guardado como hecho. */
  onCross?: (saved: boolean) => void;
}

export interface LoopSession {
  readonly director: LoopDirector;
  /** El jugador puede moverse (no está muriendo). */
  readonly acceptsInput: boolean;
  /** Temblor de cámara de los eventos (se suma a la posición de los ojos). */
  readonly shake: Vector3;
  update(dt: number, playing: boolean, forcedCause?: DeathCause): void;
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

export function createLoopSession(options: LoopSessionOptions): LoopSession {
  const { scene, sun, chronology, locate, extraEvents, player, onRestart, skyDirection } = options;
  const looping = options.looping !== false;
  const store = browserStore();
  const loaded = options.saved ?? loadSave(store);
  if (!options.saved && loaded.warning) console.warn(loaded.warning);

  const director = new LoopDirector({
    chronology,
    locate,
    mode: TIME_MODE,
    extraEvents,
    looping,
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
  // Si otra pestaña elige "Empezar de cero", esta recarga: si no, volvería a escribir lo que tiene en memoria.
  window.addEventListener(
    'storage',
    (event) => {
      if (isSaveErased(event)) window.location.reload();
    },
    { signal: abort.signal },
  );
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

  /** Guarda que el prólogo está hecho (con lo demás); false si no se pudo. */
  const finishPrologue = (): boolean => markPrologueDone(store, loaded, director.loopsCompleted);

  return {
    director,
    get acceptsInput() {
      return director.phase !== 'dying';
    },
    shake: effects.shake,
    update(dt, playing, forcedCause) {
      if (playing) {
        const result = director.update(dt, player.state, forcedCause);
        if (result.restart) onRestart();
        if (result.crossed) options.onCross?.(finishPrologue());
      } else {
        director.observe(player.state); // la física sigue en pausa: no juzgar esos aterrizajes
      }
      const active = director.active();
      activeEventIds = active.map((e) => e.id);
      effects.update(director.clock.t, active, director.absorption, playing ? dt : 0);
      fade.set(director.fade);
      // En casa no hay reloj doble: aparece por primera vez al despertar en Umbral.
      hud.update(
        director.clock.tau,
        director.clock.t,
        looping && playing && director.phase !== 'dying',
      );
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
        cause: director.deathCause ?? null,
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
          prologueDone: loaded.data.prologueDone,
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
