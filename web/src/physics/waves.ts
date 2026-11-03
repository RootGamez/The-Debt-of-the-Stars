// El oleaje de los mares (Fase 11E, reutilizable en cualquier mundo con agua): una suma de ondas planas en 3D
// evaluadas sobre la esfera del mar. La misma cuenta la hacen la física (flotar, nadar, que la nave se mezca) y el
// shader del océano (render/ocean.ts), así lo que se ve y lo que empuja coinciden. Lógica pura.
import { Vector3 } from 'three';
import { seededRandom } from '../worlds/procedural/noise';

export interface Wave {
  /** Vector de onda (rad/m): su dirección es hacia donde avanza y su largo, 2π / longitud de onda. */
  k: Vector3;
  /** Altura de la cresta sobre el nivel medio (m). */
  amplitude: number;
  /** Frecuencia angular (rad/s). */
  omega: number;
}

/** Longitudes de onda (m) y parte de la altura que lleva cada una: un mar de fondo largo y rizos cortos. */
const SPECTRUM = [
  { length: 15, share: 0.4 },
  { length: 9.5, share: 0.28 },
  { length: 6, share: 0.18 },
  { length: 3.6, share: 0.09 },
  { length: 2.2, share: 0.05 },
] as const;

/** Gravedad de referencia para la relación de las ondas de aguas profundas (ω² = g·k), un poco más lenta. */
const DISPERSION_G = 6;

/**
 * Un oleaje con altura máxima `height` (m): la suma de las amplitudes. Las direcciones salen de `seed` y se
 * reparten alrededor de `wind` (un viento dominante, en el marco del mundo) para que el mar tenga un sentido.
 */
export function createWaves(height: number, seed = 1, wind = new Vector3(1, 0, 0.3)): Wave[] {
  const random = seededRandom(seed);
  const main = wind.clone().normalize();
  return SPECTRUM.map(({ length, share }) => {
    const spread = new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).multiplyScalar(
      0.9,
    );
    const direction = main.clone().add(spread).normalize();
    const k = (2 * Math.PI) / length;
    return {
      k: direction.multiplyScalar(k),
      amplitude: height * share,
      omega: Math.sqrt(DISPERSION_G * k),
    };
  });
}

/** La altura más alta que puede llegar a tener el agua sobre su nivel (m). */
export function maxWaveHeight(waves: readonly Wave[]): number {
  return waves.reduce((sum, w) => sum + w.amplitude, 0);
}

const base = new Vector3();

/**
 * Altura del agua (m, sobre o bajo `level`) en la dirección `direction` (desde el centro, unitaria) en el
 * instante `time` (s). La onda se evalúa en el punto del nivel medio, como en el shader.
 */
export function waveHeight(
  waves: readonly Wave[],
  direction: Vector3,
  level: number,
  time: number,
): number {
  base.copy(direction).multiplyScalar(level);
  let h = 0;
  for (const w of waves) h += w.amplitude * Math.sin(w.k.dot(base) - w.omega * time);
  return h;
}

/**
 * Cómo lleva el oleaje a lo que flota en `direction` (m/s, en `out`): el vaivén de las partículas de agua en la
 * superficie, a lo largo de la superficie. Lo que sube y baja ya lo da la flotación.
 */
export function waveDrift(
  waves: readonly Wave[],
  direction: Vector3,
  level: number,
  time: number,
  out: Vector3,
): Vector3 {
  base.copy(direction).multiplyScalar(level);
  out.set(0, 0, 0);
  for (const w of waves) {
    const speed = w.amplitude * w.omega * Math.cos(w.k.dot(base) - w.omega * time);
    out.addScaledVector(w.k, speed / w.k.length());
  }
  return out.addScaledVector(direction, -out.dot(direction));
}

/** El reloj del oleaje (s): el mismo para la física y para el shader, corra o no el ciclo. */
export function waveClock(): number {
  return performance.now() / 1000;
}
