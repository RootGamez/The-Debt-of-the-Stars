// La cinemática del gusano (✅ Anthony, 2026-11-06): tras examinar el fragmento de la Luna, al volver a sentarse en
// el Albatros II la nave despega sola, el espacio se curva delante, se abre el gusano y arrastra a la nave entera
// hasta su centro, cada vez más deprisa, justo cuando llega el fundido a blanco. Desde que te sientas no se puede
// hacer nada: solo mirar. La nave no vuela con su física: sigue este recorrido (así siempre acaba dentro del anillo).
// Lógica pura: main.ts la conecta con la nave y render/wormholeView.ts pinta el anillo.
import { Vector3 } from 'three';

export const WORMHOLE_CINEMATIC = {
  /** Lo que dura el despegue (s): la nave sube sola hasta `liftHeight`. */
  lift: 2.2,
  /** Cuánto sube al despegar (m). */
  liftHeight: 10,
  /** A cuánto delante de la vista se abre el anillo (m, en horizontal)… */
  ahead: 70,
  /** …y a cuánto por encima de ella (m). */
  above: 18,
  /** El gusano empieza a arrastrar con este avance de la apertura (0–1): cuando el anillo ya se ve. */
  pullFrom: 0.3,
} as const;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

/**
 * Dónde se abre el anillo (en el marco del mundo, cuyo centro es `worldCenter`): delante de `eye` en horizontal,
 * según hacia dónde mira (`look`), y por encima. Si se mira en vertical, justo encima.
 */
export function cinematicCenter(
  eye: Vector3,
  look: Vector3,
  worldCenter: Vector3,
  cine = WORMHOLE_CINEMATIC,
): Vector3 {
  const up = eye.clone().sub(worldCenter).normalize();
  const ahead = look.clone();
  ahead.addScaledVector(up, -ahead.dot(up));
  if (ahead.lengthSq() > 1e-6) ahead.normalize();
  else ahead.set(0, 0, 0);
  return eye.clone().addScaledVector(ahead, cine.ahead).addScaledVector(up, cine.above);
}

/** Cuánto del camino hasta el centro ha recorrido la nave arrastrada (0–1) con ese avance de la apertura. */
export function pullFraction(progress: number, cine = WORMHOLE_CINEMATIC): number {
  const x = clamp01((clamp01(progress) - cine.pullFrom) / (1 - cine.pullFrom));
  return x * x * x; // despacio al principio, cada vez más deprisa
}

/**
 * Dónde está la nave (en el marco del mundo): desde `start` sube al despegar (`elapsed` s) y el gusano la arrastra
 * hasta `center` según el avance de su apertura (`progress`).
 */
export function cinematicShipPosition(
  start: Vector3,
  center: Vector3,
  worldCenter: Vector3,
  elapsed: number,
  progress: number,
  cine = WORMHOLE_CINEMATIC,
): Vector3 {
  const up = start.clone().sub(worldCenter).normalize();
  const lifted = start
    .clone()
    .addScaledVector(up, cine.liftHeight * smoothstep(elapsed / cine.lift));
  return lifted.lerp(center, pullFraction(progress, cine));
}
