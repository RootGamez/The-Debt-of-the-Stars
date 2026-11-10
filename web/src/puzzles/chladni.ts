// La placa que canta, en la Fundición de Cicatriz (plan de historia y puzzles físicos, P7): Chladni (1787) echó arena
// sobre una placa de metal y la hizo vibrar; la arena se junta en las líneas que no se mueven y dibuja figuras que
// cambian según por dónde se sujete la placa. Seis agujeros en el borde, tres pinzas: solo un reparto forma el
// símbolo entero (la firma de la frecuencia de una Puerta). Lógica pura (con tests); la vista va aparte.

export const PLATE = {
  /** Agujeros del borde, numerados de 1 a 6. */
  holes: 6,
  /** Pinzas que hay. */
  clamps: 3,
  /** Dónde han de ir para que la arena dibuje el símbolo entero (🟡). */
  symbol: [1, 3, 5] as readonly number[],
} as const;

/** Pone una pinza en un agujero libre o la quita de uno ocupado; con las tres puestas, no admite más. */
export function toggleClamp(clamps: readonly number[], hole: number): number[] {
  if (!Number.isInteger(hole) || hole < 1 || hole > PLATE.holes) return [...clamps];
  if (clamps.includes(hole)) return clamps.filter((h) => h !== hole);
  if (clamps.length >= PLATE.clamps) return [...clamps];
  return [...clamps, hole].sort((a, b) => a - b);
}

/** Las pinzas están justo donde pide el símbolo. */
export function isSymbol(clamps: readonly number[]): boolean {
  return (
    clamps.length === PLATE.symbol.length && PLATE.symbol.every((hole) => clamps.includes(hole))
  );
}

export interface SandFigure {
  /** Cuántos aros de arena se forman: uno por pinza que está en su sitio. */
  rings: number;
  /** Una raya de arena por cada pinza (el agujero por el que pasa). */
  spokes: number[];
  /** Los dos aros y las marcas del símbolo entero. */
  symbol: boolean;
}

/** La figura de la arena con esas pinzas. */
export function figureOf(clamps: readonly number[]): SandFigure {
  const sorted = [...clamps].sort((a, b) => a - b);
  return {
    rings: sorted.filter((hole) => PLATE.symbol.includes(hole)).length,
    spokes: sorted,
    symbol: isSymbol(sorted),
  };
}
