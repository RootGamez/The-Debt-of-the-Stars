// Puertas plegadas (marcas PASO_): dos anillos gemelos que comparten un mismo paso. Al cruzar uno se aparece
// delante del otro, aunque esté en la otra cara de la cáscara del Nudo: su espacio está doblado. Lógica pura;
// el juego (main.ts) mueve al jugador con lo que devuelve.
import { Vector3 } from 'three';

export interface Gate {
  name: string;
  /** Pie del anillo, en el suelo (marco del mundo). */
  position: Vector3;
  /** Arriba del suelo ahí (hacia el centro si está dentro de la cavidad). */
  up: Vector3;
  /** Hacia dónde mira el anillo: se sale por ese lado. */
  forward: Vector3;
  /** Nombre del anillo gemelo. */
  target: string;
}

/** Medio ancho y alto del hueco del anillo (m): por fuera de eso se pasa de largo. */
export const GATE_HALF_WIDTH = 1.4;
export const GATE_HEIGHT = 2.8;
/** A cuánto delante del gemelo se aparece (lejos del plano del anillo: no se vuelve a cruzar sin querer). */
export const EXIT_DISTANCE = 3;
/** Tras cruzar, los anillos no vuelven a plegar el paso hasta pasado este tiempo (s): si se llega andando
 * hacia atrás, da tiempo a soltar la tecla antes de cruzar el gemelo. */
export const REFOLD_SECONDS = 1.5;
/** Un paso más largo que esto no es caminar (es un teletransporte o un reinicio): no cruza nada. */
const MAX_STEP = 12;

const offset = new Vector3();
const crossing = new Vector3();
const side = new Vector3();

/** El anillo que cruzan los pies al ir de `from` a `to` en un paso, si cruzan alguno. */
export function findCrossing(from: Vector3, to: Vector3, gates: readonly Gate[]): Gate | undefined {
  if (from.distanceTo(to) > MAX_STEP) return undefined;
  for (const gate of gates) {
    const before = offset.subVectors(from, gate.position).dot(gate.forward);
    const after = offset.subVectors(to, gate.position).dot(gate.forward);
    if (before === after || Math.sign(before) === Math.sign(after)) continue;
    // Punto donde el paso atraviesa el plano del anillo: ¿cae dentro del hueco?
    crossing.copy(from).lerp(to, before / (before - after));
    offset.subVectors(crossing, gate.position);
    const height = offset.dot(gate.up);
    side.crossVectors(gate.forward, gate.up);
    const lateral = Math.abs(offset.dot(side));
    if (lateral <= GATE_HALF_WIDTH && height >= -0.5 && height <= GATE_HEIGHT) return gate;
  }
  return undefined;
}

/** Dónde y cómo queda el jugador al salir por un anillo (copias nuevas: nada se comparte con él). */
export function gateArrival(gate: Gate): { feet: Vector3; forward: Vector3; up: Vector3 } {
  return {
    feet: gate.position.clone().addScaledVector(gate.forward, EXIT_DISTANCE),
    forward: gate.forward.clone(),
    up: gate.up.clone(),
  };
}
