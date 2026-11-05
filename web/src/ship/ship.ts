// La nave del jugador: su estado de vuelo, si está posada y cómo reacciona al suelo. Vive siempre en el
// marco de un mundo (o del sistema, en el espacio abierto); main.ts la pasa de un marco a otro.
// Lógica pura: la lógica de física está en shipPhysics.ts y el contacto en shipContact.ts.
import { Quaternion, Vector3 } from 'three';
import { SHIP_LAND_SLOPE_DEGREES, SHIP_LAND_SPEED, SHIP_STABILIZER_DEFAULT } from '../data/ship';
import type { CollisionWorld } from '../physics/collisionWorld';
import { alignUp, smoothingFactor } from '../physics/surfaceFrame';
import {
  createShipContactResult,
  resolveShipContact,
  type HullSphere,
  type ShipContactResult,
} from './shipContact';
import { createShipState, stepShip, type ShipEnvironment, type ShipInput } from './shipPhysics';

/** El suelo del mundo donde vuela la nave: colisiones y su centro (para saber qué es "arriba"). */
export interface ShipGround {
  world: CollisionWorld;
  center: Vector3;
}

/** Cómo choca la nave: sus esferas y sus medidas. */
export interface ShipHull {
  /** Radio de la esfera que la envuelve entera (m): para la Brasa y lo que se mide de lejos. */
  radius: number;
  /** Del centro de la nave al suelo con ella posada (m): las patas. */
  clearance: number;
  spheres: readonly HullSphere[];
}

/** Una nave que choca como una sola esfera centrada (la de reserva y la de los tests). */
export function sphereHull(radius: number): ShipHull {
  return { radius, clearance: radius, spheres: [{ center: new Vector3(), radius }] };
}

export interface ShipStepResult {
  /** Chocó contra el suelo por encima de la velocidad de choque. */
  crashed: boolean;
  impactSpeed: number;
}

const MIN_LAND_FLOOR_DOT = Math.cos((SHIP_LAND_SLOPE_DEGREES * Math.PI) / 180);
/** Por debajo de esto, un mando se considera suelto. */
const DEAD_INPUT = 0.05;
/** Lo deprisa que se endereza contra el suelo al tocarlo (1/s). */
const SETTLE_RATE = 8;

const up = new Vector3();
const AXIS_Y = new Vector3(0, 1, 0);
const turnOnGround = new Quaternion();

/** ¿Quiere el piloto despegar? Empujar hacia abajo o hacia atrás (o nada) la deja en el suelo. */
function wantsToFly(input: ShipInput): boolean {
  const { x, y, z } = input.thrust;
  return Math.abs(x) > DEAD_INPUT || z > DEAD_INPUT || y > DEAD_INPUT;
}
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

  private readonly previousPosition = new Vector3();
  private readonly previousOrientation = new Quaternion();

  readonly hull: ShipHull;

  constructor(hull: number | ShipHull) {
    this.hull = typeof hull === 'number' ? sphereHull(hull) : hull;
  }

  /** Radio de la esfera que la envuelve. */
  get radius(): number {
    return this.hull.radius;
  }

  /** Del centro al suelo, posada. */
  get clearance(): number {
    return this.hull.clearance;
  }

  /** Olvida el paso anterior (tras colocarla o cambiarla de marco): sin saltos al interpolar. */
  syncPrevious(): void {
    this.previousPosition.copy(this.state.position);
    this.previousOrientation.copy(this.state.orientation);
  }

  /** Pose entre el paso anterior y el actual, para que se vea suave a más de 60 Hz. */
  interpolate(alpha: number, position: Vector3, orientation: Quaternion): void {
    position.copy(this.previousPosition).lerp(this.state.position, alpha);
    orientation.copy(this.previousOrientation).slerp(this.state.orientation, alpha);
  }

  /** La deja posada, quieta, en el marco de ese mundo. */
  park(frame: string | undefined, position: Vector3, orientation: Quaternion): void {
    this.frame = frame;
    this.state.position.copy(position);
    this.state.orientation.copy(orientation);
    this.state.velocity.set(0, 0, 0);
    this.state.angularVelocity.set(0, 0, 0);
    this.clearAim();
    this.landed = true;
    this.syncPrevious();
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
    this.syncPrevious();
    result.crashed = false;
    result.impactSpeed = 0;
    const flying = wantsToFly(shipInput);
    if (this.landed) {
      if (!flying) {
        // Posada solo puede girar sobre sí misma, para mirar alrededor antes de despegar.
        turnOnGround.setFromAxisAngle(AXIS_Y, shipInput.aim.yaw);
        this.state.orientation.multiply(turnOnGround).normalize();
        return result;
      }
      this.landed = false;
    }

    stepShip(this.state, { ...shipInput, stabilize: this.stabilize }, env, dt);
    if (!ground) return result;

    up.subVectors(this.state.position, ground.center).normalize();
    resolveShipContact(this.state, ground.world, up, this.hull.spheres, contact);
    result.crashed = contact.crashed;
    result.impactSpeed = contact.impactSpeed;
    if (!contact.touching || contact.crashed) return result;

    const slow = this.state.velocity.length() < SHIP_LAND_SPEED;
    if (slow && contact.floorDot >= MIN_LAND_FLOOR_DOT) {
      alignUp(this.state.orientation, contact.floorNormal, smoothingFactor(SETTLE_RATE, dt));
      if (!flying) this.settle(contact.floorNormal);
    }
    return result;
  }

  private settle(floorNormal: Vector3): void {
    alignUp(this.state.orientation, floorNormal, 1);
    this.state.velocity.set(0, 0, 0);
    this.state.angularVelocity.set(0, 0, 0);
    this.clearAim();
    this.landed = true;
  }

  /** Posada o aparcada, la puntería que quedaba pendiente se olvida: al despegar no gira sola. */
  private clearAim(): void {
    this.state.aimPending.yaw = 0;
    this.state.aimPending.pitch = 0;
  }
}
