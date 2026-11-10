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

/** Paso de los ángulos de las cámaras de sombra (fracción): el ángulo solo cambia a saltos de un 4 %. */
const FOV_STEP = 1.04;
/** Por debajo de este coseno de elevación no se estrecha más el paso de acimut (cerca del polo de la cámara). */
const MIN_COS_ELEVATION = 0.05;

export interface StableAim {
  /** Hacia dónde mira la cámara de sombra (unitario), encajado a texeles enteros. */
  direction: Vector3;
  /** Ángulo vertical total (grados), a saltos de un 4 % y nunca más estrecho que el pedido. */
  fovDegrees: number;
}

/**
 * Apunta la cámara de sombra sin que el mapa tiemble al andar: si se apuntara siempre justo al jugador, cada paso
 * movería los texeles un poco y los bordes de las sombras parpadearían. Así la dirección solo cambia a saltos de
 * un texel entero (en elevación y acimut, con `up` = +Y en la cámara) y el ángulo a saltos de un 4 %, con lo que
 * lo que no se mueve cae siempre en el mismo texel.
 */
export function stableShadowAim(
  star: Vector3,
  focus: Vector3,
  fovDegrees: number,
  mapSize: number,
): StableAim {
  const exponent = Math.ceil(Math.log(Math.max(fovDegrees, 1e-6)) / Math.log(FOV_STEP) - 1e-9);
  const fov = Math.min(MAX_FOV, FOV_STEP ** exponent);
  const direction = new Vector3().subVectors(focus, star);
  if (direction.lengthSq() === 0) return { direction: direction.set(0, 0, -1), fovDegrees: fov };
  direction.normalize();
  const texel = ((fov / 180) * Math.PI) / mapSize;
  const elevation = Math.round(Math.asin(Math.max(-1, Math.min(1, direction.y))) / texel) * texel;
  const azimuthStep = texel / Math.max(MIN_COS_ELEVATION, Math.cos(elevation));
  const azimuth = Math.round(Math.atan2(direction.z, direction.x) / azimuthStep) * azimuthStep;
  const flat = Math.cos(elevation);
  direction.set(flat * Math.cos(azimuth), Math.sin(elevation), flat * Math.sin(azimuth));
  return { direction, fovDegrees: fov };
}
