// Lee las marcas de juego que vienen de Blender dentro del glTF de un mundo.
// Convención (ver CLAUDE.md): COL_ colisión, INT_ interacción, SPAWN_ aparición del jugador,
// PARK_ dónde espera la nave al empezar cada ciclo, TRIG_ evento, EVT_ algo que solo se ve durante un
// evento de la cronología (por ejemplo, el haz de la ranura del Archivo), ANIM_ pieza que gira, PASO_
// anillo de una Puerta plegada (se cruza uno y se sale por su gemelo; con `cerradura`, solo cuando el juego lo
// abre) y OOL_<quién> un Ool (Fase 9), con lo que
// brilla en su hijo OOL_<quién>_Luz.
// Las propiedades personalizadas de Blender llegan como userData (export_extras).
import { Vector3, type Mesh, type Object3D } from 'three';
import type { CavityHole } from '../physics/cavityThroat';

export const INTERACTION_KINDS = ['texto', 'grabacion', 'objeto', 'observacion', 'charla'] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

/** Sufijo del hijo de un Ool con lo que brilla (sus filamentos). */
const GLOW_SUFFIX = '_Luz';

// Mismo valor que el tamaño por defecto de los TRIG_ en blender/scripts/marcas.py.
const DEFAULT_TRIGGER_RADIUS = 5;

export interface WorldInfo {
  id: string;
  radius: number;
  gravity: number;
  clockRate: number;
  /** Luz ambiente propia del mundo (propiedades `ambient` y `ambient_color` de la raíz), si la tiene. */
  ambient?: { color: number; intensity: number } | undefined;
  /**
   * Mundos huecos (el Nudo): radio de la cara interior (propiedad `inner_radius`). Dentro de la cavidad
   * la gravedad empuja hacia fuera y se camina por dentro de la esfera.
   */
  innerRadius?: number | undefined;
  /**
   * Mundos huecos: radio bajo el que la gravedad empuja hacia fuera (`cavity_limit`, entre `inner_radius` y
   * `radius`). Sin él, a mitad de la cáscara (el Nudo). Cicatriz lo pone justo bajo su cara interior: sus cuencos
   * llegan hasta ahí y su fondo tiene que seguir tirando hacia el centro.
   */
  cavityLimit?: number | undefined;
  /** Qué marea llena la cavidad (`cavity_tide`): la semilla del Nudo o el micro agujero del núcleo de Cicatriz. */
  cavityTide?: CavityTide | undefined;
  /** Agujeros de la cáscara (`cavity_holes`: eje x, y, z y radio angular en radianes, de cuatro en cuatro). */
  cavityHoles?: CavityHole[] | undefined;
  /** Luz de dentro de la cavidad, que sustituye a la de la Brasa (`interior_light` y `interior_light_color`). */
  interiorLight?: { color: number; intensity: number } | undefined;
  /**
   * Mundos con mar (el Archivo, Fase 11E): radio de la superficie del agua (`sea_level`) y, si lo hay, el tubo
   * seco alrededor del ecuador (`dry_ring_major` y `dry_ring_minor`: ver physics/water.ts) y el oleaje: su altura
   * máxima (`sea_wave_height`, m) y la semilla de sus direcciones (`sea_wave_seed`; ver physics/waves.ts).
   */
  sea?:
    | {
        level: number;
        dry?: { major: number; minor: number };
        waves?: { height: number; seed: number };
      }
    | undefined;
  /**
   * Gigantes de gas (el Taller, Fase 11F): bajo `gas_lethal_radius` las nubes matan, salvo dentro de
   * `gas_safe_radius` (la sala del centro, a la que solo se llega por el teletransportador).
   */
  gas?: { lethal: number; safe: number } | undefined;
}

export const CAVITY_TIDES = ['semilla', 'nucleo'] as const;
export type CavityTide = (typeof CAVITY_TIDES)[number];

export interface InteractionMarker {
  name: string;
  object: Object3D;
  clueId: string;
  kind: InteractionKind;
}

export interface TriggerMarker {
  name: string;
  object: Object3D;
  event: string;
  radius: number;
  loopTime: number | undefined;
  duration: number | undefined;
}

