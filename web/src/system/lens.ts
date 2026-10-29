// La lente del Nudo, en reglas que se pueden restar (plan de la Fase 7, decisión 3). No es física exacta:
// la luz que escapa del Nudo sale curvada y su imagen se ve girada un ángulo fijo HACIA LA BRASA, medido
// desde donde estés. Para encontrarlo de verdad hay que girar ese ángulo alejándose de la Brasa; desde dos
// sitios se puede triangular. Las estrellas de detrás sí se doblan como con una lente de verdad (la fórmula
// de una masa puntual), pero solo se nota de cerca. Lógica pura: render/lensView.ts la dibuja.
import { Vector3 } from 'three';

/** Lo que la imagen del Nudo aparece girada hacia la Brasa (rad). La pista "cuánto corregir" dice 18°. */
export const LENS_DEFLECTION = (18 * Math.PI) / 180;
/** Más cerca de la Brasa que esto, la imagen se pierde en su resplandor. */
const GLARE = (2 * Math.PI) / 180;
/** Radio del anillo de las estrellas a 1 m (rad·m): a 300 m son unos 6°, a 2 km menos de 1°. */
const EINSTEIN_SCALE = 30;
const MAX_EINSTEIN = (25 * Math.PI) / 180;
/** Por debajo de esta distancia (m) se ve la cáscara de verdad y la imagen deja de importar. */
export const IMAGE_NEAR = 500;
/** Brillo de la imagen fuera de la alineación: apenas un parpadeo. */
const FAINT = 0.2;

const axis = new Vector3();

/** Gira `v` hacia `target` un ángulo (negativo: alejándose). Devuelve un vector nuevo. */
function turnToward(v: Vector3, target: Vector3, angle: number): Vector3 {
  axis.crossVectors(v, target);
  if (axis.lengthSq() < 1e-12) return v.clone();
  return v.clone().applyAxisAngle(axis.normalize(), angle);
}

/**
 * Dónde se VE el Nudo desde un observador: su dirección real girada hacia la Brasa. `undefined` si queda
 * dentro del resplandor de la Brasa (no se ve).
 */
export function apparentDirection(truth: Vector3, brasa: Vector3): Vector3 | undefined {
  const t = truth.clone().normalize();
  const b = brasa.clone().normalize();
  if (t.angleTo(b) <= LENS_DEFLECTION + GLARE) return undefined;
  return turnToward(t, b, LENS_DEFLECTION);
}

/** Lo que tiene que hacer quien busca el Nudo: girar la imagen alejándose de la Brasa. */
export function trueDirection(apparent: Vector3, brasa: Vector3): Vector3 {
  return turnToward(apparent.clone().normalize(), brasa.clone().normalize(), -LENS_DEFLECTION);
}

/** Punto donde se cruzan (o casi) dos visuales `a + s·da` y `b + u·db`; `undefined` si son paralelas. */
export function triangulate(a: Vector3, da: Vector3, b: Vector3, db: Vector3): Vector3 | undefined {
  const d1 = da.clone().normalize();
  const d2 = db.clone().normalize();
  const w = a.clone().sub(b);
  const p = d1.dot(d2);
  const denominator = 1 - p * p;
  if (denominator < 1e-9) return undefined;
  const s = (p * d2.dot(w) - d1.dot(w)) / denominator;
  const u = (d2.dot(w) - p * d1.dot(w)) / denominator;
  const onA = a.clone().addScaledVector(d1, s);
  const onB = b.clone().addScaledVector(d2, u);
  return onA.add(onB).multiplyScalar(0.5);
}

/** Radio del anillo de estrellas alrededor del Nudo visto desde esa distancia (rad). */
export function einsteinRadius(distance: number): number {
  return Math.min(MAX_EINSTEIN, EINSTEIN_SCALE / Math.max(distance, 1));
}

/**
 * Dónde se ve una estrella que está a `theta` (rad) del Nudo: empujada hacia fuera (la imagen principal de
 * una lente puntual). La misma cuenta la hace el sombreador del cielo (render/lensView.ts).
 */
export function lensedAngle(theta: number, einstein: number): number {
  return (theta + Math.sqrt(theta * theta + 4 * einstein * einstein)) / 2;
}

export interface ClarityInput {
  /** La alineación del Observatorio está en curso. */
  aligned: boolean;
  /** Quien mira está en el Observatorio (o en su marco). */
  inObservatory: boolean;
  /** Distancia al Nudo (m). */
  distance: number;
  /** Segundos reales, para el parpadeo. */
  time: number;
}

/** Cuánto se ve la imagen del Nudo (0–1). */
export function imageClarity({ aligned, inObservatory, distance, time }: ClarityInput): number {
  if (distance < IMAGE_NEAR) return 0;
  if (aligned && inObservatory) return 1;
  const flicker = 0.5 + 0.5 * Math.sin(time * 5.3 + Math.sin(time * 1.7) * 2.5);
  return FAINT * (0.35 + 0.65 * flicker);
}
