// La Balanza del Contrapeso, en la isla de la Cuna del Taller (plan de historia y puzzles físicos, P6): una palanca se
// equilibra cuando peso por distancia es igual a cada lado, y eso no depende de la gravedad: en el Taller todo pesa
// menos, pero la balanza se equilibra igual. A un lado cuelga la maqueta del motor viejo; al otro, seis muescas y tres
// pesas de 1, 2 y 3. Lógica pura (con tests); la vista va aparte.

export const BALANCE = {
  /** La maqueta del motor viejo: seis medidas a dos del eje (la placa de Cicatriz lo dice). */
  model: { weight: 6, distance: 2 },
  /** Las muescas del otro brazo, a 1, 2, … 6 medidas del eje. */
  notches: 6,
  /** Las pesas que hay por la isla. */
  weights: [1, 2, 3] as readonly number[],
} as const;

/** Lo que hay en cada muesca (por su número: la distancia al eje) y lo que pesa. */
export type BalancePlacement = Readonly<Partial<Record<number, number>>>;

/** Peso por distancia, sumado (el brazo de las muescas). */
export function torqueOf(placement: BalancePlacement): number {
  let total = 0;
  for (let notch = 1; notch <= BALANCE.notches; notch++) total += notch * (placement[notch] ?? 0);
  return total;
}

/**
 * Equilibrada: los dos lados valen lo mismo. `gravity` es la del sitio: el peso de todo cambia con ella, el equilibrio
 * no (por eso se acepta y no pesa).
 */
export function isBalanced(placement: BalancePlacement, gravity = 1): boolean {
  const g = gravity > 0 ? gravity : 1;
  const model = BALANCE.model.weight * g * BALANCE.model.distance;
  return Math.abs(torqueOf(placement) * g - model) < 1e-9;
}

/** Cuánto se inclina la viga (−1 a 1): negativo hacia la maqueta, positivo hacia las pesas, 0 en equilibrio. */
export function leanOf(placement: BalancePlacement): number {
  const model = BALANCE.model.weight * BALANCE.model.distance;
  const diff = torqueOf(placement) - model;
  return Math.max(-1, Math.min(1, diff / model));
}
