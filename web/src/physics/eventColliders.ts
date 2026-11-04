// Colisiones que solo existen mientras dura un evento de la cronología (COL_ con `event`): los puentes de luz
// que unen las islas del Taller a las 7:00. Se suman a las del mundo como el obstáculo de la nave posada
// (obstacles.ts): primero el terreno y luego, desde donde este deja la cápsula, cada puente encendido.
import { Vector3 } from 'three';
import {
  clearContact,
  considerFloor,
  createCapsule,
  createContact,
  type Capsule,
  type CollisionWorld,
  type Contact,
  type RaycastWorld,
} from './collisionWorld';

export interface EventCollision {
  event: string;
  world: CollisionWorld & RaycastWorld;
}

const shifted: Capsule = createCapsule(0);
const part: Contact = createContact();
const floorNormal = new Vector3();

/** `activeEvents()` se consulta en cada llamada (los eventos de la cronología que están ocurriendo). */
export function withEventColliders<W extends CollisionWorld & RaycastWorld>(
  world: W,
  extras: readonly EventCollision[],
  activeEvents: () => readonly string[],
): W {
  if (extras.length === 0) return world;
  const lit = (): EventCollision[] => {
    const active = activeEvents();
    return extras.filter((extra) => active.includes(extra.event));
  };
  const resolve = (capsule: Capsule, up: Vector3, contact: Contact): boolean => {
    let hit = world.resolve(capsule, up, contact);
    const on = lit();
    if (on.length === 0) return hit;
    shifted.radius = capsule.radius;
    let floorDot = contact.floorDot;
    floorNormal.copy(contact.floorNormal);
    for (const extra of on) {
      shifted.start.copy(capsule.start).add(contact.correction);
      shifted.end.copy(capsule.end).add(contact.correction);
      if (!extra.world.resolve(shifted, up, clearContact(part))) continue;
      hit = true;
      contact.correction.add(part.correction);
      if (part.floorDot > floorDot) {
        floorDot = part.floorDot;
        floorNormal.copy(part.floorNormal);
      }
    }
    contact.floorDot = -Infinity;
    if (floorDot > -Infinity) considerFloor(contact, floorNormal, up);
    return hit;
  };
  const raycast = (origin: Vector3, direction: Vector3, maxDistance: number): number | null => {
    let best = world.raycast(origin, direction, maxDistance);
    for (const extra of lit()) {
      const d = extra.world.raycast(origin, direction, best ?? maxDistance);
      if (d !== null && (best === null || d < best)) best = d;
    }
    return best;
  };
  return { ...world, resolve, raycast };
}
