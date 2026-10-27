// Cálculos de la interfaz de vuelo: lo deprisa que te acercas al objetivo, dónde poner su marca en la
// pantalla (o en el borde, apuntando hacia él) y los números en español. Lógica pura.
import type { Vector3 } from 'three';

/** Velocidad con la que se acorta la distancia al objetivo (m/s; negativa si te alejas). */
export function closingSpeed(towardTarget: Vector3, relativeVelocity: Vector3): number {
  const distance = towardTarget.length();
  return distance === 0 ? 0 : relativeVelocity.dot(towardTarget) / distance;
}

export interface MarkerPlacement {
  /** Coordenadas normalizadas de la pantalla (−1 a 1, y hacia arriba). */
  x: number;
  y: number;
  onScreen: boolean;
  /** Hacia dónde queda el objetivo (rad), para la flecha del borde. */
  angle: number;
}

/**
 * `ndc` es el punto ya proyectado con la cámara (`Vector3.project`). Detrás de la cámara la proyección
 * sale reflejada (z > 1), así que se invierte. Fuera de la vista, la marca se pega al borde con un margen.
 */
export function placeMarker(ndc: Vector3, margin: number): MarkerPlacement {
  const behind = ndc.z > 1;
  let x = behind ? -ndc.x : ndc.x;
  let y = behind ? -ndc.y : ndc.y;
  if (!behind && Math.abs(x) <= 1 && Math.abs(y) <= 1) {
    return { x, y, onScreen: true, angle: Math.atan2(y, x) };
  }
  if (x === 0 && y === 0) y = -1; // justo detrás: abajo, como "date la vuelta"
  const angle = Math.atan2(y, x);
  const edge = 1 - margin;
  const scale = edge / Math.max(Math.abs(x), Math.abs(y));
  x *= scale;
  y *= scale;
  return { x, y, onScreen: false, angle };
}

function decimal(value: number, digits: number): string {
  const factor = 10 ** digits;
  return (Math.round(value * factor) / factor).toFixed(digits).replace('.', ',');
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${decimal(meters / 1000, 1)} km`;
}

export function formatSpeed(metersPerSecond: number): string {
  const speed = Math.abs(metersPerSecond);
  if (speed < 0.05) return '0 m/s';
  return speed < 10 ? `${decimal(speed, 1)} m/s` : `${Math.round(speed)} m/s`;
}
