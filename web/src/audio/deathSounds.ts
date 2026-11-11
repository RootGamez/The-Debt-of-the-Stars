// Qué suena al morir, según la causa. Los cruces (gusano, horizonte, boca) tienen sus propios sonidos de portal y
// el choque de la nave suena en shipAudio.ts; la marea aún no tiene.
import type { DeathCause } from '../core/loopDirector';

const DEATH_SOUNDS: Readonly<Partial<Record<DeathCause, string>>> = {
  caida: 'death.caida',
  ahogado: 'death.ahogado',
  gas: 'death.ahogado',
  calor: 'death.calor',
  absorcion: 'death.absorcion',
  fin: 'death.absorcion',
};

export function deathSoundOf(cause: DeathCause | undefined): string | undefined {
  return cause ? DEATH_SOUNDS[cause] : undefined;
}
