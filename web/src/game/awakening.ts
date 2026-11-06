// El primer despertar en Umbral (✅ Anthony, 2026-11-06): tras el gusano, el explorador despierta tumbado bajo el
// cielo ámbar, se queda un momento mirando arriba y se incorpora; entonces saca el cuaderno y escribe su primera
// nota. Solo la primera llegada; en los ciclos siguientes se aparece de pie frente a La Boca. Lógica pura: cuánto
// baja la vista y cuánto mira hacia arriba en cada momento; main.ts lo aplica a la cámara.

export const AWAKENING = {
  /** Lo que se queda tumbado mirando al cielo (s), mientras se aclara el blanco del gusano. */
  lie: 3,
  /** Lo que tarda en incorporarse (s). */
  rise: 2.5,
  /** Cuánto más baja está la vista tumbado (m), sobre los 1,08 de pie. */
  eyeDrop: 0.85,
  /** Cuánto más arriba mira tumbado (rad): casi al cénit. */
  lookUp: 1.3,
} as const;

export interface AwakeningPose {
  /** Cuánto bajar la vista (m). */
  drop: number;
  /** Cuánto girarla hacia arriba (rad). */
  pitch: number;
  /** Ya está de pie. */
  done: boolean;
}

function smoothstep(value: number): number {
  const x = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return x * x * (3 - 2 * x);
}

/** La postura a los `elapsed` segundos de despertar. */
export function awakeningPose(elapsed: number, a = AWAKENING): AwakeningPose {
  const standing = smoothstep((elapsed - a.lie) / a.rise);
  return {
    drop: a.eyeDrop * (1 - standing),
    pitch: a.lookUp * (1 - standing),
    done: elapsed >= a.lie + a.rise,
  };
}
