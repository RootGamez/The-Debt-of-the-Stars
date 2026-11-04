// Director del ciclo: avanza los relojes, informa de los eventos de la cronología, decide cuándo se
// muere (fin del ciclo, absorción del mundo o caída) y encadena fundido → reinicio → guardado.
// En casa, en el prólogo (Fase 9), no hay ciclo: el reloj no corre, un accidente te devuelve a un sitio seguro
// sin morir y el gusano (con el mismo fundido a blanco) lleva al sistema ajeno. Con el Contrapeso instalado
// (Fase 10) nada se traga ningún mundo, y cruzar el horizonte estable (fundido a negro) lleva al epílogo; en el
// Archivo de las Puertas tampoco hay ciclo, y una boca de casa lleva de vuelta a Hogar.
// Lógica pura: main.ts aplica los efectos (fundidos, reaparecer al jugador, cielo).
import { FADE_IN_SECONDS, FADE_OUT_SECONDS, FALL_DEATH_SPEED } from '../data/loop';
import { absorptionProgress } from '../system/absorption';
import {
  advanceClock,
  createLoopClock,
  MIN_RATE,
  type LoopClock,
  type TimeMode,
} from './loopClock';
import type { SaveData } from './save';
import {
  absorptionWindow,
  activeAt,
  eventsBetween,
  type Chronology,
  type EventChange,
  type TimelineEvent,
} from './timeline';

/** Dónde está el jugador según el sistema: lo único que el director necesita saber del lugar. */
export interface Locale {
  /** Mundo en cuyo marco estás; `undefined` = espacio abierto. */
  worldId: string | undefined;
  /** Ritmo del reloj aquí (ya con la mezcla por cercanía y las curvas del ciclo). */
  rate: number;
  /** En el espacio abierto: el frente de absorción te ha alcanzado. Se ignora dentro de un mundo. */
  engulfed: boolean;
}

export type LoopPhase = 'playing' | 'dying' | 'waking';
/**
 * `marea`: la tensión de la marea llegó al máximo (Fase 7, physics/tides.ts). `gusano` no es una muerte: es el
 * paso al sistema ajeno al final del prólogo, con el mismo fundido a blanco. `horizonte` tampoco: es cruzar el
 * horizonte estable (Fase 10) hacia el Archivo de las Puertas, con un fundido a negro; `boca`, cruzar una de las
 * bocas de casa del Archivo de vuelta a Hogar, con el blanco del gusano. `ahogado`: se acabó el aire buceando en
 * el mar del Archivo (Fase 11E). `gas`: hundirse en las nubes del Taller, a pie o con la nave (Fase 11F).
 */
export type DeathCause =
  | 'fin'
  | 'absorcion'
  | 'caida'
  | 'choque'
  | 'calor'
  | 'marea'
  | 'ahogado'
  | 'gas'
  | 'gusano'
  | 'horizonte'
  | 'boca';

/** Lo que no es una muerte sino un paso a otro sitio: no cuenta ciclo y la página se recarga allí. */
const CROSSINGS: readonly DeathCause[] = ['gusano', 'horizonte', 'boca'];

export interface Fade {
  color: 'white' | 'black' | 'none';
  /** 0 = transparente, 1 = pantalla cubierta. */
  amount: number;
}

/** Lo que el director necesita saber del jugador para la muerte por caída. */
export interface LandingInfo {
  landings: number;
  lastLandingSpeed: number;
}

export interface DirectorOptions {
  chronology: Chronology;
  /** Dónde está el jugador en el instante `t` del reloj de Umbral. */
  locate: (t: number) => Locale;
  mode: TimeMode;
  /** Eventos propios del mundo (marcas TRIG_ con loop_time). */
  extraEvents: readonly TimelineEvent[];
  save: SaveData;
  /** Guarda el progreso; devuelve false si no se pudo (el juego sigue igual). */
  persist: (data: SaveData) => boolean;
  /** Si corre el ciclo (sí por defecto); en casa no. */
  looping?: boolean;
}

