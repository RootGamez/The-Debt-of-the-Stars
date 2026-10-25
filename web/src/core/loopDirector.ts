// Director del ciclo: avanza los relojes, informa de los eventos de la cronología, decide cuándo se
// muere (fin del ciclo, absorción del mundo o caída) y encadena fundido → reinicio → guardado.
// Lógica pura: main.ts aplica los efectos (fundidos, reaparecer al jugador, cielo).
import { FADE_IN_SECONDS, FADE_OUT_SECONDS, FALL_DEATH_SPEED } from '../data/loop';
import { rateAt } from './clockRates';
import { advanceClock, createLoopClock, type LoopClock, type TimeMode } from './loopClock';
import type { SaveData } from './save';
import {
  absorptionWindow,
  activeAt,
  eventsBetween,
  type Chronology,
  type EventChange,
  type TimelineEvent,
} from './timeline';

export type LoopPhase = 'playing' | 'dying' | 'waking';
export type DeathCause = 'fin' | 'absorcion' | 'caida';

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
  worldId: string;
  /** `clock_rate` del glTF del mundo. */
  baseRate: number;
  mode: TimeMode;
  /** Eventos propios del mundo (marcas TRIG_ con loop_time). */
  extraEvents: readonly TimelineEvent[];
  save: SaveData;
  /** Guarda el progreso; devuelve false si no se pudo (el juego sigue igual). */
  persist: (data: SaveData) => boolean;
}

export interface DirectorUpdate {
  changes: EventChange[];
  /** true en el instante del reinicio: hay que reaparecer al jugador y reiniciar el mundo. */
  restart: boolean;
}

const NOTHING: DirectorUpdate = Object.freeze({ changes: [], restart: false });

export class LoopDirector {
  clock: LoopClock;
  phase: LoopPhase = 'playing';
  deathCause: DeathCause | undefined;
  private phaseTime = 0;
  private seenLandings = 0;
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
    const { baseRate, chronology, worldId } = this.options;
    return rateAt(baseRate, chronology.clocks[worldId], this.clock.t);
  }

  /** Avance de la absorción del mundo (0 antes de empezar, 1 al terminar). */
  get absorption(): number {
    const window = absorptionWindow(this.options.chronology, this.options.worldId);
    if (!window) return 0;
    const [start, end] = window;
    if (end <= start) return this.clock.t >= start ? 1 : 0;
    return Math.min(1, Math.max(0, (this.clock.t - start) / (end - start)));
  }

  get fade(): Fade {
    if (this.phase === 'dying') {
      return { color: 'white', amount: Math.min(1, this.phaseTime / FADE_OUT_SECONDS) };
    }
    if (this.phase === 'waking') {
      return { color: 'black', amount: Math.max(0, 1 - this.phaseTime / FADE_IN_SECONDS) };
    }
    return { color: 'none', amount: 0 };
  }

  update(realDt: number, landing: LandingInfo): DirectorUpdate {
    if (!Number.isFinite(realDt) || realDt <= 0) return NOTHING;
    const hardLanding = this.readLanding(landing);
    if (this.phase === 'dying') return this.fadeOut(realDt);

    const span = advanceClock(this.clock, realDt, this.rate, this.options.mode);
    const changes = eventsBetween(this.events, span.from, span.to, this.options.worldId);
    if (this.phase === 'waking') {
      this.phaseTime += realDt;
      if (this.phaseTime >= FADE_IN_SECONDS) this.enter('playing');
    }
    const cause = this.causeOfDeath(hardLanding);
    if (cause) {
      this.deathCause = cause;
      this.enter('dying');
    }
    return { changes, restart: false };
  }

  /** Eventos en curso ahora mismo (para que los efectos se pongan al día tras un salto). */
  active(): TimelineEvent[] {
    return activeAt(this.events, this.clock.t, this.options.worldId);
  }

  /** Salto de tiempo para depurar (`?debug`). Hacia delante informa de los eventos saltados. */
  skip(seconds: number): EventChange[] {
    const from = this.clock.t;
    this.clock.t = Math.max(0, Math.min(this.clock.duration, from + seconds));
    if (this.clock.t <= from) return [];
    return eventsBetween(this.events, from, this.clock.t, this.options.worldId);
  }

  /** Devuelve si hubo un aterrizaje nuevo lo bastante fuerte para morir. */
  private readLanding({ landings, lastLandingSpeed }: LandingInfo): boolean {
    const isNew = landings > this.seenLandings;
    this.seenLandings = landings; // también si bajó (el jugador reapareció)
    return isNew && lastLandingSpeed >= FALL_DEATH_SPEED;
  }

  private causeOfDeath(hardLanding: boolean): DeathCause | undefined {
    if (hardLanding) return 'caida';
    const window = absorptionWindow(this.options.chronology, this.options.worldId);
    if (window && this.clock.t >= window[1]) return 'absorcion';
    if (this.clock.ended) return 'fin';
    return undefined;
  }

  private fadeOut(realDt: number): DirectorUpdate {
    this.phaseTime += realDt;
    if (this.phaseTime < FADE_OUT_SECONDS) return NOTHING;
    this.progress = { ...this.progress, loopsCompleted: this.progress.loopsCompleted + 1 };
    this.options.persist(this.progress);
    this.clock = createLoopClock(this.options.chronology.duration);
    this.seenLandings = 0;
    this.deathCause = undefined;
    this.enter('waking');
    return { changes: [], restart: true };
  }

  private enter(phase: LoopPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}
