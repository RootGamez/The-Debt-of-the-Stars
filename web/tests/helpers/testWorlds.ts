// Mundos de colisión analíticos para probar el motor sin mallas: una esfera sólida y semiespacios
// (planos). Implementan la misma interfaz que el mundo real con three-mesh-bvh.
import { Vector3 } from 'three';
import {
  clearContact,
  considerFloor,
  createContact,
  type Capsule,
  type CollisionWorld,
  type Contact,
} from '../../src/physics/collisionWorld';

const closest = new Vector3();
const segment = new Vector3();
const offset = new Vector3();
const normal = new Vector3();

function closestPointOnSegment(start: Vector3, end: Vector3, point: Vector3, target: Vector3) {
  segment.subVectors(end, start);
  const lengthSq = segment.lengthSq();
  const t =
    lengthSq === 0
      ? 0
      : Math.min(1, Math.max(0, offset.subVectors(point, start).dot(segment) / lengthSq));
  return target.copy(start).addScaledVector(segment, t);
}

export function sphereWorld(center: Vector3, radius: number): CollisionWorld {
  return {
    resolve(capsule: Capsule, up: Vector3, contact: Contact): boolean {
      clearContact(contact);
      closestPointOnSegment(capsule.start, capsule.end, center, closest);
      const away = offset.subVectors(closest, center);
      const distance = away.length();
      const penetration = radius + capsule.radius - distance;
      if (penetration <= 0 || distance === 0) return false;
      normal.copy(away).divideScalar(distance);
      contact.correction.copy(normal).multiplyScalar(penetration);
      considerFloor(contact, normal, up);
      return true;
    },
  };
}

/**
 * El interior de una esfera hueca: todo es sólido más allá de `innerRadius` y se camina por la cara de
 * dentro (como en el Nudo). El suelo empuja hacia el centro.
 */
export function hollowSphereWorld(center: Vector3, innerRadius: number): CollisionWorld {
  const start = new Vector3();
  const end = new Vector3();
  return {
    resolve(capsule: Capsule, up: Vector3, contact: Contact): boolean {
      clearContact(contact);
      start.subVectors(capsule.start, center);
      end.subVectors(capsule.end, center);
      const far = start.lengthSq() > end.lengthSq() ? start : end;
      const distance = far.length();
      const penetration = distance + capsule.radius - innerRadius;
      if (penetration <= 0 || distance === 0) return false;
      normal.copy(far).divideScalar(-distance); // hacia el centro
      contact.correction.copy(normal).multiplyScalar(penetration);
      considerFloor(contact, normal, up);
      return true;
    },
  };
}

/** Semiespacio sólido bajo el plano que pasa por `point` con normal `planeNormal` (unitaria). */
export function halfSpaceWorld(point: Vector3, planeNormal: Vector3): CollisionWorld {
  return {
    resolve(capsule: Capsule, up: Vector3, contact: Contact): boolean {
      clearContact(contact);
      const dStart = offset.subVectors(capsule.start, point).dot(planeNormal);
      const dEnd = offset.subVectors(capsule.end, point).dot(planeNormal);
      const penetration = capsule.radius - Math.min(dStart, dEnd);
      if (penetration <= 0) return false;
      contact.correction.copy(planeNormal).multiplyScalar(penetration);
      considerFloor(contact, planeNormal, up);
      return true;
    },
  };
}

/** Resuelve varios mundos en secuencia acumulando la corrección total. */
export function compositeWorld(...worlds: CollisionWorld[]): CollisionWorld {
  const partial = createContact();
  return {
    resolve(capsule: Capsule, up: Vector3, contact: Contact): boolean {
      clearContact(contact);
      let hit = false;
      for (const world of worlds) {
        if (!world.resolve(capsule, up, partial)) continue;
        hit = true;
        contact.correction.add(partial.correction);
        considerFloor(contact, partial.floorNormal, up);
        capsule.start.add(partial.correction);
        capsule.end.add(partial.correction);
      }
      capsule.start.sub(contact.correction);
      capsule.end.sub(contact.correction);
      return hit;
    },
  };
}
