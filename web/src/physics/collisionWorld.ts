// Interfaz de colisiones que usa el motor del personaje. La implementación real (three-mesh-bvh sobre
// las mallas COL_) está en bvhWorld.ts; los tests usan mundos analíticos con la misma interfaz.
import { Vector3 } from 'three';

/** Cápsula en coordenadas del mundo: segmento entre los centros de sus dos esferas. */
export interface Capsule {
  start: Vector3;
  end: Vector3;
  radius: number;
}

/**
 * Resultado de sacar la cápsula de la geometría. Se separa el empuje total (para la posición) de la
 * normal de contacto más "de suelo": si la cápsula toca suelo y pared a la vez, la suma de empujes
 * apunta casi en horizontal y no sirve para decidir si se está de pie.
 */
export interface Contact {
  /** Desplazamiento total que saca la cápsula de la geometría. */
  correction: Vector3;
  /** Normal del contacto más alineada con `up` (válida si `floorDot` > -Infinity). */
  floorNormal: Vector3;
  /** Producto escalar de `floorNormal` con `up`; -Infinity si no hay contacto. */
  floorDot: number;
}

export interface CollisionWorld {
  /**
   * Calcula el desplazamiento que saca la cápsula de la geometría y la normal de contacto más
   * alineada con `up`. Devuelve `false` (corrección 0, floorDot -Infinity) si no hay contacto.
   * No modifica la cápsula.
   */
  resolve(capsule: Capsule, up: Vector3, contact: Contact): boolean;
}

export interface RaycastWorld {
  /** Distancia al primer impacto desde `origin` en la dirección unitaria `direction`, o null. */
  raycast(origin: Vector3, direction: Vector3, maxDistance: number): number | null;
}

export function createContact(): Contact {
  return { correction: new Vector3(), floorNormal: new Vector3(), floorDot: -Infinity };
}

export function clearContact(contact: Contact): Contact {
  contact.correction.set(0, 0, 0);
  contact.floorNormal.set(0, 0, 0);
  contact.floorDot = -Infinity;
  return contact;
}

/** Registra la normal de un contacto si es la más "de suelo" hasta ahora. */
export function considerFloor(contact: Contact, normal: Vector3, up: Vector3): void {
  const dot = normal.dot(up);
  if (dot > contact.floorDot) {
    contact.floorDot = dot;
    contact.floorNormal.copy(normal);
  }
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
