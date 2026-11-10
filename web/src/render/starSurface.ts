// La superficie de una estrella (lógica pura, sin WebGL): cuánto brilla cada punto y si cae en una mancha. La usa
// `starModel.ts` para colorear cada cara de la esfera facetada, como los planetas.
import { Vector3 } from 'three';
import { createNoise, seededRandom, type Noise3 } from '../worlds/procedural/noise';

export interface StarSurfaceNoise {
  /** Celdas de granulación (pequeñas, muchas). */
  granules: Noise3;
  /** Manchas (grandes, pocas). */
  spots: Noise3;
}

export interface StarSurfacePoint {
  /** 0 = celda oscura, 1 = celda brillante. */
  granule: number;
  /** 0 = sin mancha, 1 = dentro de una mancha (con borde suave). */
  spot: number;
}

const GRANULE_SCALE = 7;
const SPOT_SCALE = 1.7;
/** Con `spots` 0 el umbral queda por encima de todo el ruido: ni una mancha. */
const SPOT_THRESHOLD_BASE = 0.95;
const SPOT_THRESHOLD_SPAN = 1.25;
const SPOT_EDGE = 0.07;

export function starSurfaceNoise(seed: number): StarSurfaceNoise {
  return { granules: createNoise(seed), spots: createNoise(seed + 101) };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** `point` es una dirección unitaria desde el centro de la estrella. */
export function starSurfaceAt(
  point: Vector3,
  spots: number,
  noise: StarSurfaceNoise,
): StarSurfacePoint {
  const granule =
    0.5 +
    0.5 * noise.granules(point.x * GRANULE_SCALE, point.y * GRANULE_SCALE, point.z * GRANULE_SCALE);
  const field = noise.spots(point.x * SPOT_SCALE, point.y * SPOT_SCALE, point.z * SPOT_SCALE);
  const spot =
    spots <= 0
      ? 0
      : smoothstep(
          SPOT_THRESHOLD_BASE - spots * SPOT_THRESHOLD_SPAN,
          SPOT_THRESHOLD_BASE - spots * SPOT_THRESHOLD_SPAN + SPOT_EDGE,
          field,
        );
  return { granule: Math.min(1, Math.max(0, granule)), spot };
}

/** Dónde nacen las protuberancias: direcciones repartidas con semilla, sin acercarse a los polos. */
export function prominenceSites(count: number, seed: number): Vector3[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const y = (random() * 2 - 1) * 0.8;
    const angle = random() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    return new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
  });
}
