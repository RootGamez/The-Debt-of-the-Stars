// La forma del Cerco (lógica pura, sin WebGL): dos círculos máximos que giran en sentidos opuestos alrededor del eje
// de los polos (Y) y SIEMPRE pasan por esos dos polos, que es donde se unen. Cada anillo es una banda de dovelas, y
// no todas están puestas: se construyó desde los polos hacia el ecuador y se dejó a medias (CONTEXTO_HISTORIA, el
// Consejo apostó por sacar energía del sol y el tiempo no alcanzó).
import { Vector3 } from 'three';
import { seededRandom } from '../worlds/procedural/noise';
import type { RingSpec, StructureSpec } from './systemData';

/** Estado de una dovela: puesta con sus captadores, solo el armazón, el andamio con su grúa, o sin poner. */
export type SegmentState = 'terminada' | 'armazon' | 'andamio' | 'faltante';

export interface RingSegment {
  index: number;
  /** Ángulo sobre el anillo: 0 = el ecuador (a lo largo de `u`), π/2 = el polo norte. */
  angle: number;
  state: SegmentState;
}

const TWO_PI = Math.PI * 2;
/** Franja de armazón y de andamio, en fracción del cuarto de anillo (del polo al ecuador). */
const FRAME_BAND = 0.14;
const SCAFFOLD_BAND = 0.07;
/** Las dovelas a menos de esto de un polo (fracción del cuarto) siempre están: los anillos se atan ahí. */
const POLE_ALWAYS_BUILT = 0.08;
const JITTER = 0.05;

/** Azimut (rad) del plano del anillo respecto del eje X, en el instante `t`. */
export function ringAzimuth(ring: RingSpec, t: number): number {
  return ring.phase + (TWO_PI * t) / ring.period;
}

/** El punto del anillo en el ángulo `theta`, en el marco del sistema (origen en la estrella). */
export function ringPoint(ring: RingSpec, theta: number, t: number, target: Vector3): Vector3 {
  const azimuth = ringAzimuth(ring, t);
  const along = Math.cos(theta) * ring.radius;
  return target.set(
    along * Math.cos(azimuth),
    Math.sin(theta) * ring.radius,
    along * Math.sin(azimuth),
  );
}

/** Cuánto falta del polo al ecuador, en fracción lineal del cuarto de anillo: 0 en un polo, 1 en el ecuador. */
export function poleDistance(theta: number): number {
  const wrapped = Math.abs(((((theta + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI); // 0 a π
  const fromEquator = Math.min(wrapped, Math.PI - wrapped); // 0 en el ecuador, π/2 en un polo
  return 1 - fromEquator / (Math.PI / 2);
}

/** Estado de cada dovela del anillo: construido desde los polos, con un frente de obra y un hueco hacia el ecuador. */
export function ringSegments(ring: RingSpec, structure: StructureSpec): RingSegment[] {
  const random = seededRandom(structure.seed * 977 + Math.round(ring.radius));
  const segments: RingSegment[] = [];
  for (let index = 0; index < structure.segments; index++) {
    const angle = (index / structure.segments) * TWO_PI + Math.PI / structure.segments / 2;
    const front = poleDistance(angle) + (random() - 0.5) * JITTER * 2;
    segments.push({ index, angle, state: stateAt(front, ring.complete) });
  }
  return segments;
}

function stateAt(front: number, complete: number): SegmentState {
  if (front <= POLE_ALWAYS_BUILT) return 'terminada';
  if (front <= complete - FRAME_BAND) return 'terminada';
  if (front <= complete) return 'armazon';
  if (front <= complete + SCAFFOLD_BAND) return 'andamio';
  return 'faltante';
}
