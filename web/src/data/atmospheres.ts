// Los mundos con aire (Fase 9): desde su suelo se ve un cielo en vez del espacio. Solo Hogar, el único mundo vivo;
// los del sistema ajeno no tienen (CONTEXTO_PLANETAS.md). Colores de amanecer: la estrella baja al este.

export interface Atmosphere {
  /** Color del cielo arriba, en el horizonte, alrededor de la estrella y bajo el horizonte. */
  zenith: number;
  horizon: number;
  glow: number;
  ground: number;
  /** Metros sobre el suelo a los que el aire se acaba y vuelve a verse el espacio. */
  height: number;
}

export const ATMOSPHERES: Readonly<Record<string, Atmosphere>> = {
  hogar: { zenith: 0x7fb0d6, horizon: 0xf0c49c, glow: 0xffdcae, ground: 0xb8a48e, height: 110 },
};
