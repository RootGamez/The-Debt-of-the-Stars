// El colapso de Hogar diez años después (F5, el final malo «Llegas tarde»; 🟡 todos los tiempos). Puro y con tests: la
// cronología de data/colapso-hogar.json pasada a un solo reloj (segundos reales desde que se llega) y lo que se ve en
// cada momento. Cuatro tramos: la llegada (una escena, distinta por La Boca o por el Archivo), el paseo libre para
// reconocer la casa, las señales de cada ciclo (la luz que se curva, el pulso, el cielo rojo) mientras se sigue
// andando, y la escena del colapso: nace el agujero en la garganta de la Puerta Mayor y se traga Hogar y la Luna.
// Después, la tarjeta. Las escenas llevan su propio reloj (el director de cinemáticas); el paseo solo corre jugando.
import type { TimelineEvent } from '../core/timeline';
import { absorptionProgress } from '../system/absorption';
import { blackHoleRadius, type HoleGrowth } from '../system/blackHole';
import { WorldDataError } from '../worlds/markers';
import rawCollapse from '../data/colapso-hogar.json';
import type { HomeVia } from './homecoming';

/** El evento del nacimiento del agujero: el mismo id que en el ciclo (suena y se oye igual). */
export const HOLE_EVENT = 'agujero_negro';
/** Lo que tarda el cielo en ponerse rojo del todo (s). */
export const RED_RAMP = 12;
/** La Puerta Mayor se apaga cuando el agujero nace en su garganta: empieza un poco antes y tarda esto (s). */
const GATE_LEAD = 0.5;
const GATE_CLOSE = 1.5;

/** Los mundos que se traga. */
export type SwallowedWorld = 'hogar' | 'luna';
type Span = readonly [number, number];

export interface CollapseData {
  /** Lo que dura la escena de llegada por cada camino (s). */
  arrival: Readonly<Record<HomeVia, number>>;
  /** El paseo libre antes de las señales (s). */
  roam: number;
  /** Las señales, desde el final del paseo. */
  events: readonly TimelineEvent[];
  /** La escena del colapso: cuándo empieza (desde el final del paseo) y cuánto dura. */
  scene: { start: number; duration: number };
  /** El agujero: cuándo nace (desde el principio de la escena), cuánto tarda en crecer y su radio final (m). */
  hole: { born: number; grow: number; radius: number };
  /** Cuándo se traga cada mundo (desde el principio de la escena). */
  absorption: Readonly<Record<SwallowedWorld, Span>>;
  /** El negro del final (desde el principio de la escena). */
  fade: Span;
}

