// El sistema ajeno: la Brasa y la órbita de cada mundo (src/data/sistema.json, plan de la Fase 5). Son
// datos externos, así que se validan al cargar como la cronología, con mensajes en español.
import { WorldDataError } from '../worlds/markers';

export interface StarSpec {
  /** Radio de la Brasa (m). Entrar en ella mata. */
  radius: number;
}

export interface BodySpec {
  world: string;
  /** Distancia a la Brasa (m); órbita circular en el plano XZ. */
  orbitRadius: number;
  /** Segundos de una vuelta completa; 0 = el mundo está quieto. */
  period: number;
  /** Ángulo de la órbita al empezar el ciclo (rad). */
  phase: number;
  /** 'locked' = siempre la misma cara a la Brasa; un número = segundos por giro (0 = no gira). */
  spin: 'locked' | number;
  /** Ángulo de giro al empezar el ciclo, o respecto a la órbita si está bloqueado (rad). */
  spinPhase: number;
  /** Oculto (el Nudo, `"oculto": true`): la nave no lo ofrece como objetivo hasta tenerlo cerca. */
  hidden: boolean;
}

export interface SystemSpec {
  star: StarSpec;
  bodies: readonly BodySpec[];
  bodyOf(world: string): BodySpec | undefined;
}

function fail(message: string): never {
  throw new WorldDataError(`sistema: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${what} debe ser un número`);
  return value;
}

function optionalNumber(value: unknown, what: string): number {
  return value === undefined ? 0 : finiteNumber(value, what);
}

function parseSpin(world: string, raw: unknown): 'locked' | number {
  if (raw === 'bloqueada') return 'locked';
  const spin = finiteNumber(raw, `${world}.rotacion ("bloqueada" o segundos)`);
  if (spin < 0) fail(`${world}.rotacion no puede ser negativa`);
  return spin;
}

function parseBody(raw: unknown, starRadius: number, knownWorlds: readonly string[]): BodySpec {
  if (!isRecord(raw) || typeof raw.mundo !== 'string')
    fail('cada cuerpo necesita un "mundo" de texto');
  const world = raw.mundo;
  if (!knownWorlds.includes(world)) fail(`mundo desconocido "${world}"`);
  const orbitRadius = finiteNumber(raw.orbita, `${world}.orbita`);
  if (orbitRadius <= 0) fail(`${world}.orbita debe ser mayor que 0`);
  if (orbitRadius <= starRadius) fail(`${world} orbita dentro de la Brasa`);
  const period = finiteNumber(raw.periodo, `${world}.periodo`);
  if (period < 0) fail(`${world}.periodo no puede ser negativo`);
  if (raw.oculto !== undefined && typeof raw.oculto !== 'boolean')
    fail(`${world}.oculto debe ser true o false`);
  return {
    hidden: raw.oculto === true,
    world,
    orbitRadius,
    period,
    phase: optionalNumber(raw.fase, `${world}.fase`),
    spin: parseSpin(world, raw.rotacion),
    spinPhase: optionalNumber(raw.faseRotacion, `${world}.faseRotacion`),
  };
}

export function parseSystem(raw: unknown, knownWorlds: readonly string[]): SystemSpec {
  if (!isRecord(raw)) fail('el archivo no es un objeto');
  if (!isRecord(raw.estrella)) fail('falta "estrella"');
  const radius = finiteNumber(raw.estrella.radio, 'estrella.radio');
  if (radius <= 0) fail('estrella.radio debe ser mayor que 0');
  if (!Array.isArray(raw.cuerpos)) fail('"cuerpos" debe ser una lista');
  const bodies = raw.cuerpos.map((body: unknown) => parseBody(body, radius, knownWorlds));
  const byWorld = new Map<string, BodySpec>();
  for (const body of bodies) {
    if (byWorld.has(body.world)) fail(`mundo repetido: ${body.world}`);
    byWorld.set(body.world, body);
  }
  return { star: { radius }, bodies, bodyOf: (world) => byWorld.get(world) };
}
