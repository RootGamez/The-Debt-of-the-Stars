// La forma de la Luna de Hogar por código (Fase 11): una bola gris azulada de 35 m con cráteres y el fragmento más
// grande clavado en la cara que mira a Hogar (CONTEXTO_PLANETAS.md §9). Aparte de luna.ts para que los tests las
// usen sin construir el mundo. Marco de Blender (Z arriba, latitud y longitud en grados); los valores son 🟡.
import { Vector3 } from 'three';
import { angleBetween, clamp, direction, smoothstep, type Surface, type XYZ } from './kit';
import { createNoise, fbm, seededRandom } from './noise';

export const LUNA_ID = 'luna';
export const LUNA_RADIUS = 35;
/** Cuánto sube y baja el suelo sobre el radio (fracción), como en el preset de Blender. */
export const LUNA_RELIEF = 0.04;
export const LUNA_GRAVITY = 0.4;
const NOISE_FREQUENCY = 1.3;

/** Dónde está el fragmento: cerca del centro de la cara que mira a Hogar. */
export const FRAGMENT_SITE = {
  lat: 18,
  lon: -102,
  heading: 200,
  footprint: 2.2,
  sink: 0.7,
} as const;
/** El suelo es llano hasta aquí del fragmento (m) y vuelve al relieve en `FLAT_FADE` más. */
export const FLAT_RADIUS = 9;
const FLAT_FADE = 8;
const CRATERS = 12;

interface Crater {
  direction: Vector3;
  /** Radio angular (rad). */
  radius: number;
  /** Profundidad en unidades de ruido (1 = todo el relieve). */
  depth: number;
}

const noise = createNoise(41);

const craters: readonly Crater[] = (() => {
  const random = seededRandom(43);
  // Dirección uniforme sobre la esfera (z entre −1 y 1).
  return Array.from({ length: CRATERS }, () => {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    return {
      direction: new Vector3(ring * Math.cos(angle), ring * Math.sin(angle), z),
      radius: 0.12 + random() * 0.18,
      depth: 0.4 + random() * 0.5,
    };
  });
})();

const site = direction(FRAGMENT_SITE.lat, FRAGMENT_SITE.lon);

/** Distancia por la superficie (m) hasta el fragmento. */
export function distanceToFragment(d: XYZ): number {
  return angleBetween(d, site) * LUNA_RADIUS;
}

/** Relieve sin allanar, en unidades de ruido (−1 a 1): ruido y cráteres con borde levantado. */
function rawRelief(d: XYZ): number {
  let h = fbm(noise, d.x * NOISE_FREQUENCY, d.y * NOISE_FREQUENCY, d.z * NOISE_FREQUENCY, 4) * 0.9;
  for (const crater of craters) {
    const x = angleBetween(d, crater.direction) / crater.radius;
    if (x < 1) h += crater.depth * (x * x - 1);
    else if (x < 1.4) h += crater.depth * 0.3 * (1 - (x - 1) / 0.4);
  }
  return clamp(h, -1, 1);
}

/** Relieve (−1 a 1) con el suelo del fragmento llano: ahí se posa la nave y caminas. */
export function lunaRelief(d: XYZ): number {
  return rawRelief(d) * smoothstep(FLAT_RADIUS, FLAT_RADIUS + FLAT_FADE, distanceToFragment(d));
}

/** Distancia del centro al suelo en una dirección unitaria. */
export function lunaGround(d: XYZ): number {
  return LUNA_RADIUS * (1 + lunaRelief(d) * LUNA_RELIEF);
}

export const lunaSurface: Surface = { radius: LUNA_RADIUS, groundRadius: lunaGround };
