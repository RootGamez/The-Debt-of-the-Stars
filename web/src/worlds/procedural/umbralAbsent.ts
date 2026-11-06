// Los Ausentes en los edificios de Umbral (plan de la llegada, hito E): tallados en relieve en la piedra (murales, y
// el panel a medio tallar del Tallista) y proyectados como una pila de anillos de luz sobre la mesa de la Sala de
// Mando. Las piezas del Ausente están en character/absent.ts.
import type { BufferGeometry } from 'three';
import {
  ABSENT_HEIGHT,
  absentParts,
  absentProfile,
  type AbsentMaterial,
  type AbsentShape,
} from '../../character/absent';
import {
  ball,
  box,
  cone,
  pieceMatrix,
  torus,
  triangleCount,
  type Frame,
  type PieceKind,
  type PieceSet,
  type Triple,
} from './kit';
import { PALETTE as P } from './umbralPalette';

/** Brillo de los dibujos de luz de los murales (vidrio que aún guarda luz). */
const MURAL_GLOW = 2.2;
/** Brillo de la proyección. */
const PROJECTION_GLOW = 2.6;
/** Separación (m) entre anillos de la proyección, en el tamaño real del Ausente. */
const RING_STEP = 0.12;
/** Más allá de esta distancia al eje (m) están los brazos. */
const ARM_CLEARANCE = 0.32;

/** La geometría de una pieza; `coarse` (relieves, que se ven de frente) con menos caras. */
function geometryOf(shape: AbsentShape, coarse = false): BufferGeometry {
  if (shape.kind === 'box') return box();
  if (shape.kind === 'ball') return ball(1, coarse ? 0 : 1);
  return cone(shape.bottom, shape.top, coarse ? 6 : 8);
}

/** Triángulos de un Ausente entero (presupuesto de personajes: ≤ 3k). */
export function absentGeometryCount(): number {
  return absentParts().reduce((sum, p) => sum + triangleCount(geometryOf(p.shape)), 0);
}

/** Cómo se ve cada material tallado en la piedra de Umbral. */
const CARVED: Record<AbsentMaterial, { color: string; kind: PieceKind; glow?: number }> = {
  ceramic: { color: P.sandstoneLight, kind: 'stone' },
  glass: { color: P.slate, kind: 'metal' },
  copper: { color: P.copper, kind: 'metal' },
  glow: { color: P.absentGlow, kind: 'light', glow: MURAL_GLOW },
};

export interface ReliefOptions {
  /** Dónde van los pies (marco del lugar) y hacia dónde mira el relieve (giro en Z; 0 = hacia +Y). */
  at: Triple;
  turn: number;
  /** Tamaño respecto al Ausente real y cuánto sobresale de la pared (1 = bulto redondo). */
  scale: number;
  depth: number;
  /** Solo lo tallado hasta esta fracción de la altura (el panel a medio tallar). */
  carvedUpTo?: number;
}

/** Un Ausente tallado en relieve, con el cobre y el vidrio incrustados. */
export function absentRelief(v: PieceSet, f: Frame, options: ReliefOptions): void {
  const { at, turn, scale, depth, carvedUpTo = 1 } = options;
  const place = f.at(at, [0, 0, turn], [scale, scale * depth, scale]);
  for (const p of absentParts()) {
    if (p.position[2] > carvedUpTo * ABSENT_HEIGHT) continue;
    // A medio tallar, los brazos aún no se han sacado de la piedra (sueltos parecerían flotar).
    if (carvedUpTo < 1 && Math.abs(p.position[0]) > ARM_CLEARANCE) continue;
    const look = CARVED[p.material];
    v.add(
      look.color,
      geometryOf(p.shape, true),
      place.clone().multiply(pieceMatrix(p.position, p.rotation, p.scale)),
      look.kind,
      { solid: false, glow: look.glow ?? 1, vary: look.kind === 'light' ? 0 : 0.03 },
    );
  }
}

/** Un Ausente hecho de anillos de luz horizontales que siguen su silueta (la proyección de la Sala de Mando). */
export function absentRings(v: PieceSet, f: Frame, at: Triple, scale: number): void {
  for (let z = RING_STEP / 2; z < ABSENT_HEIGHT; z += RING_STEP) {
    const radius = absentProfile(z) * scale;
    if (radius < 0.02) continue;
    v.add(
      z > 2.3 ? P.absentGlow : P.standby,
      torus(1, 0.012 / radius, 16, 3),
      f.at([at[0], at[1], at[2] + z * scale], [Math.PI / 2, 0, 0], [radius, radius, radius]),
      'light',
      { glow: PROJECTION_GLOW, vary: 0, solid: false },
    );
  }
}

/** El rayo que sube de la mesa a la proyección: tres varillas de luz finas. */
export function projectionBeam(v: PieceSet, f: Frame, at: Triple, height: number): void {
  for (let k = 0; k < 3; k++) {
    const a = (Math.PI * 2 * k) / 3;
    v.add(
      P.standby,
      box(),
      f.at([at[0] + Math.cos(a) * 0.5, at[1] + Math.sin(a) * 0.5, at[2] + height / 2], undefined, [
        0.015,
        0.015,
        height,
      ]),
      'light',
      { glow: 1.6, vary: 0, solid: false },
    );
  }
}
