// El agujero negro (plan de la Fase 8; ✅ Anthony, 2026-10-28): nace en la Sala del Motor de Cicatriz a las
// 13:30 y crece con la deuda de la red, deprisa al principio y cada vez más despacio. Los tiempos son del reloj de
// Umbral (como cronologia.json); los tamaños, en metros.

export const BLACK_HOLE = {
  /** Mundo y fuente de lectura donde nace (la Sala del Motor). */
  world: 'cicatriz',
  source: 'cicatriz.sala_motor',
  /** 13:30: nace (el evento `agujero_negro` de la cronología). */
  born: 810,
  /** 15:00: fin del ciclo. */
  end: 900,
  /** Radio del horizonte al final del ciclo. */
  maxRadius: 600,
  /**
   * 🟡 Con el Contrapeso instalado (Fase 10C) nace igual, pero se queda de este tamaño en el núcleo de la máquina:
   * no crece ni se traga nada, y se puede bajar a él con la nave.
   */
  stableRadius: 6,
  /**
   * El palco (CONTEXTO_PLANETAS §7): el último mundo en caer, desde donde se ve el final entero. 🟡 Ahí la marea
   * del agujero se nota, pero no mata.
   */
  palco: 'observatorio',
} as const;
