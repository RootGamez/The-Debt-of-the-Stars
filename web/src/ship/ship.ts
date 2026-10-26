// La nave del jugador: su estado de vuelo, si está posada y cómo reacciona al suelo. Vive siempre en el
// marco de un mundo (o del sistema, en el espacio abierto); main.ts la pasa de un marco a otro.
// Lógica pura: la lógica de física está en shipPhysics.ts y el contacto en shipContact.ts.
import { Vector3, type Quaternion } from 'three';
import { SHIP_LAND_SLOPE_DEGREES, SHIP_LAND_SPEED, SHIP_STABILIZER_DEFAULT } from '../data/ship';
import type { CollisionWorld } from '../physics/collisionWorld';
import { alignUp, smoothingFactor } from '../physics/surfaceFrame';
import { createShipContactResult, resolveShipContact, type ShipContactResult } from './shipContact';
import { createShipState, stepShip, type ShipEnvironment, type ShipInput } from './shipPhysics';

/** El suelo del mundo donde vuela la nave: colisiones y su centro (para saber qué es "arriba"). */
export interface ShipGround {
  world: CollisionWorld;
  center: Vector3;
}

export interface ShipStepResult {
  /** Chocó contra el suelo por encima de la velocidad de choque. */
  crashed: boolean;
  impactSpeed: number;
}

const MIN_LAND_FLOOR_DOT = Math.cos((SHIP_LAND_SLOPE_DEGREES * Math.PI) / 180);
/** Con el empuje por debajo de esto la nave se considera sin tocar los mandos. */
const IDLE_THRUST_SQUARED = 0.05 * 0.05;
/** Lo deprisa que se endereza contra el suelo al tocarlo (1/s). */
const SETTLE_RATE = 8;

const up = new Vector3();
const contact: ShipContactResult = createShipContactResult();
const result: ShipStepResult = { crashed: false, impactSpeed: 0 };

export class Ship {
  readonly state = createShipState();
  /** Mundo en cuyo marco está la nave (`undefined` = espacio abierto, marco del sistema). */
  frame: string | undefined;
  /** Reposa sobre el suelo: ni se mueve ni se simula hasta que el piloto empuja. */
  landed = false;
  /** Estabilizador de giro; con Z pasa a modo libre. */
  stabilize = SHIP_STABILIZER_DEFAULT;

  constructor(readonly radius: number) {}

  /** La deja posada, quieta, en el marco de ese mundo. */
  park(frame: string | undefined, position: Vector3, orientation: Quaternion): void {
    this.frame = frame;
    this.state.position.copy(position);
    this.state.orientation.copy(orientation);
    this.state.velocity.set(0, 0, 0);
    this.state.angularVelocity.set(0, 0, 0);
    this.landed = true;
  }

  /**
   * Un paso de física (a 60 Hz). `ground` es el suelo del mundo donde vuela, o `undefined` en el
   * espacio abierto. El resultado se reutiliza en la llamada siguiente: no lo guardes.
   */
  step(
    shipInput: ShipInput,
    env: ShipEnvironment,
    ground: ShipGround | undefined,
    dt: number,
  ): ShipStepResult {
    result.crashed = false;
    result.impactSpeed = 0;
    const idle = shipInput.thrust.lengthSq() < IDLE_THRUST_SQUARED;
    if (this.landed) {
      if (idle) return result;
      this.landed = false;
    }

    stepShip(this.state, { ...shipInput, stabilize: this.stabilize }, env, dt);
    if (!ground) return result;

    up.subVectors(this.state.position, ground.center).normalize();
    resolveShipContact(this.state, ground.world, up, this.radius, contact);
    result.crashed = contact.crashed;
    result.impactSpeed = contact.impactSpeed;
    if (!contact.touching || contact.crashed) return result;

    const slow = this.state.velocity.length() < SHIP_LAND_SPEED;
    if (slow && contact.floorDot >= MIN_LAND_FLOOR_DOT) {
      alignUp(this.state.orientation, contact.floorNormal, smoothingFactor(SETTLE_RATE, dt));
      if (idle) this.settle(contact.floorNormal);
    }
    return result;
  }

  private settle(floorNormal: Vector3): void {
    alignUp(this.state.orientation, floorNormal, 1);
    this.state.velocity.set(0, 0, 0);
    this.state.angularVelocity.set(0, 0, 0);
    this.landed = true;
  }
}
