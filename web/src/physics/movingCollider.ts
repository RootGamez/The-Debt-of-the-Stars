// Suma a las colisiones de un mundo las de un objeto con su propia geometría, colocado con una pose (la nave posada,
// Fase 11): el jugador a pie choca con su casco, sube por su escalerilla y anda por dentro. La geometría del objeto
// está en sus propios ejes; la cápsula se pasa a esos ejes, se resuelve y la corrección vuelve a los del mundo.
// Los rayos (aparición, lectura) siguen siendo solo los del terreno.
import { Quaternion, Vector3 } from 'three';
import {
  clearContact,
  considerFloor,
  createCapsule,
  createContact,
  type Capsule,
  type CollisionWorld,
  type Contact,
} from './collisionWorld';

/** Un objeto que choca: su geometría (en sus ejes) y dónde está en el mundo. */
export interface PlacedCollider {
  world: CollisionWorld;
  position: Vector3;
  /** De los ejes del objeto a los del mundo. */
  orientation: Quaternion;
}

const local: Capsule = createCapsule(0);
const terrain: Contact = createContact();
const own: Contact = createContact();
const localUp = new Vector3();
const inverse = new Quaternion();
const push = new Vector3();
const floor = new Vector3();

/** `placed()` se consulta en cada llamada: devuelve `undefined` cuando no hay objeto. */
export function withMovingCollider<W extends CollisionWorld>(
  world: W,
  placed: () => PlacedCollider | undefined,
): W & CollisionWorld {
  const resolve = (capsule: Capsule, up: Vector3, contact: Contact): boolean => {
    const hitTerrain = world.resolve(capsule, up, terrain);
    clearContact(contact);
    contact.correction.copy(terrain.correction);
    if (hitTerrain) considerFloor(contact, terrain.floorNormal, up);

    const object = placed();
    if (!object) return hitTerrain;
    inverse.copy(object.orientation).invert();
    local.radius = capsule.radius;
    local.start
      .copy(capsule.start)
      .add(contact.correction)
      .sub(object.position)
      .applyQuaternion(inverse);
    local.end
      .copy(capsule.end)
      .add(contact.correction)
      .sub(object.position)
      .applyQuaternion(inverse);
    localUp.copy(up).applyQuaternion(inverse);
    if (!object.world.resolve(local, localUp, own)) return hitTerrain;

    contact.correction.add(push.copy(own.correction).applyQuaternion(object.orientation));
    considerFloor(contact, floor.copy(own.floorNormal).applyQuaternion(object.orientation), up);
    return true;
  };
  return { ...world, resolve };
}
