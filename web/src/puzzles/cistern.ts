// La Cisterna del Fondo del Cañón (plan de historia y puzzles físicos, P4): un cuerpo sumergido desplaza tanto agua
// como su volumen (Arquímedes), y lo que flota solo desplaza su peso. Echar piedra sube el agua según su tamaño; la
// madera flota y apenas la sube. Si pasa de la tercera marca rebosa por un aliviadero y baja a la segunda.
// Lógica pura (con tests); la vista va aparte.

export type Cargo = 'b1' | 'b2' | 'b3' | 'wood';

export const CISTERN = {
  /** El agua a la que está cada marca de la pared (en partes de piedra). */
  marks: [3, 5, 7] as readonly number[],
  /** Lleno: la barcaza toca el borde. */
  full: 7,
  /** A dónde baja el agua al rebosar: la segunda marca. */
  spill: 5,
  /** Cuánto de cada cosa hay junto a la cisterna. */
  supply: { b1: 3, b2: 3, b3: 3, wood: 2 } as Readonly<Record<Cargo, number>>,
} as const;

const PARTS: Readonly<Record<Cargo, number>> = { b1: 1, b2: 2, b3: 3, wood: 0 };

/** Cuánto sube el agua una pieza (la madera, nada). */
export function partsOf(cargo: Cargo): number {
  return PARTS[cargo];
}

/** El agua tras echar una pieza: sube lo que mide la piedra y, si pasa de lleno, rebosa hasta la segunda marca. */
export function addCargo(level: number, cargo: Cargo): number {
  const next = level + PARTS[cargo];
  return next > CISTERN.full ? CISTERN.spill : next;
}

export function isFull(level: number): boolean {
  return level === CISTERN.full;
}

export function supplyOf(cargo: Cargo): number {
  return CISTERN.supply[cargo];
}
