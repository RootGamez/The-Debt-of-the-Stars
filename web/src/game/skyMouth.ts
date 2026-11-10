// La boca que se abre en el cielo del Archivo de las Puertas (plan de historia y puzzles físicos, T11; pedido de
// Anthony): en el atril ya no se cruza a pie. Elegir una boca de casa abre, muy arriba, un agujero de gusano estable
// (el de la Luna, pero quieto) y solo se llega a él con la nave. Cruzarlo funde y lleva a casa, al espacio, en la
// nave. Lógica pura (con tests); render/skyMouthView.ts lo dibuja.
import { Vector3 } from 'three';
import type { MouthId } from './epilogue';

export const SKY_MOUTH = {
  world: 'puertas',
  /** A qué altura (m) sobre el mundo se abre: lejos para volar, cerca para no perderse. */
  altitude: 260,
  /** El radio del anillo (m): cabe la nave entera (9 m de ancho). */
  radius: 16,
  /** A cuánto del centro (m) la nave lo cruza. */
  crossRadius: 12,
} as const;

/** Dónde se abre (en el marco del mundo): sobre `up` (unitario, de dónde se despierta), a la altura puesta. */
export function skyMouthCenter(up: Vector3, worldRadius: number): Vector3 {
  return up
    .clone()
    .normalize()
    .multiplyScalar(worldRadius + SKY_MOUTH.altitude);
}

/** La nave (en el marco del mundo) está dentro del anillo. */
export function crossesMouth(ship: Vector3, center: Vector3): boolean {
  return ship.distanceTo(center) <= SKY_MOUTH.crossRadius;
}

export interface SkyMouth {
  /** La boca elegida: ya está abierta en el cielo. */
  readonly chosen: MouthId | undefined;
  /** Abre (o cambia a) esa boca. */
  open(id: MouthId): void;
  /** La nave la cruza: devuelve por cuál, una sola vez. */
  cross(): MouthId | undefined;
  reset(): void;
}

export function createSkyMouth(): SkyMouth {
  let chosen: MouthId | undefined;
  return {
    get chosen() {
      return chosen;
    },
    open(id) {
      chosen = id;
    },
    cross() {
      const id = chosen;
      chosen = undefined;
      return id;
    },
    reset() {
      chosen = undefined;
    },
  };
}
