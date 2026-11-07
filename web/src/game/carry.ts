// Coger, llevar y encajar (plan de historia y puzzles físicos, §6.1): las manos llevan un objeto a la vez, que sale
// de su estante, se encaja en un sitio libre y se puede volver a coger. Lógica pura y sin mutación: cada paso
// devuelve un estado nuevo (o el mismo, si no se puede). Todo vuelve a su estante al empezar el ciclo (D2).

/** Dónde está cada objeto: en su estante, en las manos o en un encaje (por su id). */
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
