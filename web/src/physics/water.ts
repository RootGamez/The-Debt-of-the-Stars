// El agua de los mundos con mar (Fase 11E, el Archivo): dónde hay agua, cuánto del cuerpo queda dentro y el aire
// que le queda a quien bucea. El mar es una esfera de agua de radio `level` alrededor del centro del mundo; un
// tubo seco (la Galería del Archivo, de vidrio, alrededor del ecuador) queda fuera del agua aunque esté por debajo
// de su superficie. Lógica pura: el motor del personaje la usa para nadar.
import { Vector3 } from 'three';
import { BREATH_REFILL_SECONDS, BREATH_SECONDS, EYE_HEIGHT, PLAYER_HEIGHT } from '../data/movement';
import {
  clearContact,
  considerFloor,
  createContact,
  type Capsule,
  type CollisionWorld,
  type Contact,
  type RaycastWorld,
} from './collisionWorld';

/** Un tubo seco alrededor del eje Y del mundo (marco glTF), centrado en su ecuador. */
export interface DryRing {
  /** Radio del círculo central del tubo (m). */
  major: number;
  /** Radio del tubo (m). */
  minor: number;
}

export interface WaterBody {
  center: Vector3;
  /** Radio de la superficie del mar (m). */
  level: number;
  dry?: DryRing | undefined;
}

/** Pasos de la búsqueda del borde del agua a lo largo del cuerpo (precisión de altura / 2^pasos). */
const BOUNDARY_STEPS = 10;

const offset = new Vector3();
const probe = new Vector3();

function insideRing(point: Vector3, water: WaterBody, ring: DryRing): boolean {
  offset.subVectors(point, water.center);
  const around = Math.hypot(offset.x, offset.z) - ring.major;
  return Math.hypot(around, offset.y) < ring.minor;
}

export function isWet(point: Vector3, water: WaterBody): boolean {
  if (point.distanceTo(water.center) >= water.level) return false;
  return !water.dry || !insideRing(point, water, water.dry);
}

/**
 * Qué fracción del cuerpo (pies en `feet`, de pie según `up`) está bajo el agua: 0 en seco, 1 del todo dentro.
 * El borde se busca a lo largo del cuerpo, así vale igual bajo el mar que en el pozo que sube al tubo seco.
 */
export function submersion(feet: Vector3, up: Vector3, water: WaterBody): number {
  if (!isWet(feet, water)) return 0;
  if (isWet(probe.copy(feet).addScaledVector(up, PLAYER_HEIGHT), water)) return 1;
  let wet = 0;
  let dry = 1;
  for (let i = 0; i < BOUNDARY_STEPS; i++) {
    const middle = (wet + dry) / 2;
    if (isWet(probe.copy(feet).addScaledVector(up, middle * PLAYER_HEIGHT), water)) wet = middle;
    else dry = middle;
  }
  return (wet + dry) / 2;
}

/** Los ojos están bajo el agua: no se respira. */
export function headUnder(feet: Vector3, up: Vector3, water: WaterBody): boolean {
  return isWet(probe.copy(feet).addScaledVector(up, EYE_HEIGHT), water);
}

/** El aire de quien bucea: se gasta con la cabeza bajo el agua y se recupera deprisa al sacarla. */
export class Breath {
  /** Segundos de aire que quedan. */
  seconds = BREATH_SECONDS;

  get fraction(): number {
    return this.seconds / BREATH_SECONDS;
  }

  /** Avanza `dt` segundos; devuelve `true` en el paso en que se acaba el aire (ahogarse). */
  update(underwater: boolean, dt: number): boolean {
    if (!underwater) {
      this.seconds = Math.min(
        BREATH_SECONDS,
        this.seconds + (BREATH_SECONDS / BREATH_REFILL_SECONDS) * dt,
      );
      return false;
    }
    const before = this.seconds;
    this.seconds = Math.max(0, this.seconds - dt);
    return before > 0 && this.seconds === 0;
  }

  reset(): void {
    this.seconds = BREATH_SECONDS;
  }
}

const terrain: Contact = createContact();
const lowest = new Vector3();
const outward = new Vector3();

/**
 * Las colisiones de `world` más la superficie del mar como suelo: para la nave, que se posa en el agua en vez de
 * hundirse (el jugador sí entra en el agua). Los rayos también chocan con el mar.
 */
export function withSeaSurface(
  world: CollisionWorld & RaycastWorld,
  water: WaterBody,
): CollisionWorld & RaycastWorld {
  const resolve = (capsule: Capsule, up: Vector3, contact: Contact): boolean => {
    const hit = world.resolve(capsule, up, terrain);
    clearContact(contact);
    contact.correction.copy(terrain.correction);
    if (hit) considerFloor(contact, terrain.floorNormal, up);
    // El punto más bajo de la cápsula respecto al centro del mundo.
    const start = capsule.start.distanceTo(water.center);
    const end = capsule.end.distanceTo(water.center);
    lowest.copy(start < end ? capsule.start : capsule.end).add(contact.correction);
    outward.subVectors(lowest, water.center);
    const distance = outward.length();
    const sink = water.level + capsule.radius - distance;
    if (sink <= 0 || distance === 0) return hit;
    outward.divideScalar(distance);
    contact.correction.addScaledVector(outward, sink);
    considerFloor(contact, outward, up);
    return true;
  };
  const raycast = (origin: Vector3, direction: Vector3, maxDistance: number): number | null => {
    const ground = world.raycast(origin, direction, maxDistance);
    // Rayo contra la esfera del mar, desde fuera.
    outward.subVectors(origin, water.center);
    const b = outward.dot(direction);
    const c = outward.lengthSq() - water.level * water.level;
    const disc = b * b - c;
    const sea = c > 0 && disc >= 0 ? -b - Math.sqrt(disc) : null;
    const reach = sea !== null && sea >= 0 && sea <= maxDistance ? sea : null;
    if (reach === null) return ground;
    return ground === null ? reach : Math.min(ground, reach);
  };
  return { resolve, raycast };
}
