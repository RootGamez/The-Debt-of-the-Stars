// Contacto de la nave con el suelo: la nave es un grupo de esferas (el disco del Albatros II: una en el centro, que
// llega a las patas, y un anillo en el borde) que se sacan de la geometría del mundo (la misma interfaz de colisiones
// que usa el personaje); rebota poco y avisa si el golpe es de los que matan.
// Trabaja en el marco del mundo, así que la velocidad ya es "respecto al suelo".
import { Vector3 } from 'three';
import { SHIP_CRASH_SPEED, SHIP_RESTITUTION } from '../data/ship';
import {
  createCapsule,
  createContact,
  type Capsule,
  type CollisionWorld,
} from '../physics/collisionWorld';
import type { ShipState } from './shipPhysics';

export interface ShipContactResult {
  touching: boolean;
  /** El golpe supera la velocidad de choque. */
  crashed: boolean;
  /** Velocidad contra el suelo del golpe más fuerte de este paso (m/s). */
  impactSpeed: number;
  /** Producto de la normal del suelo con "arriba" (1 = suelo plano); -Infinity sin contacto. */
  floorDot: number;
  floorNormal: Vector3;
}

/** Por debajo de esta velocidad contra el suelo no hay rebote (sin temblor al reposar). */
const BOUNCE_THRESHOLD = 2;
/** Pasadas por paso: la esfera puede tocar dos caras a la vez. */
const ITERATIONS = 3;

/** Una esfera del casco, en ejes de la nave. */
export interface HullSphere {
  center: Vector3;
  radius: number;
}

const contact = createContact();
const normal = new Vector3();
const offset = new Vector3();
const ORIGIN = new Vector3();

export function createShipContactResult(): ShipContactResult {
  return {
    touching: false,
    crashed: false,
    impactSpeed: 0,
    floorDot: -Infinity,
    floorNormal: new Vector3(),
  };
}

const capsuleCache = new Map<number, Capsule>();

function capsuleFor(radius: number): Capsule {
  let capsule = capsuleCache.get(radius);
  if (!capsule) {
    capsule = createCapsule(radius);
    capsuleCache.set(radius, capsule);
  }
  return capsule;
}

/**
 * Saca la nave de la geometría y ajusta su velocidad. `up` es el "arriba" del mundo en su posición
 * (para decidir qué contacto cuenta como suelo).
 */
export function resolveShipContact(
  state: ShipState,
  world: CollisionWorld,
  up: Vector3,
  /** Una sola esfera centrada de ese radio, o las esferas del casco. */
  hull: number | readonly HullSphere[],
  result: ShipContactResult = createShipContactResult(),
): ShipContactResult {
  result.touching = false;
  result.crashed = false;
  result.impactSpeed = 0;
  result.floorDot = -Infinity;
  const spheres = typeof hull === 'number' ? [{ center: ORIGIN, radius: hull }] : hull;
  for (let i = 0; i < ITERATIONS; i++) {
    let moved = false;
    for (const sphere of spheres) {
      if (pushOut(state, world, up, sphere, result)) moved = true;
    }
    if (!moved) break;
  }
  return result;
}

/** Saca una esfera del casco de la geometría; devuelve si la ha movido. */
function pushOut(
  state: ShipState,
  world: CollisionWorld,
  up: Vector3,
  sphere: HullSphere,
  result: ShipContactResult,
): boolean {
  const capsule = capsuleFor(sphere.radius);
  offset.copy(sphere.center).applyQuaternion(state.orientation);
  capsule.start.copy(state.position).add(offset);
  capsule.end.copy(capsule.start);
  if (!world.resolve(capsule, up, contact)) return false;
  const push = contact.correction.length();
  if (push < 1e-9) return false;
  result.touching = true;
  state.position.add(contact.correction);
  if (contact.floorDot > result.floorDot) {
    result.floorDot = contact.floorDot;
    result.floorNormal.copy(contact.floorNormal);
  }

  normal.copy(contact.correction).divideScalar(push);
  const into = -state.velocity.dot(normal);
  if (into <= 0) return true;
  result.impactSpeed = Math.max(result.impactSpeed, into);
  if (into > SHIP_CRASH_SPEED) {
    result.crashed = true;
    return true;
  }
  const bounce = into > BOUNCE_THRESHOLD ? SHIP_RESTITUTION : 0;
  state.velocity.addScaledVector(normal, into * (1 + bounce));
  return true;
}