export interface WorldMarkers {
  colliders: Mesh[];
  /** Colisiones que solo existen mientras dura su evento (COL_ con propiedad `event`: los puentes de luz). */
  eventColliders: EventCollider[];
  interactions: InteractionMarker[];
  spawns: Map<string, Object3D>;
  /** Dónde espera la nave al empezar cada ciclo (PARK_). */
  parks: Map<string, Object3D>;
  triggers: TriggerMarker[];
  /** Objetos que solo se ven mientras dura su evento (EVT_, propiedad `event`); empiezan ocultos. */
  eventProps: EventProp[];
  /** Piezas que giran sobre su eje vertical (ANIM_, propiedad `spin` en rad/s; con `event`, solo entonces). */
  animated: AnimatedPart[];
  /** Puertas plegadas (PASO_, propiedad `destino` = el anillo gemelo): se cruza una y se sale por la otra. */
  gates: GateMarker[];
  /** Los Ool del mundo (OOL_<quién>), con la malla de lo que brilla si la tienen. */
  characters: CharacterMarker[];
}

export interface CharacterMarker {
  id: string;
  object: Object3D;
  glow: Mesh | undefined;
}

export interface GateMarker {
  name: string;
  object: Object3D;
  target: string;
  /** Si el anillo está cerrado salvo que el juego lo abra (propiedad `cerradura`), qué lo abre. */
  lock: string | undefined;
}

export interface EventCollider {
  event: string;
  mesh: Mesh;
}

export interface AnimatedPart {
  object: Object3D;
  spin: number;
  event: string | undefined;
}

export interface EventProp {
  event: string;
  object: Object3D;
}

/** Datos del mundo mal formados (error del contenido exportado, no del código). */
export class WorldDataError extends Error {
  override name = 'WorldDataError';
}

type Range = 'positive' | 'nonNegative';

function requireNumber(object: Object3D, key: string, range: Range): number {
  const value: unknown = object.userData[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WorldDataError(
      `${object.name}: "${key}" debe ser un número (recibido ${String(value)})`,
    );
  }
  const valid = range === 'positive' ? value > 0 : value >= 0;
  if (!valid) {
    const rule = range === 'positive' ? 'mayor que 0' : 'mayor o igual que 0';
    throw new WorldDataError(`${object.name}: "${key}" debe ser ${rule} (recibido ${value})`);
  }
  return value;
}

function optionalNumber(object: Object3D, key: string, range: Range): number | undefined {
  return object.userData[key] === undefined ? undefined : requireNumber(object, key, range);
}

function requireString(object: Object3D, key: string): string {
  const value: unknown = object.userData[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new WorldDataError(`${object.name}: falta "${key}" (texto)`);
  }
  return value;
}

function requireSpin(object: Object3D): number {
  const value: unknown = object.userData.spin;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WorldDataError(`${object.name}: "spin" debe ser un número (rad/s)`);
  }
  return value;
}

function isInteractionKind(value: string): value is InteractionKind {
  return (INTERACTION_KINDS as readonly string[]).includes(value);
}

export function isMesh(object: Object3D): object is Mesh {
  return 'isMesh' in object && object.isMesh === true;
}

export function readWorldInfo(scene: Object3D, worldId: string): WorldInfo {
  const root = scene.getObjectByName(worldId);
  if (!root) {
    throw new WorldDataError(`No existe el objeto raíz del mundo "${worldId}"`);
  }
  const radius = requireNumber(root, 'radius', 'positive');
  const innerRadius = optionalNumber(root, 'inner_radius', 'positive');
  if (innerRadius !== undefined && innerRadius >= radius) {
    throw new WorldDataError(
      `${root.name}: "inner_radius" (${innerRadius}) debe ser menor que "radius" (${radius})`,
    );
  }
  return {
    id: worldId,
    radius,
    gravity: requireNumber(root, 'gravity', 'positive'),
    clockRate: requireNumber(root, 'clock_rate', 'positive'),
    ambient: readLight(root, 'ambient'),
    innerRadius,
    ...(innerRadius !== undefined && readCavity(root, innerRadius, radius)),
    interiorLight: innerRadius === undefined ? undefined : readLight(root, 'interior_light'),
    sea: readSea(root),
    gas: readGas(root),
  };
}

