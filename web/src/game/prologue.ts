// El final del prólogo (Fase 9; ✅ cambio de Anthony, 2026-11-06): tras examinar el fragmento de la Luna, al
// volver a sentarse en el Albatros II empieza la cinemática del gusano (game/wormholeCinematic.ts, su apertura en
// game/wormhole.ts) y el fundido a blanco lleva al sistema ajeno (core/loopDirector.ts, causa `gusano`).

/** Dónde se abre el gusano, qué hecho lo despierta (haber examinado el fragmento) y cuánto tarda en empezar (s). */
export const WORMHOLE = {
  world: 'luna',
  source: 'instituto.fragmento_luna',
  fact: 'casa.fragmento_antiguo',
  after: 0.6,
} as const;

export interface PrologueFrame {
  /** Mundo donde estás (a pie, o el marco de la nave al pilotar). */
  world: string | undefined;
  /** Sentado en el asiento del Albatros II (pilotando). */
  seated: boolean;
  /** El tiempo del juego corre (sin pausa ni lectura). */
  running: boolean;
  /** Ya sabes lo que despierta el gusano (has examinado el fragmento). */
  knowsFragment: boolean;
}

export interface PrologueGate {
  /** Una vez por fotograma; devuelve `true` (una sola vez) cuando empieza la cinemática del gusano. */
  update(frame: PrologueFrame, dt: number): boolean;
}

export function createPrologueGate(
  gate: { world: string; after: number } = WORMHOLE,
): PrologueGate {
  let there = 0;
  let open = false;
  return {
    update({ world, seated, running, knowsFragment }, dt) {
      if (open) return false;
      if (world !== gate.world || !seated || !knowsFragment) {
        there = 0;
        return false;
      }
      if (running && dt > 0) there += dt;
      open = there >= gate.after;
      return open;
    },
  };
}
