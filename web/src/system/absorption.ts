// La absorción de los mundos (Fase 8C), como funciones puras. Durante su ventana (cronologia.json), cada mundo
// se estira hacia el agujero negro: la cara que lo mira se alarga mucho más que la de atrás y los lados se
// estrechan (la marea, "espaguetización"); en el último tramo cae dentro, casi entero y la cara cercana un poco
// antes (si se adelanta mucho, sus triángulos se vuelven láminas enormes). Solo se
// deforma lo que se ve: las colisiones no cambian (la absorción mata antes de que importe) y el suelo bajo tus
// pies se queda quieto. render/absorptionView.ts lo dibuja y su sombreador repite la cuenta de `stretchedPoint`.
import { Vector3 } from 'three';

/** La forma del estiramiento; el sombreador de render/absorptionView.ts usa estos mismos números. */
export const STRETCH_SHAPE = {
  /** Cuánto se alarga el mundo al final de su ventana (fracción de su posición a lo largo del eje). */
  maxStretch: 2.5,
  /** Cuánto más tira el agujero de la cara que lo mira (en radios, a estiramiento 1). */
  nearPull: 2,
  /** Desde qué punto de la ventana empieza a caer dentro. */
  fallFrom: 0.6,
  /** Cuánto se adelanta la cara cercana al caer (0 = cae todo a la vez; más, y se rompe en láminas). */
  fallLead: 0.5,
  /** El suelo no se mueve hasta esta distancia de quien mira (m) y se deforma del todo a partir de esta otra. */
  anchorNear: 12,
  anchorFar: 45,
} as const;
const {
  maxStretch: MAX_STRETCH,
  nearPull: NEAR_PULL,
  fallFrom: FALL_FROM,
  fallLead: FALL_LEAD,
  anchorNear: ANCHOR_NEAR,
  anchorFar: ANCHOR_FAR,
} = STRETCH_SHAPE;
/** La marea del agujero: al empezar la ventana y al final (por encima de 0,5 ya acumula tensión). */
const HOLE_TIDE_FROM = 0.3;
const HOLE_TIDE_MAX = 1.4;
/** Lo poco que aún se mueve un mundo tragado, visto desde fuera (nunca del todo quieto). */
const FROZEN = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(from: number, to: number, value: number): number {
  const x = clamp((value - from) / (to - from), 0, 1);
  return x * x * (3 - 2 * x);
}

function unit(progress: number): number {
  return Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
}

/** Avance de la absorción de un mundo en `t` (0 antes de su ventana, 1 al terminarla). */
export function absorptionProgress(
  window: readonly [number, number] | undefined,
  t: number,
): number {
  if (!window) return 0;
  const [start, end] = window;
  if (end <= start) return t >= start ? 1 : 0;
  return unit((t - start) / (end - start));
}

/** Cuánto se ha estirado: suave al principio y cada vez más deprisa. */
function stretchAmount(progress: number): number {
  return MAX_STRETCH * progress * progress;
}

/** Cuánto ha caído hacia el agujero (0–1): solo en el último tramo de la ventana. */
function fallAmount(progress: number): number {
  return smoothstep(FALL_FROM, 1, progress);
}

const axis = new Vector3();
const relative = new Vector3();
const across = new Vector3();

/**
 * Dónde se ve un punto de un mundo que está siendo absorbido (todo en el mismo marco): estirado hacia el
 * agujero y, al final, cayendo en él. Devuelve `target`.
 */
export function stretchedPoint(
  point: Vector3,
  center: Vector3,
  hole: Vector3,
  radius: number,
  progress: number,
  target: Vector3,
): Vector3 {
  const p = unit(progress);
  target.copy(point);
  axis.subVectors(hole, center);
  const distance = axis.length();
  if (p <= 0 || !(radius > 0) || distance < 1e-6) return target;
  axis.divideScalar(distance);
  relative.subVectors(point, center);
  const along = relative.dot(axis);
  across.copy(relative).addScaledVector(axis, -along);
  const stretch = stretchAmount(p);
  const ahead = Math.max(0, along / radius);
  // Se alarga a lo largo del eje y adelgaza a lo ancho, conservando su volumen (como un huso).
  target
    .copy(center)
    .addScaledVector(axis, along * (1 + stretch) + NEAR_PULL * stretch * radius * ahead * ahead)
    .addScaledVector(across, 1 / Math.sqrt(1 + stretch));
  const near = clamp(0.5 + (0.5 * along) / radius, 0, 1);
  return target.lerp(hole, fallAmount(p) ** (1 + FALL_LEAD * (1 - near)));
}

/** Cuánto se deforma el suelo a `distance` metros de quien mira: nada bajo los pies, del todo a lo lejos. */
export function anchorWeight(distance: number): number {
  return smoothstep(ANCHOR_NEAR, ANCHOR_FAR, distance);
}

/** La marea del agujero en un mundo que está siendo absorbido (como las de physics/tides.ts). */
export function holeTide(progress: number): number {
  const p = unit(progress);
  return p > 0 ? HOLE_TIDE_FROM + (HOLE_TIDE_MAX - HOLE_TIDE_FROM) * p : 0;
}

/** Lo deprisa que se mueve un mundo que está siendo absorbido, visto desde fuera (1 = normal). */
export function frozenRate(progress: number): number {
  return 1 - (1 - FROZEN) * unit(progress);
}

/** Lo que ha recorrido un trozo que cae (0 al soltarse, 1 al llegar al agujero): acelera al caer. */
export function debrisTravel(fraction: number): number {
  const x = unit(fraction);
  return x * x;
}
