// La escotilla del suelo y su escalerilla (Fase 11, docs/plan-fase-11-nave.md): con la nave posada se abre la
// trampilla y baja la escalerilla; al despegar se recoge la escalerilla y se cierra. Un solo número `open` (0 = cerrada
// y recogida, 1 = abierta y bajada) avanza con el tiempo; la primera parte del recorrido es la trampilla y la
// segunda, la escalerilla (al cerrar, al revés). Lógica pura, con tests.

/** Lo que tarda en abrirse del todo (s). */
export const HATCH_OPEN_SECONDS = 1.6;
/** Al despegar se recoge más deprisa (s). */
export const HATCH_CLOSE_SECONDS = 0.9;
/** Parte del recorrido que es de la trampilla; el resto, de la escalerilla. */
const DOOR_SHARE = 0.4;

/** Avanza la escotilla un paso: hacia abierta si la nave está posada, hacia cerrada si no. */
export function stepHatch(open: number, landed: boolean, dt: number): number {
  const current = Number.isFinite(open) ? Math.min(1, Math.max(0, open)) : 0;
  if (!(dt > 0)) return current;
  return landed
    ? Math.min(1, current + dt / HATCH_OPEN_SECONDS)
    : Math.max(0, current - dt / HATCH_CLOSE_SECONDS);
}

export interface HatchPose {
  /** Trampilla: 0 cerrada, 1 abierta del todo. */
  door: number;
  /** Escalerilla: 0 recogida, 1 bajada hasta el suelo. */
  ladder: number;
}

function ease(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Cómo se ven la trampilla y la escalerilla para un `open` dado (suavizado en cada tramo). */
export function hatchPose(open: number): HatchPose {
  return {
    door: ease(open / DOOR_SHARE),
    ladder: ease((open - DOOR_SHARE) / (1 - DOOR_SHARE)),
  };
}

/** La escalerilla está bajada del todo: ya se puede bajar o subir por ella. */
export function hatchReady(open: number): boolean {
  return open >= 1;
}