function readCavity(
  root: Object3D,
  innerRadius: number,
  radius: number,
): Pick<WorldInfo, 'cavityLimit' | 'cavityTide' | 'cavityHoles'> {
  const limit = optionalNumber(root, 'cavity_limit', 'positive');
  if (limit !== undefined && (limit <= innerRadius || limit >= radius)) {
    throw new WorldDataError(
      `${root.name}: "cavity_limit" (${limit}) debe estar entre "inner_radius" (${innerRadius}) y "radius" (${radius})`,
    );
  }
  const tide: unknown = root.userData.cavity_tide ?? 'semilla';
  if (typeof tide !== 'string' || !isCavityTide(tide)) {
    throw new WorldDataError(
      `${root.name}: "cavity_tide" debe ser ${CAVITY_TIDES.join(' o ')} (recibido ${String(tide)})`,
    );
  }
  return { cavityLimit: limit, cavityTide: tide, cavityHoles: readHoles(root) };
}

function readHoles(root: Object3D): CavityHole[] | undefined {
  const raw: unknown = root.userData.cavity_holes;
  if (raw === undefined) return undefined;
  const values: unknown[] = Array.isArray(raw) ? (raw as unknown[]) : [];
  const numbers = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!Array.isArray(raw) || numbers.length !== values.length || numbers.length % 4 !== 0) {
    throw new WorldDataError(
      `${root.name}: "cavity_holes" debe ser una lista de números de cuatro en cuatro (eje y ángulo)`,
    );
  }
  const holes: CavityHole[] = [];
  for (let i = 0; i < numbers.length; i += 4) {
    const [x = 0, y = 0, z = 0, angle = 0] = numbers.slice(i, i + 4);
    const axis = new Vector3(x, y, z);
    if (axis.lengthSq() < 1e-9 || angle <= 0 || angle >= Math.PI / 2) {
      throw new WorldDataError(`${root.name}: agujero ${i / 4} de "cavity_holes" no válido`);
    }
    holes.push({ axis: axis.normalize(), angle });
  }
  return holes;
}

function isCavityTide(value: string): value is CavityTide {
  return (CAVITY_TIDES as readonly string[]).includes(value);
}

function readGas(root: Object3D): WorldInfo['gas'] {
  const lethal = optionalNumber(root, 'gas_lethal_radius', 'positive');
  if (lethal === undefined) return undefined;
  const safe = requireNumber(root, 'gas_safe_radius', 'nonNegative');
  if (safe >= lethal) {
    throw new WorldDataError(
      `${root.name}: "gas_safe_radius" (${safe}) debe ser menor que "gas_lethal_radius" (${lethal})`,
    );
  }
  return { lethal, safe };
}

function readSea(root: Object3D): WorldInfo['sea'] {
  const level = optionalNumber(root, 'sea_level', 'positive');
  if (level === undefined) return undefined;
  const major = optionalNumber(root, 'dry_ring_major', 'positive');
  const height = optionalNumber(root, 'sea_wave_height', 'positive');
  return {
    level,
    ...(major !== undefined && {
      dry: { major, minor: requireNumber(root, 'dry_ring_minor', 'positive') },
    }),
    ...(height !== undefined && {
      waves: { height, seed: optionalNumber(root, 'sea_wave_seed', 'positive') ?? 1 },
    }),
  };
}

/** Una luz de la raíz: intensidad en `key` y color #rrggbb en `key_color` (opcional las dos juntas). */
function readLight(root: Object3D, key: string): { color: number; intensity: number } | undefined {
  const intensity = optionalNumber(root, key, 'positive');
  if (intensity === undefined) return undefined;
  const color = requireString(root, `${key}_color`);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new WorldDataError(`${root.name}: "${key}_color" debe ser #rrggbb (recibido ${color})`);
  }
  return { color: Number.parseInt(color.slice(1), 16), intensity };
}

