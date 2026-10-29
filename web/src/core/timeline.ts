// Cronología del ciclo: eventos con inicio y duración en el reloj de Umbral, ventanas de absorción
// por mundo y curvas de ritmo de reloj. Viene de src/data/cronologia.json (❓ "hasta probarlo" en
// CONTEXTO_HISTORIA.md §8), así que se valida al cargar como cualquier dato externo.
import { WorldDataError } from '../worlds/markers';
import type { RateCurve } from './clockRates';

export interface TimelineEvent {
  id: string;
  /** Inicio en segundos del reloj de Umbral. */
  t: number;
  duration: number;
  /** Si existe, el evento solo ocurre (o solo se ve) en ese mundo. */
  world?: string;
}

export interface Chronology {
  duration: number;
  events: TimelineEvent[];
  absorption: Record<string, readonly [number, number]>;
  clocks: Record<string, RateCurve>;
}

export interface EventChange {
  event: TimelineEvent;
  kind: 'start' | 'end';
  /** Momento del cambio (inicio o fin del evento). */
  at: number;
}

function fail(message: string): never {
  throw new WorldDataError(`cronología: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${what} debe ser un número`);
  return value;
}

function parseEvent(raw: unknown, duration: number): TimelineEvent {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.length === 0) {
    fail('cada evento necesita un "id" de texto');
  }
  const id = raw.id;
  const t = finiteNumber(raw.t, `${id}.t`);
  const length = finiteNumber(raw.duracion, `${id}.duracion`);
  if (t < 0 || t > duration || length < 0) fail(`${id} está fuera del ciclo (0..${duration})`);
  if (raw.mundo !== undefined && typeof raw.mundo !== 'string') fail(`${id}.mundo debe ser texto`);
  return raw.mundo === undefined
    ? { id, t, duration: length }
    : { id, t, duration: length, world: raw.mundo };
}

function parseWindow(world: string, raw: unknown, duration: number): readonly [number, number] {
  if (!Array.isArray(raw) || raw.length !== 2) fail(`absorcion.${world} debe ser [inicio, fin]`);
  const start = finiteNumber(raw[0], `absorcion.${world}`);
  const end = finiteNumber(raw[1], `absorcion.${world}`);
  if (end < start) fail(`absorcion.${world} termina antes de empezar`);
  if (start < 0 || end > duration) fail(`absorcion.${world} está fuera del ciclo (0..${duration})`);
  return [start, end];
}

/** Con la lista de mundos conocidos, un nombre mal escrito es un error y no un efecto que falta. */
function checkWorld(world: string, where: string, knownWorlds?: readonly string[]): void {
  if (knownWorlds && !knownWorlds.includes(world)) fail(`${where}: mundo desconocido "${world}"`);
}

function parseCurve(world: string, raw: unknown): RateCurve {
  if (!Array.isArray(raw) || raw.length === 0)
    fail(`relojes.${world} debe ser una lista de [t, ritmo]`);
  let previous = -Infinity;
  return raw.map((point: unknown) => {
    if (!Array.isArray(point) || point.length !== 2) fail(`relojes.${world}: punto mal formado`);
    const t = finiteNumber(point[0], `relojes.${world}`);
    const rate = finiteNumber(point[1], `relojes.${world}`);
    if (rate <= 0) fail(`relojes.${world}: el ritmo debe ser mayor que 0`);
    if (t <= previous) fail(`relojes.${world}: los puntos deben ir en orden de tiempo`);
    previous = t;
    return [t, rate] as const;
  });
}

export function parseChronology(raw: unknown, knownWorlds?: readonly string[]): Chronology {
  if (!isRecord(raw)) fail('el archivo no es un objeto');
  const duration = finiteNumber(raw.duracion, 'duracion');
  if (duration <= 0) fail('duracion debe ser mayor que 0');
  if (!Array.isArray(raw.eventos)) fail('"eventos" debe ser una lista');
  const events = raw.eventos.map((e: unknown) => parseEvent(e, duration));
  const ids = new Set<string>();
  for (const { id, world } of events) {
    if (ids.has(id)) fail(`evento repetido: ${id}`);
    ids.add(id);
    if (world !== undefined) checkWorld(world, id, knownWorlds);
  }
  const absorption: Record<string, readonly [number, number]> = {};
  if (isRecord(raw.absorcion)) {
    for (const [world, window] of Object.entries(raw.absorcion)) {
      checkWorld(world, 'absorcion', knownWorlds);
      absorption[world] = parseWindow(world, window, duration);
    }
  }
  const clocks: Record<string, RateCurve> = {};
  if (isRecord(raw.relojes)) {
    for (const [world, curve] of Object.entries(raw.relojes)) {
      checkWorld(world, 'relojes', knownWorlds);
      clocks[world] = parseCurve(world, curve);
    }
  }
  return { duration, events, absorption, clocks };
}

