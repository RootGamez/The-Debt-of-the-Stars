// Lee las marcas de juego que vienen de Blender dentro del glTF de un mundo.
// Convención (ver CLAUDE.md): COL_ colisión, INT_ interacción, SPAWN_ aparición del jugador,
// PARK_ dónde espera la nave al empezar cada ciclo, TRIG_ evento, EVT_ algo que solo se ve durante un
// evento de la cronología (por ejemplo, el haz de la ranura del Archivo), ANIM_ pieza que gira.
// Las propiedades personalizadas de Blender llegan como userData (export_extras).
import type { Mesh, Object3D } from 'three';

export const INTERACTION_KINDS = ['texto', 'grabacion', 'objeto', 'observacion'] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

// Mismo valor que el tamaño por defecto de los TRIG_ en blender/scripts/marcas.py.
const DEFAULT_TRIGGER_RADIUS = 5;

export interface WorldInfo {
  id: string;
  radius: number;
  gravity: number;
  clockRate: number;
  /** Luz ambiente propia del mundo (propiedades `ambient` y `ambient_color` de la raíz), si la tiene. */
  ambient?: { color: number; intensity: number } | undefined;
}

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
  interactions: InteractionMarker[];
  spawns: Map<string, Object3D>;
  /** Dónde espera la nave al empezar cada ciclo (PARK_). */
  parks: Map<string, Object3D>;
  triggers: TriggerMarker[];
  /** Objetos que solo se ven mientras dura su evento (EVT_, propiedad `event`); empiezan ocultos. */
  eventProps: EventProp[];
  /** Piezas que giran sobre su eje vertical (ANIM_, propiedad `spin` en rad/s; con `event`, solo entonces). */
  animated: AnimatedPart[];
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
  return {
    id: worldId,
    radius: requireNumber(root, 'radius', 'positive'),
    gravity: requireNumber(root, 'gravity', 'positive'),
    clockRate: requireNumber(root, 'clock_rate', 'positive'),
    ambient: readAmbient(root),
  };
}

function readAmbient(root: Object3D): WorldInfo['ambient'] {
  const intensity = optionalNumber(root, 'ambient', 'positive');
  if (intensity === undefined) return undefined;
  const color = requireString(root, 'ambient_color');
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new WorldDataError(`${root.name}: "ambient_color" debe ser #rrggbb (recibido ${color})`);
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
    interactions: [],
    spawns: new Map(),
    parks: new Map(),
    triggers: [],
    eventProps: [],
    animated: [],
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
    }
  });

  // Solo las raíces COL_ (un grupo COL_ incluye a sus hijos COL_).
  for (const root of colliderRoots) {
    const nestedInOther = colliderRoots.some((other) => other !== root && isAncestor(other, root));
    if (!nestedInOther) collectColliders(root, markers.colliders);
  }
  return markers;
}

function isAncestor(ancestor: Object3D, object: Object3D): boolean {
  for (let p = object.parent; p; p = p.parent) {
    if (p === ancestor) return true;
  }
  return false;
}
