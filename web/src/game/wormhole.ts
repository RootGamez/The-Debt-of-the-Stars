// La apertura del gusano junto al fragmento de la Luna (Fase 9E, 🟡), como lógica pura: cuánto ha avanzado y lo
// que se ve en cada momento. Un anillo de luz se abre delante del fragmento, las estrellas se doblan a su alrededor
// (la misma lente que el Nudo y el agujero negro), la vista se estira y un zumbido sube; al terminar, el fundido a
// blanco de la Cámara (core/loopDirector.ts, causa `gusano`) se lleva al jugador al sistema ajeno.
// render/wormholeView.ts lo dibuja.
import { Vector3 } from 'three';

export const WORMHOLE_SEQUENCE = {
  /** Lo que dura, en segundos, desde que se abre hasta que llega el fundido a blanco. */
  seconds: 3.5,
  /** Radio del anillo al abrirse del todo (m). */
  ringRadius: 2.6,
  /** Cuánto por encima del fragmento se abre su centro (m): a la altura de los ojos. */
  rise: 1.6,
  /** Cuánto más allá del fragmento, visto desde quien lo abre (m): que lo enmarque y no lo envuelva. */
  behind: 3,
  /** Hasta qué radio (m) "pesa" para la lente al final: de ahí sale cuánto dobla las estrellas. */
  lensRadius: 9,
  /** Cuánto se ensancha la vista al final (fracción del campo de visión). */
  stretch: 0.3,
} as const;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

/** Avance (0–1) a los `elapsed` segundos de abrirse. */
export function wormholeProgress(elapsed: number, seq = WORMHOLE_SEQUENCE): number {
  return clamp01(elapsed / seq.seconds);
}

/** El anillo crece deprisa al principio y se asienta: radio (m) con ese avance. */
export function ringRadius(progress: number, seq = WORMHOLE_SEQUENCE): number {
  const p = clamp01(progress);
  return seq.ringRadius * (1 - (1 - p) ** 3);
}

/** Lo que dobla las estrellas: empieza tarde (cuando el anillo ya se ve) y llega al máximo al final. */
export function lensRadius(progress: number, seq = WORMHOLE_SEQUENCE): number {
  return seq.lensRadius * smoothstep((clamp01(progress) - 0.2) / 0.8);
}

/** Cuánto se ensancha la vista (fracción): al final, como si te estirara. */
export function viewStretch(progress: number, seq = WORMHOLE_SEQUENCE): number {
  return seq.stretch * smoothstep((clamp01(progress) - 0.4) / 0.6);
}

/**
 * Dónde se abre (en el marco de `fragment`): sobre el fragmento y un poco más allá de él, en horizontal, visto desde
 * `eye`; `worldCenter` es el centro del mundo, para saber qué es "arriba".
 */
export function wormholeCenter(
  fragment: Vector3,
  worldCenter: Vector3,
  eye: Vector3,
  seq = WORMHOLE_SEQUENCE,
): Vector3 {
  const up = fragment.clone().sub(worldCenter).normalize();
  const away = fragment.clone().sub(eye);
  away.addScaledVector(up, -away.dot(up));
  if (away.lengthSq() > 1e-6) away.normalize();
  else away.set(0, 0, 0); // justo encima: sin "más allá"
  return fragment.clone().addScaledVector(up, seq.rise).addScaledVector(away, seq.behind);
}
