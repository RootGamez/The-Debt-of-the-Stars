// Pega la lógica de sonido de la nave (shipAudio.ts) con los samples: reproduce lo que suena una vez y mantiene
// los cuatro rugidos de las toberas, que arrancan al encenderse el grupo por primera vez, se quedan vivos y
// cambian de volumen y de tono con el empuje. Si todavía no hay audio, lo reintenta en el fotograma siguiente.
import type { ThrusterGroup } from '../ship/thrusters';
import type { LoopHandle, LoopOptions, PlayOptions } from './samplePlayer';
import { createShipAudio, type ShipAudioFrame } from './shipAudio';

/** Lo que hace falta del sonido del juego (el `Soundtrack` lo cumple). */
export interface SoundOutput {
  play(id: string, options?: PlayOptions): boolean;
  loop(id: string, options?: LoopOptions): LoopHandle | undefined;
}

export interface ShipSound {
  update(frame: ShipAudioFrame): void;
  /** La nave se recoloca de golpe: no suenan los cambios de ese salto. */
  reset(): void;
  /** Apaga los rugidos (al cerrar el juego). */
  dispose(): void;
}

const LOOP_IDS: Readonly<Record<ThrusterGroup, string>> = {
  main: 'thr.loop.main',
  retro: 'thr.loop.retro',
  lift: 'thr.loop.lift',
  rcs: 'thr.loop.rcs',
};
const GROUPS = Object.keys(LOOP_IDS) as ThrusterGroup[];
/** Un rugido no arranca por una pizca de empuje. */
const LOOP_START = 0.01;
/** Constantes de tiempo (s) con las que el rugido sigue al empuje y al tono. */
const LEVEL_SMOOTH = 0.12;
const RATE_SMOOTH = 0.2;

export function createShipSound(output: SoundOutput): ShipSound {
  const audio = createShipAudio();
  const handles: Partial<Record<ThrusterGroup, LoopHandle>> = {};

  return {
    update(frame) {
      const { sounds, loops } = audio.update(frame);
      for (const sound of sounds) output.play(sound.id, sound.options);
      for (const group of GROUPS) {
        const target = loops[group];
        let handle = handles[group];
        if (!handle && target.level > LOOP_START) {
          handle = output.loop(LOOP_IDS[group], { level: 0 });
          handles[group] = handle;
        }
        if (!handle) continue;
        handle.setLevel(target.level, LEVEL_SMOOTH);
        handle.setRate(target.rate, RATE_SMOOTH);
      }
    },
    reset() {
      audio.reset();
    },
    dispose() {
      for (const group of GROUPS) {
        handles[group]?.stop();
        handles[group] = undefined;
      }
    },
  };
}
