// Interfaz de colisiones que usa el motor del personaje. La implementación real (three-mesh-bvh sobre
// las mallas COL_) está en bvhWorld.ts; los tests usan mundos analíticos con la misma interfaz.
import { Vector3 } from 'three';

/** Cápsula en coordenadas del mundo: segmento entre los centros de sus dos esferas. */
export interface Capsule {
  start: Vector3;
  end: Vector3;
  radius: number;
}

export interface CollisionWorld {
  /**
   * Calcula el desplazamiento mínimo que saca la cápsula de la geometría y lo escribe en
   * `correction`. Devuelve `false` (y correction = 0) si no hay contacto. No modifica la cápsula.
   */
  resolve(capsule: Capsule, correction: Vector3): boolean;
}

export interface RaycastWorld {
  /** Distancia al primer impacto desde `origin` en la dirección unitaria `direction`, o null. */
  raycast(origin: Vector3, direction: Vector3, maxDistance: number): number | null;
}

export function createCapsule(radius: number): Capsule {
  return { start: new Vector3(), end: new Vector3(), radius };
}

/** Coloca la cápsula de un cuerpo de pie: pies en `feet`, eje según `up`, altura total `height`. */
export function placeCapsule(
  capsule: Capsule,
  feet: Vector3,
  up: Vector3,
  height: number,
): Capsule {
  capsule.start.copy(feet).addScaledVector(up, capsule.radius);
  capsule.end.copy(feet).addScaledVector(up, height - capsule.radius);
  return capsule;
}
