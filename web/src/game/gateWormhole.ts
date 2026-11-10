// Las Puertas como agujeros de gusano estables (plan de historia y puzzles físicos, T11; pedido de Anthony): el mismo
// gusano que arrastra al explorador en la Luna, pero quieto y siempre abierto. Cerca de él la imagen se deforma: la
// vista se estira, los colores se separan y un destello cálido crece, más cuanto más cerca. Lógica pura (con tests);
// render/gateWormholeView.ts dibuja el velo y game/gateWormhole.ts da lo que hay que aplicar a la pantalla.

export const GATE_WORMHOLE = {
  /** A cuánto (m) empieza a notarse, y desde dónde (m) se nota del todo: al borde de la boca. */
  range: 10,
  near: 1.6,
  /** Lo máximo que estira la vista (fracción del campo de visión) y avance del gusano (0–1) con el que se separan los colores y brilla el destello. */
  stretch: 0.16,
  split: 0.8,
} as const;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Cuánto afecta la boca (0–1) a esa distancia: nada de lejos, todo junto a ella. */
export function proximity(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  const k = clamp01((GATE_WORMHOLE.range - distance) / (GATE_WORMHOLE.range - GATE_WORMHOLE.near));
  return k * k * (3 - 2 * k);
}

/** Cuánto se ensancha la vista con esa cercanía (fracción). */
export function gateStretch(p: number): number {
  return GATE_WORMHOLE.stretch * clamp01(p);
}

/** El «avance» que se da al filtro de la pantalla (colores separados y destello, como el gusano de la Luna). */
export function gateSplit(p: number): number {
  return GATE_WORMHOLE.split * clamp01(p);
}
