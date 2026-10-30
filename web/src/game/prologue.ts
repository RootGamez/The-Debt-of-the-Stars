// El final del prólogo (Fase 9): junto al fragmento de la Luna se abre el gusano (su secuencia: game/wormhole.ts) y
// el fundido a blanco lleva al sistema ajeno (core/loopDirector.ts, causa `gusano`). Se abre un momento después de
// examinar el fragmento, ya cerrada la lectura y a pie en la Luna.

/** Dónde se abre el gusano, qué hecho lo despierta (haber examinado el fragmento) y cuánto tarda después (s). */
export const WORMHOLE = {
  world: 'luna',
  source: 'instituto.fragmento_luna',
  fact: 'casa.fragmento_antiguo',
  after: 1.5,
} as const;

export interface PrologueFrame {
  /** Mundo donde estás a pie. */
  world: string | undefined;
  /** A pie: no pilotando. */
  onFoot: boolean;
  /** El tiempo del juego corre (sin pausa ni lectura). */
  running: boolean;
  /** Ya sabes lo que despierta el gusano (has examinado el fragmento). */
  knowsFragment: boolean;
}

export interface PrologueGate {
  /** Una vez por fotograma; devuelve `true` (una sola vez) cuando se abre el gusano. */
  update(frame: PrologueFrame, dt: number): boolean;
}

export function createPrologueGate(
  gate: { world: string; after: number } = WORMHOLE,
): PrologueGate {
  let there = 0;
  let open = false;
  return {
    update({ world, onFoot, running, knowsFragment }, dt) {
      if (open) return false;
      if (world !== gate.world || !onFoot || !knowsFragment) {
        there = 0;
        return false;
      }
      if (running && dt > 0) there += dt;
      open = there >= gate.after;
      return open;
    },
  };
}
