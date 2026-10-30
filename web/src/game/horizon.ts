// El horizonte estable (Fase 10D): con el Contrapeso instalado, el agujero negro nace en el núcleo de la máquina de
// Cicatriz y se queda pequeño. Acercarse se nota (el tiempo de fuera se acelera, la marea estira la vista) y tira de
// la nave; cruzarlo lleva al Archivo de las Puertas. Todo en el marco del mundo donde nace (el de Cicatriz): las
// cuentas están en system/blackHole.ts (con tests).
import { Vector3 } from 'three';
import {
  blackHoleRadius,
  horizonCloseness,
  horizonPull,
  horizonRate,
  type HoleGrowth,
} from '../system/blackHole';

export interface Horizon {
  /** Radio del horizonte estable ahora (m); 0 si no lo hay (sin Contrapeso, o aún no ha nacido). */
  readonly radius: number;
  /** Una vez por fotograma: el radio en `t`, solo si el agujero es estable. */
  update(t: number, stable: boolean): void;
  /** Factor del ritmo del sitio en `position` (marco de `frame`): 1 lejos o en otro mundo, 0 en el horizonte. */
  rate(frame: string | undefined, position: Vector3): number;
  /** Lo cerca que se está (0–1; ver `horizonCloseness`). */
  closeness(frame: string | undefined, position: Vector3): number;
  /** Suma a `target` (m/s², marco de `frame`) lo que tira de la nave hacia el centro. */
  pull(frame: string | undefined, position: Vector3, target: Vector3): void;
  /** Si `position` ya está dentro del horizonte. */
  crossed(frame: string | undefined, position: Vector3): boolean;
  snapshot(): { radius: number };
}

export interface HorizonOptions {
  /** Mundo en cuyo marco está el centro (Cicatriz). */
  world: string;
  /** El centro del núcleo, en el marco de ese mundo; sin él no hay horizonte. */
  center: Vector3 | undefined;
  growth: HoleGrowth;
}

const toCenter = new Vector3();

/**
 * Depuración: el punto a `distance` (m) del centro, en horizontal hacia `front` (una marca delante de la máquina),
 * para dejar ahí la nave sin cruzar el anillo.
 */
export function approachPoint(center: Vector3, front: Vector3, distance: number): Vector3 {
  const up = center.clone().normalize();
  const along = front.clone().sub(center);
  along.addScaledVector(up, -along.dot(up)).normalize();
  return center.clone().addScaledVector(along, distance);
}

export function createHorizon(options: HorizonOptions): Horizon {
  const { world, center, growth } = options;
  let radius = 0;

  /** Distancia al centro si se está en su mundo y hay horizonte; si no, infinito. */
  function distance(frame: string | undefined, position: Vector3): number {
    if (radius <= 0 || !center || frame !== world) return Number.POSITIVE_INFINITY;
    return position.distanceTo(center);
  }

  return {
    get radius() {
      return radius;
    },
    update(t, stable) {
      radius = stable && center ? blackHoleRadius(t, growth, true) : 0;
    },
    rate(frame, position) {
      return horizonRate(distance(frame, position), radius);
    },
    closeness(frame, position) {
      return horizonCloseness(distance(frame, position), radius);
    },
    pull(frame, position, target) {
      const d = distance(frame, position);
      const strength = horizonPull(d, radius);
      if (strength <= 0 || !center || d < 1e-6) return;
      target.addScaledVector(toCenter.subVectors(center, position), strength / d);
    },
    crossed(frame, position) {
      return distance(frame, position) < radius;
    },
    snapshot() {
      return { radius };
    },
  };
}
