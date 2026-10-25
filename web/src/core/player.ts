// El jugador: estado físico, mirada (giro y cabeceo), reaparición de seguridad e interpolación
// entre pasos de física para que el movimiento se vea suave en pantallas de más de 60 Hz.
import { Quaternion, Vector3 } from 'three';
import { RESPAWN_DISTANCE_RADII } from '../data/movement';
import {
  createCharacter,
  stepCharacter,
  type CharacterState,
  type MotorEnvironment,
} from '../physics/characterMotor';
import type { GravityWell } from '../physics/gravity';
import type { SpawnPoint } from '../physics/spawn';
import { yaw } from '../physics/surfaceFrame';
import { clampPitch } from '../render/firstPersonCamera';
import type { MoveIntent } from './input';

/** Por debajo de esta fracción del radio, el jugador ha atravesado el suelo. */
const MIN_DISTANCE_RADII = 0.5;

export class Player {
  state: CharacterState;
  pitch = 0;
  respawnCount = 0;
  private readonly previousFeet = new Vector3();
  private readonly previousBody = new Quaternion();

  constructor(
    private readonly spawn: SpawnPoint,
    private readonly env: MotorEnvironment,
    private readonly home: GravityWell,
  ) {
    this.state = createCharacter(spawn.feet, spawn.body);
    this.savePrevious();
  }

  /** Gira la vista: `yawAngle` positivo = izquierda, `pitchAngle` positivo = arriba (radianes). */
  look(yawAngle: number, pitchAngle: number): void {
    yaw(this.state.body, yawAngle);
    yaw(this.previousBody, yawAngle); // si no, la interpolación "deshace" parte del giro
    this.pitch = clampPitch(this.pitch + pitchAngle);
  }

  step(intent: MoveIntent, dt: number): void {
    this.savePrevious();
    stepCharacter(this.state, intent, this.env, dt);
    if (this.isLost()) this.respawn();
  }

  /** Reaparición de seguridad (el jugador se perdió): cuenta para depurar. */
  respawn(): void {
    this.reset();
    this.respawnCount++;
  }

  /** Vuelve al punto de aparición sin contar como fallo (inicio de un ciclo nuevo). */
  reset(): void {
    this.state = createCharacter(this.spawn.feet, this.spawn.body);
    this.pitch = 0;
    this.savePrevious();
  }

  interpolatedFeet(alpha: number, target: Vector3): Vector3 {
    return target.copy(this.previousFeet).lerp(this.state.position, alpha);
  }

  interpolatedBody(alpha: number, target: Quaternion): Quaternion {
    return target.copy(this.previousBody).slerp(this.state.body, alpha);
  }

  private savePrevious(): void {
    this.previousFeet.copy(this.state.position);
    this.previousBody.copy(this.state.body);
  }

  private isLost(): boolean {
    const distance = this.state.position.distanceTo(this.home.center);
    return (
      !Number.isFinite(distance) ||
      distance > this.home.radius * RESPAWN_DISTANCE_RADII ||
      distance < this.home.radius * MIN_DISTANCE_RADII
    );
  }
}
