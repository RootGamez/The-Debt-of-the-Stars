// Gestión del embarque y desembarque del jugador en la nave.
// Controla cuándo se puede subir o bajar y la transición entre andar a pie y pilotar.
import type { Vector3 } from 'three';
import { BOARD_DISTANCE } from '../data/ship';

export type BoardingState = 'on_foot' | 'piloting';

export class BoardingManager {
  private state: BoardingState = 'on_foot';

  get isPiloting(): boolean {
    return this.state === 'piloting';
  }

  reset(): void {
    this.state = 'on_foot';
  }

  /** Comprueba si el jugador está suficientemente cerca de la escotilla y la nave posada para subir. */
  canBoard(playerPos: Vector3, hatchPos: Vector3, shipLanded: boolean): boolean {
    if (this.state !== 'on_foot') return false;
    if (!shipLanded) return false;
    return playerPos.distanceTo(hatchPos) <= BOARD_DISTANCE;
  }

  /** Realiza la acción de subir a la nave. */
  board(): boolean {
    if (this.state !== 'on_foot') return false;
    this.state = 'piloting';
    return true;
  }

  /** Solo se baja con la nave posada: así siempre hay suelo bajo la escotilla. */
  canDisembark(shipLanded: boolean): boolean {
    return this.state === 'piloting' && shipLanded;
  }

  /** Realiza la acción de bajar de la nave. */
  disembark(): boolean {
    if (this.state !== 'piloting') return false;
    this.state = 'on_foot';
    return true;
  }
}
