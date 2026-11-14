// La burbuja del Contrapeso (hito E2 de docs/plan-finales.md §3.1). ✅ Anthony (2026-11-13): el Contrapeso es
// contrario a la gravedad, comprime el espacio-tiempo a su alrededor y cerca de él el tiempo corre deprisa; llevarlo
// frena el ciclo para todo el sistema. 🟡 los números (docs/biblia-textos.md §9), hasta que Anthony los fije.
// En modo B (el tiempo real es el del jugador) un ritmo N hace que el ciclo avance N veces más despacio: en el
// Laboratorio, un minuto real son 12 s del ciclo; llevándolo, 24 s. La regla está en game/counterweight.ts.

export const BUBBLE = {
  /** En su Banco del Laboratorio, donde lleva años: el Laboratorio corre ×5 respecto al Nudo. */
  bench: 5,
  /** Llevándolo encima o en el relicario de la nave: tu reloj corre ×2,5 allá donde estés. */
  carried: 2.5,
} as const;
