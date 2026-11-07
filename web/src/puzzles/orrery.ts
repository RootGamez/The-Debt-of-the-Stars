// El Planetario de la Gran Nave del Archivo (plan de historia y puzzles físicos, P2): los planetarios de engranajes
// reproducen cómo giran los mundos (los lejanos, más despacio: Kepler) y sirven para saber cuándo se alinean. Seis
// rieles desde la Brasa, cinco esferas y un riel sin mundo. Lógica pura (con tests); la vista va aparte.

export type SphereId = 'taller' | 'cicatriz' | 'archivo' | 'umbral' | 'observatorio';

export const ORRERY = {
  rails: 6,
  /** El orden de los mundos desde la Brasa: el riel 5 (entre Umbral y el Observatorio) no tiene mundo. */
  spheres: ['taller', 'cicatriz', 'archivo', 'umbral', 'observatorio'] as readonly SphereId[],
  emptyRail: 5,
} as const;

const RAILS: Readonly<Record<SphereId, number>> = {
  taller: 1,
  cicatriz: 2,
  archivo: 3,
  umbral: 4,
  observatorio: 6,
};

/** El riel de cada esfera (1 = el más cercano a la Brasa). */
export function railOfSphere(id: SphereId): number {
  return RAILS[id];
}

/** Lo que hay en cada riel (por su número). */
export type OrreryPlacement = Readonly<Partial<Record<number, SphereId | undefined>>>;

/** Todas las esferas en su riel y el quinto, vacío. */
export function isOrreryRight(placement: OrreryPlacement): boolean {
  for (let rail = 1; rail <= ORRERY.rails; rail++) {
    const expected = ORRERY.spheres.find((id) => RAILS[id] === rail);
    if (placement[rail] !== expected) return false;
  }
  return true;
}

/** Vueltas que da el riel mientras el más lejano da una (la tercera ley de Kepler, en vueltas enteras de la manivela). */
export function revolutions(rail: number): number {
  const turns = [60, 32, 20, 12, 8, 6];
  return turns[rail - 1] ?? 1;
}

/**
 * Los ángulos (grados) de los seis rieles cuando la manivela lleva recorrido `progress` (0–1): salen de donde estaban
 * y al terminar quedan todos en una misma línea (el ángulo 0 de más vueltas enteras): la alineación.
 */
export function alignedAngles(progress: number, start: readonly number[]): number[] {
  const k = Math.min(1, Math.max(0, progress));
  return start.map((angle, index) => {
    const turns = revolutions(index + 1);
    // Del ángulo inicial al próximo múltiplo de 360 tras dar sus vueltas.
    const end = Math.ceil(angle / 360) * 360 + turns * 360;
    return angle + (end - angle) * k;
  });
}