export interface DirectorUpdate {
  changes: EventChange[];
  /** true en el instante del reinicio: hay que reaparecer al jugador y reiniciar el mundo. */
  restart: boolean;
  /**
   * true una sola vez, cuando el fundido de un paso (`gusano`, `horizonte`, `boca`: ver `deathCause`) ha cubierto
   * la pantalla: toca ir al sistema ajeno, al Archivo de las Puertas o de vuelta a casa.
   */
  crossed: boolean;
}

const NOTHING: DirectorUpdate = Object.freeze({ changes: [], restart: false, crossed: false });
/** En casa, tras un accidente: de vuelta a un sitio seguro, sin muerte ni ciclo nuevo. */
const RESCUED: DirectorUpdate = Object.freeze({ changes: [], restart: true, crossed: false });
const CROSSED: DirectorUpdate = Object.freeze({ changes: [], restart: false, crossed: true });
/** Cuántos eventos recientes se recuerdan (panel F3 y pruebas). */
const RECENT_EVENTS = 10;

export class LoopDirector {
  clock: LoopClock;
  phase: LoopPhase = 'playing';
  deathCause: DeathCause | undefined;
  /** El último guardado falló (modo privado, almacenamiento lleno…): el progreso no sobrevivirá. */
  saveFailed = false;
  /** Ids de los últimos eventos que empezaron, del más antiguo al más reciente. */
  readonly recentEvents: string[] = [];
  /**
   * El Contrapeso está instalado (Fase 10C): el agujero negro nace pero no se traga nada. El ciclo termina igual a
   * las 15:00. Dura hasta el ciclo siguiente.
   */
  stable = false;
  private phaseTime = 0;
  private seenLandings = 0;
  private hasCrossed = false;
  private progress: SaveData;
  private readonly events: readonly TimelineEvent[];

  constructor(private readonly options: DirectorOptions) {
    this.clock = createLoopClock(options.chronology.duration);
    this.progress = options.save;
    this.events = [...options.chronology.events, ...options.extraEvents];
  }

  get loopsCompleted(): number {
    return this.progress.loopsCompleted;
  }

  /** Ritmo del reloj del mundo en este momento del ciclo. */
  get rate(): number {
    return Math.max(MIN_RATE, this.locale().rate);
  }

  /** El Contrapeso encajó: desde ahora y hasta el ciclo siguiente nada cae al agujero. */
  stabilize(): void {
    this.stable = true;
  }

  /** Avance de la absorción del mundo (0 antes de empezar, 1 al terminar). */
  get absorption(): number {
    if (this.stable) return 0;
    const { worldId, engulfed } = this.locale();
    if (worldId === undefined) return engulfed ? 1 : 0;
    return absorptionProgress(absorptionWindow(this.options.chronology, worldId), this.clock.t);
  }

  get fade(): Fade {
    if (this.phase === 'dying') {
      const color = this.deathCause === 'horizonte' ? 'black' : 'white';
      return { color, amount: Math.min(1, this.phaseTime / FADE_OUT_SECONDS) };
    }
    if (this.phase === 'waking') {
      return { color: 'black', amount: Math.max(0, 1 - this.phaseTime / FADE_IN_SECONDS) };
    }
    return { color: 'none', amount: 0 };
  }

  update(realDt: number, landing: LandingInfo, forcedCause?: DeathCause): DirectorUpdate {
    if (!Number.isFinite(realDt) || realDt <= 0) return NOTHING;
    const hardLanding = this.readLanding(landing);
    if (this.phase === 'dying') return this.fadeOut(realDt);

    const changes = this.looping ? this.tick(realDt) : [];
    if (this.phase === 'waking') {
      this.phaseTime += realDt;
      if (this.phaseTime >= FADE_IN_SECONDS) this.enter('playing');
    }
    const cause = forcedCause ?? this.causeOfDeath(hardLanding);
    if (!cause) return { changes, restart: false, crossed: false };
    if (!this.looping && !CROSSINGS.includes(cause)) {
      this.enter('waking'); // en casa nadie muere: un parpadeo a negro y de vuelta a un sitio seguro
      return RESCUED;
    }
    this.deathCause = cause;
    this.enter('dying');
    return { changes, restart: false, crossed: false };
  }

