// Los mundos con aire: desde su suelo se ve un cielo en vez del espacio. Hogar (Fase 9), el único mundo vivo, con
// su cielo de mañana (Fase 11G); Umbral (Fase 11, ✅ Anthony 2026-11-03), con un aire fino de ocaso que deja ver las estrellas; y el
// Archivo (Fase 11, ✅ Anthony 2026-11-03), con un cielo azul de mar y nubes; y el Taller (Fase 11F), sobre su gigante.

export interface Atmosphere {
  /** Color del cielo arriba, en el horizonte, alrededor de la estrella y bajo el horizonte. */
  zenith: number;
  horizon: number;
  glow: number;
  ground: number;
  /** Metros sobre el suelo a los que el aire se acaba y vuelve a verse el espacio. */
  height: number;
  /** Cuánto tapa el cielo a las estrellas con todo el aire encima (1 = del todo; menos, un aire fino). */
  opacity?: number;
  /** Color del cielo cuando la estrella está bajo el horizonte (la cara de noche); sin él, siempre de día. */
  night?: number;
}

export const ATMOSPHERES: Readonly<Record<string, Atmosphere>> = {
  // 🟡 Rehecho en la Fase 11G (✅ "el cielo del planeta de agua", Anthony 2026-11-03): azul de mañana con el horizonte
  // aún cálido; la cara de noche, azul hondo con estrellas.
  hogar: {
    zenith: 0x3576c4,
    horizon: 0xcfe0ea,
    glow: 0xfff0d0,
    ground: 0x88a8b8,
    height: 110,
    opacity: 0.96,
    night: 0x0b1428,
  },
  // 🟡 Ocaso permanente: violeta arriba, ámbar en el horizonte (CONTEXTO_PLANETAS.md §3, «Atmósfera»).
  umbral: {
    zenith: 0x3a2c58,
    horizon: 0xd88a54,
    glow: 0xffb066,
    ground: 0x8a5a48,
    height: 70,
    opacity: 0.78,
    night: 0x140f26,
  },
  // 🟡 Cielo azul de mar, casi opaco de día; de noche, azul hondo con estrellas.
  archivo: {
    zenith: 0x2f6fc0,
    horizon: 0xb4d6ee,
    glow: 0xfff1d6,
    ground: 0x6f9fbf,
    height: 60,
    opacity: 0.95,
    night: 0x0a1428,
  },
  // 🟡 El Taller (Fase 11F): un aire alto de gigante de gas, azul pálido arriba y crema en el horizonte, sobre las
  // nubes en bandas; de noche, azul oscuro con estrellas.
  taller: {
    zenith: 0x3b5d8c,
    horizon: 0xe9c79a,
    glow: 0xffe2b0,
    ground: 0xd9905a,
    height: 90,
    opacity: 0.85,
    night: 0x10131f,
  },
};