function fail(message: string): never {
  throw new WorldDataError(`colapso: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function number(value: unknown, what: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    fail(`${what} debe ser un número desde ${min}`);
  }
  return value;
}

function positive(value: unknown, what: string): number {
  const n = number(value, what);
  if (n <= 0) fail(`${what} debe ser mayor que 0`);
  return n;
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`falta «${what}»`);
  return value;
}

/** Una ventana [inicio, fin] dentro de la escena (y, si se pide, no antes de `from`). */
function span(value: unknown, what: string, duration: number, from = 0): Span {
  if (!Array.isArray(value) || value.length !== 2) fail(`${what} debe ser [inicio, fin]`);
  const start = number(value[0], what);
  const end = number(value[1], what);
  if (end <= start) fail(`${what} termina antes de empezar`);
  if (end > duration) fail(`${what} acaba después de la escena (${duration} s)`);
  if (start < from) fail(`${what} empieza antes de que nazca el agujero (${from} s)`);
  return [start, end];
}

function parseEvent(value: unknown, last: number): TimelineEvent {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') {
    fail('cada evento necesita un "id" de texto');
  }
  const id = value.id;
  if (id === HOLE_EVENT)
    fail(`${HOLE_EVENT} no va en "eventos": empieza solo cuando nace el agujero`);
  const t = number(value.t, `${id}.t`);
  const duration = positive(value.duracion, `${id}.duracion`);
  if (t > last) fail(`${id} empieza después de la escena (${last} s)`);
  return { id, t, duration };
}

/** Lee y comprueba data/colapso-hogar.json. */
export function parseCollapse(raw: unknown): CollapseData {
  const data = record(raw, 'colapso');
  const arrival = record(data.llegada, 'llegada');
  const scene = record(data.escena, 'escena');
  const hole = record(data.agujero, 'agujero');
  const absorption = record(data.absorcion, 'absorcion');
  const start = number(scene.inicio, 'escena.inicio');
  const duration = positive(scene.duracion, 'escena.duracion');
  const born = number(hole.nace, 'agujero.nace');
  if (born >= duration) fail(`el agujero nace después de la escena (${duration} s)`);
  if (!Array.isArray(data.eventos)) fail('"eventos" debe ser una lista');
  return {
    arrival: {
      boca: positive(arrival.boca, 'llegada.boca'),
      archivo: positive(arrival.archivo, 'llegada.archivo'),
    },
    roam: number(data.paseo, 'paseo'),
    events: data.eventos.map((event) => parseEvent(event, start + duration)),
    scene: { start, duration },
    hole: {
      born,
      grow: positive(hole.crece, 'agujero.crece'),
      radius: positive(hole.radio, 'agujero.radio'),
    },
    absorption: {
      hogar: span(absorption.hogar, 'absorcion.hogar', duration, born),
      luna: span(absorption.luna, 'absorcion.luna', duration, born),
    },
    fade: span(data.fundido, 'fundido', duration),
  };
}

export const COLLAPSE: CollapseData = parseCollapse(rawCollapse);

/** La cronología en un solo reloj: segundos reales desde que se llega a Hogar. */
export interface CollapseTimeline {
  via: HomeVia;
  /** Acaba la escena de llegada y se puede andar. */
  arrivalEnd: number;
  /** Empiezan las señales. */
  signalsStart: number;
  /** Empieza la escena del colapso. */
  sceneStart: number;
  /** Nace el agujero. */
  birth: number;
  /** Acaba la escena: la tarjeta. */
  end: number;
  /** Las señales y el agujero, como los eventos del ciclo (para los efectos, la música y los sonidos). */
  events: readonly TimelineEvent[];
  growth: HoleGrowth;
  absorption: Readonly<Record<SwallowedWorld, Span>>;
  fade: Span;
}

const shift = ([start, end]: Span, by: number): Span => [start + by, end + by];

export function collapseTimeline(data: CollapseData, via: HomeVia): CollapseTimeline {
  const arrivalEnd = data.arrival[via];
  const signalsStart = arrivalEnd + data.roam;
  const sceneStart = signalsStart + data.scene.start;
  const birth = sceneStart + data.hole.born;
  const end = sceneStart + data.scene.duration;
  return {
    via,
    arrivalEnd,
    signalsStart,
    sceneStart,
    birth,
    end,
    events: [
      ...data.events.map((event) => ({ ...event, t: event.t + signalsStart })),
      { id: HOLE_EVENT, t: birth, duration: end - birth },
    ],
    growth: { born: birth, end: birth + data.hole.grow, maxRadius: data.hole.radius },
    absorption: {
      hogar: shift(data.absorption.hogar, sceneStart),
      luna: shift(data.absorption.luna, sceneStart),
    },
    fade: shift(data.fade, sceneStart),
  };
}

export type CollapsePhase = 'arrival' | 'roam' | 'signals' | 'collapse' | 'card';

export function phaseAt(tl: CollapseTimeline, t: number): CollapsePhase {
  if (t < tl.arrivalEnd) return 'arrival';
  if (t < tl.signalsStart) return 'roam';
  if (t < tl.sceneStart) return 'signals';
  if (t < tl.end) return 'collapse';
  return 'card';
}

/** Si en esa fase manda el jugador (y el reloj corre con el juego) o una escena. */
export function isFree(phase: CollapsePhase): boolean {
  return phase === 'roam' || phase === 'signals';
}

/** El reloj del paseo: corre solo jugando y se para en la escena del colapso (que lleva el suyo). */
export function advanceFree(tl: CollapseTimeline, t: number, dt: number, running: boolean): number {
  if (!running || !(dt > 0) || !isFree(phaseAt(tl, t))) return t;
  return Math.min(t + dt, tl.sceneStart);
}

export interface CollapseView {
  phase: CollapsePhase;
  /** Los eventos en curso (ids). */
  events: string[];
  /** El radio del agujero (m); 0 si aún no ha nacido. */
  holeRadius: number;
  /** Cuánto se ha tragado de cada mundo (0–1). */
  absorbed: Record<SwallowedWorld, number>;
  /** Lo rojo que está el cielo (0–1). */
  red: number;
  /** El destello del pulso (0–1, sube y baja). */
  pulse: number;
  /** Lo encendida que está la Puerta Mayor (1) hasta que el agujero nace en su garganta (0). */
  gate: number;
}

const unit = (x: number): number => Math.min(1, Math.max(0, x));

function smooth(from: number, to: number, x: number): number {
  const k = unit((x - from) / (to - from));
  return k * k * (3 - 2 * k);
}

export function activeEvents(tl: CollapseTimeline, t: number): TimelineEvent[] {
  return tl.events.filter((event) => t >= event.t && t < event.t + event.duration);
}

export function collapseAt(tl: CollapseTimeline, t: number): CollapseView {
  const active = activeEvents(tl, t);
  const red = active.find((event) => event.id === 'cielo_rojo');
  const pulse = active.find((event) => event.id === 'pulso_cicatriz');
  return {
    phase: phaseAt(tl, t),
    events: active.map((event) => event.id),
    holeRadius: blackHoleRadius(t, tl.growth),
    absorbed: {
      hogar: absorptionProgress(tl.absorption.hogar, t),
      luna: absorptionProgress(tl.absorption.luna, t),
    },
    red: red ? unit((t - red.t) / RED_RAMP) : 0,
    pulse: pulse ? Math.sin(Math.PI * unit((t - pulse.t) / pulse.duration)) : 0,
    gate: 1 - smooth(tl.birth - GATE_LEAD, tl.birth + GATE_CLOSE, t),
  };
}
