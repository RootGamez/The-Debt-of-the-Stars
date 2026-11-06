// Los mundos con aire: desde su suelo se ve un cielo en vez del espacio. Hogar (Fase 9), el único mundo vivo, con
// su cielo de mañana (Fase 11G); Umbral (Fase 11, ✅ Anthony 2026-11-03), con un aire fino de ocaso que deja ver las estrellas; y el
// Archivo (Fase 11, ✅ Anthony 2026-11-03), con un cielo azul de mar y nubes; el Taller (Fase 11F), sobre su gigante; y el Observatorio, con un aire oscuro (Fase 11).

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
  /** Color del cénit con la estrella alta (mediodía); sin él, el cénit es siempre `zenith`. */
  dayZenith?: number;
  /** Cuánto tapa el cielo de noche (menos que `opacity` deja ver las estrellas); sin él, lo mismo que de día. */
  nightOpacity?: number;
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
  // Fase 12 (✅ Anthony 2026-11-06: más denso, con nubes, y que se note el día y la noche según el lado; 🟡 colores).
  // De día, azul pálido polvoriento arriba y ámbar en el horizonte; en el terminador, el ocaso violeta de siempre
  // (CONTEXTO_PLANETAS.md §3); de noche, casi negro y más fino, para que se vean las estrellas sobre el hielo.
  umbral: {
    zenith: 0x4a3a6c,
    dayZenith: 0x6f93c4,
    horizon: 0xe09a62,
    glow: 0xffc27a,
    ground: 0x8a5a48,
    height: 85,
    opacity: 0.92,
    night: 0x0a0c1c,
    nightOpacity: 0.6,
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
  // 🟡 El Observatorio (Anthony 2026-11-05, «una atmósfera oscura»): un aire finísimo y casi negro, índigo en el
  // horizonte y con apenas un resplandor violeta junto a la estrella; deja ver las estrellas y la imagen del Nudo, que
  // es para lo que está allí. De noche, negro azulado.
  observatorio: {
    zenith: 0x04050e,
    horizon: 0x1b2050,
    glow: 0x5b4f94,
    ground: 0x0a0c20,
    height: 55,
    opacity: 0.5,
    night: 0x02030a,
  },
};
