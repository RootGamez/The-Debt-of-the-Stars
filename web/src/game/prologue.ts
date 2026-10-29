// El final del prólogo (Fase 9): junto al fragmento de la Luna se abre el gusano y el fundido a blanco lleva al
// sistema ajeno (core/loopDirector.ts, causa `gusano`). PROVISIONAL (hito 9A): basta con estar de pie en la Luna
// un momento; en el hito 9E lo abrirá leer el fragmento, con su secuencia.

/** Dónde se abre el gusano y cuánto hay que estar allí, a pie (s). */
export const WORMHOLE = { world: 'luna', after: 2 } as const;

export interface PrologueFrame {
  /** Mundo donde estás a pie. */
  world: string | undefined;
  /** A pie: no pilotando. */
  onFoot: boolean;
  /** El tiempo del juego corre (sin pausa ni lectura). */
  running: boolean;
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
    update({ world, onFoot, running }, dt) {
      if (open) return false;
      if (world !== gate.world || !onFoot) {
        there = 0;
        return false;
      }
      if (running && dt > 0) there += dt;
      open = there >= gate.after;
      return open;
    },
  };
}
