// Mundos de colisión analíticos para probar el motor sin mallas: una esfera sólida y semiespacios
// (planos). Implementan la misma interfaz que el mundo real con three-mesh-bvh.
import { Vector3 } from 'three';
import type { Capsule, CollisionWorld } from '../../src/physics/collisionWorld';

const closest = new Vector3();
const segment = new Vector3();
const offset = new Vector3();

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
    resolve(capsule: Capsule, correction: Vector3): boolean {
      closestPointOnSegment(capsule.start, capsule.end, center, closest);
      const away = offset.subVectors(closest, center);
      const distance = away.length();
      const penetration = radius + capsule.radius - distance;
      if (penetration <= 0 || distance === 0) {
        correction.set(0, 0, 0);
        return false;
      }
      correction.copy(away).multiplyScalar(penetration / distance);
      return true;
    },
  };
}

/** Semiespacio sólido bajo el plano que pasa por `point` con normal `normal` (unitaria). */
export function halfSpaceWorld(point: Vector3, normal: Vector3): CollisionWorld {
  return {
    resolve(capsule: Capsule, correction: Vector3): boolean {
      const dStart = offset.subVectors(capsule.start, point).dot(normal);
      const dEnd = offset.subVectors(capsule.end, point).dot(normal);
      const penetration = capsule.radius - Math.min(dStart, dEnd);
      if (penetration <= 0) {
        correction.set(0, 0, 0);
        return false;
      }
      correction.copy(normal).multiplyScalar(penetration);
      return true;
    },
  };
}

/** Resuelve varios mundos en secuencia acumulando la corrección total. */
export function compositeWorld(...worlds: CollisionWorld[]): CollisionWorld {
  const partial = new Vector3();
  return {
    resolve(capsule: Capsule, correction: Vector3): boolean {
      correction.set(0, 0, 0);
      let hit = false;
      for (const world of worlds) {
        if (!world.resolve(capsule, partial)) continue;
        hit = true;
        correction.add(partial);
        capsule.start.add(partial);
        capsule.end.add(partial);
      }
      capsule.start.sub(correction);
      capsule.end.sub(correction);
      return hit;
    },
  };
}
