// Los péndulos de la Sala Cerrada (plan de historia y puzzles físicos, P3): Huygens (1665) colgó dos relojes de la
// misma viga y acabaron marchando a la par; y el periodo de un péndulo depende de su largo, no de su peso. Es el
// mecanismo de la red de Puertas: si van juntas, la deuda de una pasa a todas. Cinco péndulos de una viga de cobre
// se mecen al unísono mientras sus largos se parezcan; la trampilla solo cede con la figura que los desacopla.
// Lógica pura (con tests); la vista va aparte.

export const PENDULUMS = {
  count: 5,
  /** Las muescas de cada vara: del 1 (corto) al 5 (largo). */
  notches: 5,
  /** Al empezar el ciclo van todos iguales. */
  start: [3, 3, 3, 3, 3] as readonly number[],
  /** La escalera del Contrapeso: el largo que ha de tener cada uno (🟡). */
  figure: [1, 3, 2, 5, 4] as readonly number[],
  /** Hasta cuánta diferencia de largo la viga los mantiene juntos. */
  couplingSpread: 1,
} as const;

/** Lo que mide cada muesca de largo (m) y la gravedad (m/s²) para el periodo T = 2π√(l/g). */
const UNIT = 0.2;
const G = 9.8;

/** El periodo (s) de un péndulo de `notch` muescas: crece con la raíz del largo; el peso no entra. */
export function period(notch: number): number {
  return 2 * Math.PI * Math.sqrt((notch * UNIT) / G);
}

/** La siguiente muesca al tocar la vara: sube hasta la última y vuelve a la primera. */
export function cycleLength(notch: number): number {
  return notch >= PENDULUMS.notches ? 1 : notch + 1;
}

/** Los largos son los de la figura que desacopla la viga. */
export function isFigure(lengths: readonly number[]): boolean {
  return (
    lengths.length === PENDULUMS.figure.length &&
    lengths.every((length, index) => length === PENDULUMS.figure[index])
  );
}

/** La viga los tiene en vilo: los largos se parecen lo bastante para que se contagien. */
export function coupled(lengths: readonly number[]): boolean {
  return Math.max(...lengths) - Math.min(...lengths) <= PENDULUMS.couplingSpread;
}

/**
 * El ángulo (−1 a 1) del péndulo `index` a los `t` s. Acoplados, todos se mecen igual con el paso del largo medio;
 * sueltos, cada uno a su paso.
 */
export function swing(lengths: readonly number[], index: number, t: number): number {
  if (coupled(lengths)) {
    const mean = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    return Math.sin((2 * Math.PI * t) / period(mean));
  }
  return Math.sin((2 * Math.PI * t) / period(lengths[index] ?? PENDULUMS.start[0] ?? 3));
}
