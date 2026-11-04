// La forma del Taller como gigante de gas (Fase 11F; ✅ la idea, Anthony 2026-11-03): sus medidas y dónde flota cada
// isla. Aparte de taller.ts para que los tests las usen sin construir el mundo. Marco de Blender (Z arriba,
// latitud y longitud en grados); los valores son 🟡, para ajustar jugando.

export const TALLER_ID = 'taller';
/**
 * Radio de la capa de nubes (m): la superficie visible del gigante. No se puede pisar. No más grande: su reloj
 * (system/influence.ts) llegaría a Cicatriz cuando las dos órbitas se acercan.
 */
export const GIANT_RADIUS = 80;
/** Por debajo de este radio las nubes ya matan (causa `gas`). */
export const GAS_LETHAL_RADIUS = 74;
/** Dentro de este radio está la Sala del Centro, a salvo de las nubes. */
export const GAS_SAFE_RADIUS = 22;
/** El núcleo de roca de la Sala del Centro (se camina por encima) y la cáscara oscura que la encierra. */
export const CORE_RADIUS = 8;
export const SHELL_RADIUS = 20;

export type IslandId = 'montaje' | 'cuna' | 'dormitorios' | 'cabina' | 'pista';

export interface IslandSpec {
  id: IslandId;
  lat: number;
  lon: number;
  /** Distancia del centro del gigante a la cara de arriba de la isla (m). */
  top: number;
  /** Radio de la cara de arriba (m). */
  size: number;
  /** Rumbo del lugar (grados desde el norte hacia el este). */
  heading: number;
}

/** Las cinco islas, en el orden en que las unen los puentes de luz de las 7:00. */
export const ISLANDS: readonly IslandSpec[] = [
  { id: 'montaje', lat: 0, lon: 0, top: 99, size: 16, heading: 90 },
  { id: 'cuna', lat: 12, lon: 28, top: 104, size: 11, heading: 120 },
  { id: 'dormitorios', lat: -10, lon: 52, top: 96, size: 11, heading: 60 },
  { id: 'cabina', lat: 8, lon: 78, top: 106, size: 10, heading: 100 },
  { id: 'pista', lat: -4, lon: 104, top: 101, size: 12, heading: 270 },
];

export function islandOf(id: IslandId): IslandSpec {
  const island = ISLANDS.find((i) => i.id === id);
  if (!island) throw new Error(`No existe la isla "${id}"`);
  return island;
}

/** Anchura de los puentes de luz (m). */
export const BRIDGE_WIDTH = 2.6;
/** El evento de la cronología durante el que se encienden (la secuencia de la fábrica, a las 7:00). */
export const BRIDGE_EVENT = 'secuencia_fabrica';
