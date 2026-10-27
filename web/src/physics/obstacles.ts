// Añade un obstáculo esférico (la nave posada) a las colisiones de un mundo: el jugador a pie choca con
// ella en vez de atravesarla, y puede subirse encima. Los rayos (aparición, lectura) siguen siendo solo
// los del terreno.
import { Vector3 } from 'three';
import {
  clearContact,
  considerFloor,
  createCapsule,
  createContact,
  type Capsule,
  type CollisionWorld,
  type Contact,
} from './collisionWorld';

export interface SphereObstacle {
  center: Vector3;
  radius: number;
}

const shifted: Capsule = createCapsule(0);
const terrain: Contact = createContact();
const segment = new Vector3();
const offset = new Vector3();
const closest = new Vector3();
const normal = new Vector3();

function closestOnSegment(capsule: Capsule, point: Vector3, target: Vector3): Vector3 {
  segment.subVectors(capsule.end, capsule.start);
  const lengthSq = segment.lengthSq();
  const t =
    lengthSq === 0
      ? 0
      : Math.min(1, Math.max(0, offset.subVectors(point, capsule.start).dot(segment) / lengthSq));
  return target.copy(capsule.start).addScaledVector(segment, t);
}

/** `obstacle()` se consulta en cada llamada: devuelve `undefined` cuando no hay obstáculo. */
export function withSphereObstacle<W extends CollisionWorld>(
  world: W,
  obstacle: () => SphereObstacle | undefined,
): W & CollisionWorld {
  const resolve = (capsule: Capsule, up: Vector3, contact: Contact): boolean => {
    const hitTerrain = world.resolve(capsule, up, terrain);
    clearContact(contact);
    contact.correction.copy(terrain.correction);
    if (hitTerrain) considerFloor(contact, terrain.floorNormal, up);

    const sphere = obstacle();
    if (!sphere) return hitTerrain;
    shifted.radius = capsule.radius;
    shifted.start.copy(capsule.start).add(contact.correction);
    shifted.end.copy(capsule.end).add(contact.correction);
    closestOnSegment(shifted, sphere.center, closest);
    const away = normal.subVectors(closest, sphere.center);
    const distance = away.length();
    const penetration = sphere.radius + capsule.radius - distance;
    if (penetration <= 0 || distance === 0) return hitTerrain;
    away.divideScalar(distance);
    contact.correction.addScaledVector(away, penetration);
    considerFloor(contact, away, up);
    return true;
  };
  return { ...world, resolve };
}