function readInteraction(object: Object3D): InteractionMarker {
  const kind = requireString(object, 'kind');
  if (!isInteractionKind(kind)) {
    throw new WorldDataError(
      `${object.name}: "kind" debe ser ${INTERACTION_KINDS.join(', ')} (recibido ${kind})`,
    );
  }
  return { name: object.name, object, clueId: requireString(object, 'clue_id'), kind };
}

function readTrigger(object: Object3D): TriggerMarker {
  return {
    name: object.name,
    object,
    event: requireString(object, 'event'),
    radius: optionalNumber(object, 'radius', 'positive') ?? DEFAULT_TRIGGER_RADIUS,
    loopTime: optionalNumber(object, 'loop_time', 'nonNegative'),
    duration: optionalNumber(object, 'duration', 'positive'),
  };
}

function collectColliders(object: Object3D, colliders: Mesh[]): void {
  object.visible = false;
  object.traverse((child) => {
    if (!isMesh(child)) return;
    child.visible = false;
    colliders.push(child);
  });
}

export function collectMarkers(scene: Object3D): WorldMarkers {
  const markers: WorldMarkers = {
    colliders: [],
    eventColliders: [],
    interactions: [],
    spawns: new Map(),
    parks: new Map(),
    triggers: [],
    eventProps: [],
    animated: [],
    gates: [],
    characters: [],
  };
  const colliderRoots: Object3D[] = [];

  scene.traverse((object) => {
    const { name } = object;
    if (name.startsWith('COL_')) {
      colliderRoots.push(object);
    } else if (name.startsWith('INT_')) {
      markers.interactions.push(readInteraction(object));
    } else if (name.startsWith('TRIG_')) {
      markers.triggers.push(readTrigger(object));
    } else if (name.startsWith('SPAWN_')) {
      // Los nombres son únicos: Blender no permite repetirlos y GLTFLoader los desambigua.
      markers.spawns.set(name, object);
    } else if (name.startsWith('PARK_')) {
      markers.parks.set(name, object);
    } else if (name.startsWith('ANIM_')) {
      const event: unknown = object.userData.event;
      markers.animated.push({
        object,
        spin: requireSpin(object),
        event: event === undefined ? undefined : requireString(object, 'event'),
      });
    } else if (name.startsWith('EVT_')) {
      markers.eventProps.push({ event: requireString(object, 'event'), object });
      object.visible = false;
    } else if (name.startsWith('PASO_')) {
      const lock: unknown = object.userData.cerradura;
      markers.gates.push({
        name,
        object,
        target: requireString(object, 'destino'),
        lock: lock === undefined ? undefined : requireString(object, 'cerradura'),
      });
    } else if (name.startsWith('OOL_') && !name.endsWith(GLOW_SUFFIX)) {
      const glow = object.getObjectByName(`${name}${GLOW_SUFFIX}`);
      markers.characters.push({
        id: name.slice('OOL_'.length),
        object,
        glow: glow && isMesh(glow) ? glow : undefined,
      });
    }
  });
  const gateNames = new Set(markers.gates.map((g) => g.name));
  for (const gate of markers.gates) {
    if (!gateNames.has(gate.target) || gate.target === gate.name) {
      throw new WorldDataError(
        `${gate.name}: "destino" debe ser otro anillo PASO_ del mismo mundo (recibido ${gate.target})`,
      );
    }
  }

  // Solo las raíces COL_ (un grupo COL_ incluye a sus hijos COL_).
  for (const root of colliderRoots) {
    const nestedInOther = colliderRoots.some((other) => other !== root && isAncestor(other, root));
    if (nestedInOther) continue;
    const event: unknown = root.userData.event;
    if (event === undefined) {
      collectColliders(root, markers.colliders);
      continue;
    }
    const name = requireString(root, 'event');
    const meshes: Mesh[] = [];
    collectColliders(root, meshes);
    for (const mesh of meshes) markers.eventColliders.push({ event: name, mesh });
  }
  return markers;
}

function isAncestor(ancestor: Object3D, object: Object3D): boolean {
  for (let p = object.parent; p; p = p.parent) {
    if (p === ancestor) return true;
  }
  return false;
}
