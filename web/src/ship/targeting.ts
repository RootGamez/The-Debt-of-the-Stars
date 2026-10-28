// Sistema de fijación de objetivos (cuerpos celestes) para la navegación espacial.
import { Vector3 } from 'three';

export interface TargetBody {
  id: string;
  name: string;
  /** Oculto (el Nudo): solo se puede fijar cuando `revealed` lo permite (estando cerca). */
  hidden?: boolean;
}

/** Qué cuerpos ocultos se pueden fijar ahora mismo; por defecto, todos. */
export type Revealed = (id: string) => boolean;

export class TargetingSystem {
  private targetIndex = -1;

  constructor(readonly bodies: readonly TargetBody[]) {}

  get currentTarget(): TargetBody | undefined {
    if (this.targetIndex < 0 || this.targetIndex >= this.bodies.length) {
      return undefined;
    }
    return this.bodies[this.targetIndex];
  }

  /** Cicla al siguiente objetivo disponible (se salta los ocultos que aún no se ven). */
  cycleTarget(revealed: Revealed = () => true): TargetBody | undefined {
    for (let tried = 0; tried < this.bodies.length; tried++) {
      this.targetIndex = (this.targetIndex + 1) % this.bodies.length;
      const body = this.currentTarget;
      if (body && (!body.hidden || revealed(body.id))) return body;
    }
    this.targetIndex = -1;
    return undefined;
  }

  /** Establece directamente un objetivo por su id. */
  setTarget(id: string): boolean {
    const idx = this.bodies.findIndex((b) => b.id === id);
    if (idx < 0) return false;
    this.targetIndex = idx;
    return true;
  }

  /** Limpia la selección actual. */
  clearTarget(): void {
    this.targetIndex = -1;
  }

  /** Calcula la distancia euclídea entre la nave y el objetivo. */
  distanceTo(shipPosition: Vector3, targetPosition: Vector3): number {
    return shipPosition.distanceTo(targetPosition);
  }

  /** Calcula la velocidad relativa de la nave respecto al objetivo (V_nave - V_objetivo). */
  relativeVelocity(shipVelocity: Vector3, targetVelocity: Vector3): Vector3 {
    return new Vector3().subVectors(shipVelocity, targetVelocity);
  }
}
