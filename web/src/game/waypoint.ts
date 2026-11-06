import { getLanguage } from '../i18n';
// El indicador de la tarea actual: dónde dibujar un punto del mundo en la pantalla. Si está a la vista, el rombo va
// encima; si no (fuera del cuadro o a tu espalda), una flecha en el borde que apunta hacia donde girar. Pura: recibe
// el punto en el marco de la cámara (mira hacia −Z, X a la derecha, Y arriba) y devuelve fracciones de pantalla.

export interface CameraSpacePoint {
  x: number;
  y: number;
  z: number;
}

export interface WaypointPlacement {
  /** Posición en la pantalla, de 0 (izquierda) a 1 (derecha). */
  x: number;
  /** De 0 (arriba) a 1 (abajo). */
  y: number;
  /** El punto está dentro del cuadro y delante: se dibuja el rombo, no la flecha. */
  onScreen: boolean;
  /** Hacia dónde apunta la flecha (rad, 0 = arriba, positivo en el sentido del reloj). */
  angle: number;
}

/** Margen del borde de la pantalla (fracción de medio cuadro) donde se pega la flecha. */
export const EDGE_MARGIN = 0.1;

/**
 * @param point el punto en el marco de la cámara.
 * @param tanHalfFov tangente de la mitad del campo de visión vertical.
 * @param aspect ancho / alto de la pantalla.
 */
export function placeWaypoint(
  point: CameraSpacePoint,
  tanHalfFov: number,
  aspect: number,
  margin = EDGE_MARGIN,
): WaypointPlacement {
  const limit = 1 - margin;
  const front = point.z < -1e-6;
  // Coordenadas normalizadas del cuadro (−1…1); detrás de la cámara no hay proyección: solo cuenta hacia dónde está.
  let nx = front ? point.x / (-point.z * tanHalfFov * aspect) : point.x;
  let ny = front ? point.y / (-point.z * tanHalfFov) : point.y;
  if (front && Math.abs(nx) <= limit && Math.abs(ny) <= limit) {
    return { x: (nx + 1) / 2, y: (1 - ny) / 2, onScreen: true, angle: 0 };
  }
  if (!front) {
    // Justo detrás: a un lado, nunca en el centro (si no, la flecha no sabría hacia dónde).
    if (Math.abs(nx) < 1e-6 && Math.abs(ny) < 1e-6) ny = -1;
    // Detrás pesa más girar de lado que mirar arriba o abajo.
    nx = Math.abs(nx) < 1e-6 ? 1 : nx * 1000;
  }
  if (Math.abs(nx) < 1e-9 && Math.abs(ny) < 1e-9) ny = 1;
  const scale = Math.min(
    limit / Math.max(Math.abs(nx), 1e-9),
    limit / Math.max(Math.abs(ny), 1e-9),
  );
  nx *= scale;
  ny *= scale;
  return {
    x: (nx + 1) / 2,
    y: (1 - ny) / 2,
    onScreen: false,
    angle: Math.atan2(nx, ny),
  };
}

/** Texto de la distancia: «34 m» de cerca, «1,2 km» de lejos. */
export function distanceLabel(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${String(Math.max(0, Math.round(meters)))} m`;
  const km = (meters / 1000).toFixed(1);
  return `${getLanguage() === 'en' ? km : km.replace('.', ',')} km`;
}