  private get looping(): boolean {
    return this.options.looping !== false;
  }

  /** Avanza los relojes y devuelve los eventos que empezaron o acabaron. */
  private tick(realDt: number): EventChange[] {
    const here = this.locale();
    const span = advanceClock(this.clock, realDt, Math.max(MIN_RATE, here.rate), this.options.mode);
    const changes = eventsBetween(this.events, span.from, span.to, here.worldId);
    this.remember(changes);
    return changes;
  }

  /** Eventos en curso ahora mismo (para que los efectos se pongan al día tras un salto). */
  active(): TimelineEvent[] {
    return activeAt(this.events, this.clock.t, this.locale().worldId);
  }

  /**
   * Mientras el juego está en pausa: anota los aterrizajes sin juzgarlos, para no morir al
   * reanudar por una caída que la física resolvió durante la pausa.
   */
  observe({ landings }: LandingInfo): void {
    this.seenLandings = landings;
  }

  /**
   * Salto de tiempo para depurar (`?debug`), solo mientras se juega. Hacia delante informa de los
   * eventos saltados. Mueve el reloj de Umbral, no el del jugador (los dos dejan de cuadrar).
   */
  skip(seconds: number): EventChange[] {
    if (this.phase !== 'playing' || !this.looping) return []; // en casa el reloj no corre
    const from = this.clock.t;
    this.clock.t = Math.max(0, Math.min(this.clock.duration, from + seconds));
    if (this.clock.t <= from) return [];
    const changes = eventsBetween(this.events, from, this.clock.t, this.locale().worldId);
    this.remember(changes);
    return changes;
  }

  private locale(): Locale {
    return this.options.locate(this.clock.t);
  }

  private remember(changes: readonly EventChange[]): void {
    for (const change of changes) {
      if (change.kind !== 'start') continue;
      this.recentEvents.push(change.event.id);
      if (this.recentEvents.length > RECENT_EVENTS) this.recentEvents.shift();
    }
  }

  /** Devuelve si hubo un aterrizaje nuevo lo bastante fuerte para morir. */
  private readLanding({ landings, lastLandingSpeed }: LandingInfo): boolean {
    const isNew = landings > this.seenLandings;
    this.seenLandings = landings; // también si bajó (el jugador reapareció)
    return isNew && lastLandingSpeed >= FALL_DEATH_SPEED;
  }

  private causeOfDeath(hardLanding: boolean): DeathCause | undefined {
    if (hardLanding) return 'caida';
    if (!this.looping) return undefined; // en casa no hay fin del ciclo ni absorción
    if (!this.stable && this.swallowed()) return 'absorcion';
    if (this.clock.ended) return 'fin';
    return undefined;
  }

  /** Donde estás ya ha caído al agujero (en tu mundo, al final de su ventana; en el espacio, al pasar el frente). */
  private swallowed(): boolean {
    const { worldId, engulfed } = this.locale();
    if (worldId === undefined) return engulfed;
    const window = absorptionWindow(this.options.chronology, worldId);
    return window !== undefined && this.clock.t >= window[1];
  }

  private fadeOut(realDt: number): DirectorUpdate {
    this.phaseTime += realDt;
    if (this.phaseTime < FADE_OUT_SECONDS) return NOTHING;
    if (this.deathCause && CROSSINGS.includes(this.deathCause)) {
      // La pantalla se queda cubierta: quien llama se va al otro sitio (solo se avisa una vez).
      if (this.hasCrossed) return NOTHING;
      this.hasCrossed = true;
      return CROSSED;
    }
    this.progress = { ...this.progress, loopsCompleted: this.progress.loopsCompleted + 1 };
    this.saveFailed = !this.options.persist(this.progress);
    this.clock = createLoopClock(this.options.chronology.duration);
    this.seenLandings = 0;
    this.deathCause = undefined;
    this.stable = false;
    this.enter('waking');
    return { changes: [], restart: true, crossed: false };
  }

  private enter(phase: LoopPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}
