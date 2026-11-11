// Coger, llevar y encajar (plan de historia y puzzles físicos, §6.1): las manos llevan un objeto a la vez, que sale
// de su estante, se encaja en un sitio libre y se puede volver a coger. Lógica pura y sin mutación: cada paso
// devuelve un estado nuevo (o el mismo, si no se puede). Todo vuelve a su estante al empezar el ciclo (D2).

/** Dónde está cada objeto: en su estante, en las manos, en un encaje (por su id) o suelto en un sitio (`loose:…`). */
export type CarryWhere = string;

export const RACK = 'rack';
export const HANDS = 'hands';

export interface CarryState {
  readonly ids: readonly string[];
  readonly where: Readonly<Record<string, CarryWhere>>;
}

export function createCarry(ids: readonly string[]): CarryState {
  return { ids, where: Object.fromEntries(ids.map((id) => [id, RACK])) };
}

export function carryWhere(state: CarryState, id: string): CarryWhere | undefined {
  return state.where[id];
}

/** Lo que llevan las manos, si algo. */
export function heldBy(state: CarryState): string | undefined {
  return state.ids.find((id) => state.where[id] === HANDS);
}

/** Lo que hay en un encaje, si algo. */
export function placedAt(state: CarryState, slot: string): string | undefined {
  return state.ids.find((id) => state.where[id] === slot);
}

function moved(state: CarryState, id: string, to: CarryWhere): CarryState {
  return { ...state, where: { ...state.where, [id]: to } };
}

/** Coge el siguiente objeto del estante (con las manos libres). */
export function takeFromRack(state: CarryState): CarryState {
  if (heldBy(state) !== undefined) return state;
  const next = state.ids.find((id) => state.where[id] === RACK);
  return next === undefined ? state : moved(state, next, HANDS);
}

/** Coge un objeto concreto de su estante (con las manos libres). */
export function takeObject(state: CarryState, id: string): CarryState {
  return heldBy(state) === undefined && state.where[id] === RACK ? moved(state, id, HANDS) : state;
}

/** Encaja lo que se lleva en un sitio libre que lo acepte. */
export function placeHeld(
  state: CarryState,
  slot: string,
  accepts: (slot: string, id: string) => boolean = () => true,
): CarryState {
  const held = heldBy(state);
  if (held === undefined || placedAt(state, slot) !== undefined || !accepts(slot, held)) {
    return state;
  }
  return moved(state, held, slot);
}

/** Vuelve a coger lo que hay en un encaje (con las manos libres). */
export function takeFromSlot(state: CarryState, slot: string): CarryState {
  const id = placedAt(state, slot);
  return id === undefined || heldBy(state) !== undefined ? state : moved(state, id, HANDS);
}

/** Ciclo nuevo: todo al estante. */
export function resetCarry(state: CarryState): CarryState {
  return createCarry(state.ids);
}

/** Un punto (m) o una dirección en el marco del mundo donde está el puzle. */
export type Vec3 = readonly [number, number, number];

/** Dónde se dejó un objeto: el punto de la superficie y hacia dónde mira (la normal, para que quede en pie). */
export interface LoosePose {
  readonly position: Vec3;
  readonly normal: Vec3;
}

const LOOSE_PREFIX = 'loose:';
/** Cuántos decimales se guardan (milímetros): el sitio va dentro de un texto, sin estado aparte. */
const LOOSE_DECIMALS = 3;

function encodeLoose(pose: LoosePose): CarryWhere {
  const numbers = [...pose.position, ...pose.normal].map((n) => n.toFixed(LOOSE_DECIMALS));
  return `${LOOSE_PREFIX}${numbers.join(',')}`;
}

/** El sitio donde está suelto un objeto, si `where` es uno; `undefined` si no. */
export function loosePoseOf(where: CarryWhere | undefined): LoosePose | undefined {
  if (!where?.startsWith(LOOSE_PREFIX)) return undefined;
  const numbers = where.slice(LOOSE_PREFIX.length).split(',').map(Number);
  if (numbers.length !== 6 || numbers.some((n) => !Number.isFinite(n))) return undefined;
  const [x, y, z, nx, ny, nz] = numbers as [number, number, number, number, number, number];
  return { position: [x, y, z], normal: [nx, ny, nz] };
}

/** Deja lo que se lleva en ese sitio (en el suelo, en una mesa…): ya no está en las manos ni en ningún encaje. */
export function dropHeld(state: CarryState, pose: LoosePose): CarryState {
  const held = heldBy(state);
  return held === undefined ? state : moved(state, held, encodeLoose(pose));
}

/** Los objetos que están sueltos y dónde. */
export function looseObjects(state: CarryState): { id: string; pose: LoosePose }[] {
  return state.ids.flatMap((id) => {
    const pose = loosePoseOf(state.where[id]);
    return pose ? [{ id, pose }] : [];
  });
}

/** Vuelve a coger un objeto suelto (con las manos libres). */
export function takeLoose(state: CarryState, id: string): CarryState {
  return heldBy(state) === undefined && loosePoseOf(state.where[id]) !== undefined
    ? moved(state, id, HANDS)
    : state;
}

/** Lo que un puzle ofrece para dejar y volver a coger cosas sueltas (game/looseCarry.ts lo usa sin conocer el puzle). */
export interface LooseAccess {
  held(): boolean;
  /** Deja lo que se lleva; false si las manos estaban vacías. */
  drop(pose: LoosePose): boolean;
  loose(): { id: string; pose: LoosePose }[];
  /** Coge ese objeto suelto; false si no se puede (manos ocupadas o no está suelto). */
  take(id: string): boolean;
}

/** Los accesos de un puzle a partir de cómo lee y cambia su estado de `carry`. */
export function looseAccess(get: () => CarryState, set: (next: CarryState) => void): LooseAccess {
  const apply = (next: CarryState): boolean => {
    const changed = next !== get();
    if (changed) set(next);
    return changed;
  };
  return {
    held: () => heldBy(get()) !== undefined,
    drop: (pose) => apply(dropHeld(get(), pose)),
    loose: () => looseObjects(get()),
    take: (id) => apply(takeLoose(get(), id)),
  };
}
