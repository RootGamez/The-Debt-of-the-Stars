// Un sistema: su estrella y la órbita de cada mundo. El ajeno, con la Brasa (src/data/sistema.json, plan de la
// Fase 5), y el de casa del prólogo, Hogar y su Luna (src/data/sistema-hogar.json, Fase 9). Son datos externos,
// así que se validan al cargar como la cronología, con mensajes en español.
import { WorldDataError } from '../worlds/markers';

/** Cómo es la estrella: define su aspecto (render/starModel.ts) y su luz. */
export type StarKind = 'solar' | 'enana_roja' | 'lejana';

export interface StarSpec {
  /** Radio de la estrella (m). Entrar en ella mata. */
  radius: number;
  kind: StarKind;
  /** Color de la superficie (el cuerpo que se ve) y de la luz que da (0xRRGGBB). */
  surfaceColor: number;
  lightColor: number;
  /** Intensidad de la luz de la estrella a la distancia de referencia. */
  intensity: number;
  /** Cuánto cae la luz con la distancia (0 = nada, 1 = como 1/d). Ver `render/sunFalloff.ts`. */
  falloff: number;
  /** Cuánta superficie cubren las manchas (0 a 1). */
  spots: number;
  /** Segundos por vuelta sobre su eje (0 = no gira). */
  spin: number;
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
  /** Mundo donde espera la nave (`"nave"`); `undefined` = este sistema no tiene nave. */
  ship: string | undefined;
  /** Si aquí corre el ciclo (`"bucle"`, sí por defecto): en casa, en el prólogo, no. */
  looping: boolean;
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

const STAR_KINDS: readonly StarKind[] = ['solar', 'enana_roja', 'lejana'];

/** Lo que trae cada tipo de estrella si el archivo no lo cambia. */
const STAR_PRESETS: Record<StarKind, Omit<StarSpec, 'radius' | 'kind'>> = {
  solar: {
    surfaceColor: 0xfff1c8,
    lightColor: 0xfff4e4,
    intensity: 2.4,
    falloff: 0,
    spots: 0.15,
    spin: 600,
  },
  enana_roja: {
    surfaceColor: 0xff4a1e,
    lightColor: 0xff9a5c,
    intensity: 2.6,
    falloff: 0,
    spots: 0.45,
    spin: 180,
  },
  lejana: {
    surfaceColor: 0xffe0b0,
    lightColor: 0xffd8a8,
    intensity: 1.6,
    falloff: 0,
    spots: 0.1,
    spin: 900,
  },
};

function optionalColor(value: unknown, what: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value))
    fail(`${what} debe ser un color "#rrggbb"`);
  return Number.parseInt(value.slice(1), 16);
}

function optionalRange(value: unknown, what: string, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  const number = finiteNumber(value, what);
  if (number < 0 || number > max) fail(`${what} debe estar entre 0 y ${String(max)}`);
  return number;
}

function parseStar(raw: Record<string, unknown>): StarSpec {
  const radius = finiteNumber(raw.radio, 'estrella.radio');
  if (radius <= 0) fail('estrella.radio debe ser mayor que 0');
  const kind = raw.tipo ?? 'solar';
  if (typeof kind !== 'string' || !(STAR_KINDS as readonly string[]).includes(kind))
    fail(`estrella.tipo debe ser uno de: ${STAR_KINDS.join(', ')}`);
  const preset = STAR_PRESETS[kind as StarKind];
  return {
    radius,
    kind: kind as StarKind,
    surfaceColor: optionalColor(
      raw.colorSuperficie,
      'estrella.colorSuperficie',
      preset.surfaceColor,
    ),
    lightColor: optionalColor(raw.colorLuz, 'estrella.colorLuz', preset.lightColor),
    intensity: optionalRange(raw.intensidad, 'estrella.intensidad', preset.intensity, 100),
    falloff: optionalRange(raw.caida, 'estrella.caida', preset.falloff, 2),
    spots: optionalRange(raw.manchas, 'estrella.manchas', preset.spots, 1),
    spin: optionalRange(raw.giro, 'estrella.giro', preset.spin, 1_000_000),
  };
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
  const star = parseStar(raw.estrella);
  const radius = star.radius;
  if (!Array.isArray(raw.cuerpos)) fail('"cuerpos" debe ser una lista');
  const bodies = raw.cuerpos.map((body: unknown) => parseBody(body, radius, knownWorlds));
  const byWorld = new Map<string, BodySpec>();
  for (const body of bodies) {
    if (byWorld.has(body.world)) fail(`mundo repetido: ${body.world}`);
    byWorld.set(body.world, body);
  }
  if (raw.bucle !== undefined && typeof raw.bucle !== 'boolean')
    fail('"bucle" debe ser true o false');
  return {
    star,
    bodies,
    bodyOf: (world) => byWorld.get(world),
    ship: parseShip(raw.nave, byWorld),
    looping: raw.bucle !== false,
  };
}

function parseShip(raw: unknown, bodies: ReadonlyMap<string, BodySpec>): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !bodies.has(raw))
    fail('"nave" debe ser uno de los mundos del sistema');
  return raw;
}
