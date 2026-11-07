// Dónde están los puzzles físicos de la Gran Nave y de la Ranura del Archivo (plan de historia y puzzles físicos, T6;
// 🟡): el Planetario con sus seis rieles, las cinco esferas en sus pedestales y el prisma con su soporte.
// Latitud y longitud sobre el suelo de la Galería (grados); el resto, en metros.
import { ORRERY, type SphereId } from '../../puzzles/orrery';

/** El centro del Planetario, en la Gran Nave. */
export const ORRERY_AT = { lat: 0, lon: -0.5 } as const;
/** La altura de la mesa y el radio de cada riel (de dentro afuera). */
export const ORRERY_TOP = 0.95;
export const RAIL_RADII: readonly number[] = [0.5, 0.88, 1.26, 1.64, 2.02, 2.4];
/** El ángulo de la ranura de cada riel (grados): cada una a un lado de la mesa, para elegirla andando. */
export function railAngle(rail: number): number {
  return (rail - 1) * 60;
}
/** Cuánto sube la marca de interacción sobre la ranura. */
export const RAIL_MARK_LIFT = 0.3;
/** Lo que se hunde la esfera en su ranura bajo su marca. */
export const SPHERE_LIFT = 0.12;

export interface SphereHome {
  lat: number;
  lon: number;
}

/** Los pedestales de las cinco esferas, por la Gran Nave (lejos de las columnas, de las mesas y de las fuentes). */
export const SPHERE_HOMES: Readonly<Record<SphereId, SphereHome>> = {
  taller: { lat: 3, lon: -23.5 },
  cicatriz: { lat: -3, lon: -14 },
  archivo: { lat: 3, lon: -8.5 },
  umbral: { lat: -3, lon: -9.8 },
  observatorio: { lat: -3, lon: -2.6 },
};

/** El prisma, en el suelo de la Sala de la Ranura, y su soporte junto a la tablilla. */
export const PRISM_HOME = { lat: 3, lon: 96 } as const;
export const STAND_AT = { lat: 1.1, lon: 99.526 } as const;

/** Cuántas esferas hay (para los tests de forma). */
export const SPHERE_COUNT = ORRERY.spheres.length;