function appliesTo(event: TimelineEvent, worldId: string | undefined): boolean {
  return event.world === undefined || event.world === worldId;
}

/**
 * Cambios (inicios y finales) en el intervalo [from, to) del reloj de Umbral, en orden de tiempo.
 * Los intervalos consecutivos no repiten cambios y un salto largo no pierde ninguno.
 */
export function eventsBetween(
  events: readonly TimelineEvent[],
  from: number,
  to: number,
  worldId: string | undefined,
): EventChange[] {
  const changes: EventChange[] = [];
  for (const event of events) {
    if (!appliesTo(event, worldId)) continue;
    const end = event.t + event.duration;
    if (event.t >= from && event.t < to) changes.push({ event, kind: 'start', at: event.t });
    if (end >= from && end < to) changes.push({ event, kind: 'end', at: end });
  }
  return changes.sort((a, b) => a.at - b.at || (a.kind === 'start' ? -1 : 1));
}

/**
 * Eventos en curso en el instante `t` (para restaurar el estado visual tras un salto de tiempo).
 * En el espacio abierto (`worldId` indefinido) solo cuentan los eventos que no son de un mundo.
 */
export function activeAt(
  events: readonly TimelineEvent[],
  t: number,
  worldId: string | undefined,
): TimelineEvent[] {
  return events.filter((e) => appliesTo(e, worldId) && t >= e.t && t < e.t + e.duration);
}

/** Las marcas TRIG_ con `loop_time` también son eventos de la cronología de su mundo. */
export function triggersAsEvents(
  triggers: readonly {
    event: string;
    loopTime: number | undefined;
    duration: number | undefined;
  }[],
  worldId: string,
): TimelineEvent[] {
  return triggers.flatMap((trigger) =>
    trigger.loopTime === undefined
      ? []
      : [
          {
            id: trigger.event,
            t: trigger.loopTime,
            duration: trigger.duration ?? 0,
            world: worldId,
          },
        ],
  );
}

/** Una cronología sin nada: en casa, en el prólogo, no hay eventos, absorciones ni relojes que cambien. */
export function quietChronology(duration = 900): Chronology {
  return { duration, events: [], absorption: {}, clocks: {} };
}

export function absorptionWindow(
  chronology: Chronology,
  worldId: string,
): readonly [number, number] | undefined {
  return chronology.absorption[worldId];
}

/** Copia de la cronología con todos los tiempos escalados a una duración nueva (pruebas rápidas). */
export function scaleChronology(chronology: Chronology, duration: number): Chronology {
  const k = duration / chronology.duration;
  const absorption: Record<string, readonly [number, number]> = {};
  for (const [world, [start, end]] of Object.entries(chronology.absorption)) {
    absorption[world] = [start * k, end * k];
  }
  const clocks: Record<string, RateCurve> = {};
  for (const [world, curve] of Object.entries(chronology.clocks)) {
    clocks[world] = curve.map(([t, rate]) => [t * k, rate] as const);
  }
  return {
    duration,
    events: chronology.events.map((e) => ({ ...e, t: e.t * k, duration: e.duration * k })),
    absorption,
    clocks,
  };
}

/** Duración de prueba `?ciclo=<s>`; solo con `?debug` y entre 10 s y 1 h. */
export function cycleLengthFromQuery(search: string): number | undefined {
  const params = new URLSearchParams(search);
  if (!params.has('debug')) return undefined;
  const seconds = Number(params.get('ciclo'));
  return Number.isFinite(seconds) && seconds >= 10 && seconds <= 3600 ? seconds : undefined;
}
