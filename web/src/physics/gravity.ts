// Gravedad esférica: cada mundo es un pozo que atrae hacia su centro.
// Fuerza completa hasta la superficie y caída lineal hasta `range` metros por encima (cómoda para jugar).
import { Vector3 } from 'three';
import { G_BASE, GRAVITY_RANGE_RADII } from '../data/movement';
import type { WorldInfo } from '../worlds/markers';

export interface GravityWell {
  center: Vector3;
  /** Radio del planeta (m). */
  radius: number;
  /** Aceleración en la superficie (m/s²). */
  strength: number;
  /** Distancia sobre la superficie en la que la gravedad cae a cero (m). */
  range: number;
}

const toCenter = new Vector3();

export function wellForWorld(info: WorldInfo, center = new Vector3()): GravityWell {
  return {
    center,
    radius: info.radius,
    strength: G_BASE * info.gravity,
    range: info.radius * GRAVITY_RANGE_RADII,
  };
}

function falloff(distance: number, well: GravityWell): number {
  if (distance <= well.radius) return 1;
  return Math.max(0, 1 - (distance - well.radius) / well.range);
}

/** Aceleración de gravedad en `position` (m/s²). Escribe en `target` y lo devuelve. */
export function gravityAt(
  position: Vector3,
  wells: readonly GravityWell[],
  target = new Vector3(),
): Vector3 {
  target.set(0, 0, 0);
  for (const well of wells) {
    toCenter.subVectors(well.center, position);
    const distance = toCenter.length();
    if (distance < 1e-6) continue; // en el centro exacto no hay dirección
    const magnitude = well.strength * falloff(distance, well);
    if (magnitude > 0) target.addScaledVector(toCenter, magnitude / distance);
  }
  return target;
}
