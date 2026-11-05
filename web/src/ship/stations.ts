// Lo que se usa dentro del Albatros II (Fase 11, decisión D3): el asiento del piloto (F), el atril con el cuaderno
// del Registro y la mesa del mapa de órbitas (E); el reloj doble de pared y la mesa de carga solo se miran. Aquí se
// decide cuál tienes delante: el más cercano al alcance de la mano y dentro de la mirada. Lógica pura, con tests.
import { Vector3 } from 'three';

export type StationId = 'asiento' | 'registro' | 'mapa';

export interface Station {
  id: StationId;
  /** Dónde está (ejes de la nave). */
  position: Vector3;
}

/** Hasta dónde llega la mano (m, de los ojos al sitio). */
export const STATION_REACH = 1.8;
/** Lo centrado que tiene que estar en la mirada (coseno del ángulo). */
const MIN_FACING = 0.6;

const toward = new Vector3();

/**
 * El sitio que tienes delante: `eye` y `look` (unitario) en los mismos ejes que las posiciones de los sitios.
 * Gana el que mejor se mira entre los que están al alcance; si no hay ninguno, `undefined`.
 */
export function stationInFocus(
  stations: readonly Station[],
  eye: Vector3,
  look: Vector3,
  reach = STATION_REACH,
): Station | undefined {
  let best: Station | undefined;
  let bestScore = -Infinity;
  for (const station of stations) {
    toward.subVectors(station.position, eye);
    const distance = toward.length();
    if (distance > reach) continue;
    const facing = distance < 1e-6 ? 1 : toward.dot(look) / distance;
    if (facing < MIN_FACING) continue;
    const score = facing - distance / reach;
    if (score > bestScore) {
      bestScore = score;
      best = station;
    }
  }
  return best;
}
