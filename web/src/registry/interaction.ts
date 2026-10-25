// Qué fuente tiene el jugador al alcance: cerca y mirándola. Funciones puras sobre posiciones; la
// cámara y las marcas del mundo se leen en main.ts.
import { Vector3 } from 'three';
import type { SourceKind } from './clues';

/** Distancia (m) desde los ojos y media amplitud del cono de mirada (grados) para poder leer. */
export const INTERACT_RANGE = 2.5;
export const INTERACT_HALF_ANGLE_DEGREES = 35;

export interface Interactable {
  id: string;
  /** Posición en el mundo. */
  position: Vector3;
}

export interface InteractOptions {
  range?: number;
  halfAngleDegrees?: number;
}

const toTarget = new Vector3();
const direction = new Vector3();

/**
 * La fuente más cercana que está dentro del alcance y del cono de mirada, o undefined.
 * `forward` no necesita ser unitario; no se modifica ninguno de los argumentos.
 */
export function nearestInteractable(
  eye: Vector3,
  forward: Vector3,
  candidates: readonly Interactable[],
  { range = INTERACT_RANGE, halfAngleDegrees = INTERACT_HALF_ANGLE_DEGREES }: InteractOptions = {},
): Interactable | undefined {
  const minCos = Math.cos((halfAngleDegrees * Math.PI) / 180);
  direction.copy(forward).normalize();
  let best: Interactable | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    toTarget.subVectors(candidate.position, eye);
    const distance = toTarget.length();
    if (distance > range || distance >= bestDistance) continue;
    // Pegado a los ojos no hay dirección: cuenta como "mirándola".
    const inView = distance < 1e-6 || toTarget.dot(direction) / distance >= minCos;
    if (!inView) continue;
    best = candidate;
    bestDistance = distance;
  }
  return best;
}

/** ¿Está `position` a `radius` metros o menos de `center`? (eventos que se presencian) */
export function insideRadius(position: Vector3, center: Vector3, radius: number): boolean {
  return position.distanceTo(center) <= radius;
}

const VERBS: Record<SourceKind, string> = {
  texto: 'leer',
  grabacion: 'escuchar',
  objeto: 'examinar',
  observacion: 'examinar',
  evento: 'observar',
};

/** Texto del aviso: "E · leer" en PC, "Leer" en el botón táctil. */
export function promptLabel(kind: SourceKind, touch: boolean): string {
  const verb = VERBS[kind];
  return touch ? verb.charAt(0).toUpperCase() + verb.slice(1) : `E · ${verb}`;
}
