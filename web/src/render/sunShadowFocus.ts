// Dónde y cómo mira la cámara de sombra de la estrella (lógica pura, sin WebGL). La estrella es un punto: la
// cámara sale de ella y mira hacia donde está el jugador, con un ángulo tan estrecho que solo cubre sus
// alrededores. Así el mapa de profundidad tiene detalle de decímetros incluso a 2 800 m de la estrella.
import { Vector3 } from 'three';

export interface SunShadowFocus {
  /** Ángulo vertical total de la cámara (grados). */
  fovDegrees: number;
  /** Distancia mínima y máxima que cubre el mapa, desde la estrella. */
  near: number;
  far: number;
  /** Distancia de la estrella al punto de foco. */
  distance: number;
}

export interface FocusOptions {
  /** Radio de la zona con sombra nítida alrededor del foco (m). */
  radius: number;
  /** Cuánto antes del foco, hacia la estrella, se aceptan cuerpos que proyectan sombra (m). */
  reach: number;
}

const MIN_NEAR = 1;
/** Margen tras el foco: lo que queda detrás del suelo ya no importa, pero el suelo curvo necesita algo. */
const BEHIND_FACTOR = 1.5;
const MAX_FOV = 60;

/** Cámara de sombra que cubre una esfera de `radius` centrada en `focus`, vista desde `star`. */
export function sunShadowFocus(
  star: Vector3,
  focus: Vector3,
  options: FocusOptions,
): SunShadowFocus {
  const distance = star.distanceTo(focus);
  const { radius, reach } = options;
  if (distance <= radius) {
    // El foco está dentro (o pegado a) la estrella: sin sombra útil.
    return { fovDegrees: MAX_FOV, near: MIN_NEAR, far: MIN_NEAR + 2 * radius, distance };
  }
  const half = Math.asin(Math.min(1, radius / distance));
  const fovDegrees = Math.min(MAX_FOV, ((2 * half) / Math.PI) * 180);
  return {
    fovDegrees,
    near: Math.max(MIN_NEAR, distance - Math.max(reach, radius)),
    far: distance + radius * BEHIND_FACTOR,
    distance,
  };
}
