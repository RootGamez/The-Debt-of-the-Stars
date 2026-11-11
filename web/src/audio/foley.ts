// Los sonidos del cuerpo del explorador, como lógica pura: de lo que hace (velocidad, suelo, agua, aterrizajes) a
// qué suena y cuándo. Los pasos caen cada media zancada andada (la misma medida que el andar de gait.ts, así que
// los pies y el sonido van juntos); el salto, al dejar el suelo hacia arriba; y el aterrizaje, una vez por cada
// toque, según lo fuerte que fue. `soundOf` dice qué sample suena y con qué variación.
import { RUN_SPEED, WALK_SPEED } from '../data/movement';
import { STRIDE_RUN, STRIDE_WALK } from '../character/gait';
import type { PlayOptions } from './samplePlayer';

export type Surface = 'dust' | 'rock' | 'soft' | 'metal' | 'glass';
export type LandingSeverity = 'light' | 'medium' | 'hard';

export type FoleyEvent =
  | { kind: 'step'; surface: Surface; run: boolean; speed: number }
  | { kind: 'jump' }
  | { kind: 'land'; severity: LandingSeverity; surface: Surface };

export interface FoleyFrame {
  dt: number;
  /** Velocidad sobre el suelo (m/s). */
  speed: number;
  grounded: boolean;
  swimming: boolean;
  /** Velocidad hacia arriba (m/s). */
  verticalSpeed: number;
  /** Veces que ha aterrizado (del motor) y a qué velocidad la última. */
  landings: number;
  landingSpeed: number;
  surface: Surface;
}

export interface Foley {
  /** Un fotograma; devuelve lo que suena en él (casi siempre nada). */
  update(frame: FoleyFrame): readonly FoleyEvent[];
}

/** Qué se pisa en cada mundo. */
const WORLD_SURFACES: Readonly<Record<string, Surface>> = {
  umbral: 'dust',
  hogar: 'soft',
  archivo: 'rock',
  cicatriz: 'rock',
  puertas: 'rock',
  taller: 'metal',
  laboratorio: 'metal',
  anclaje_norte: 'metal',
  anclaje_sur: 'metal',
  observatorio: 'glass',
};

export function surfaceOf(worldId: string | undefined): Surface {
  return (worldId && WORLD_SURFACES[worldId]) || 'rock';
}

/** Por debajo de esto no se oyen pasos (quieto o casi). */
const MIN_STEP_SPEED = 0.5;
/** A partir de esta velocidad se corre. */
const RUN_FROM = (WALK_SPEED + RUN_SPEED) / 2;
/** Al volver al suelo el siguiente paso llega tras esta fracción de zancada. */
const FIRST_STEP_FRACTION = 0.5;
/** Dejar el suelo subiendo más deprisa que esto es un salto (no caerse de un borde). */
const JUMP_RISE = 2;
/** Velocidad de caída (m/s) desde la que un aterrizaje se oye, y los cortes entre fuerzas. */
const LANDING_MIN = 2;
const LANDING_MEDIUM = 4.5;
const LANDING_HARD = 8;

const NONE: readonly FoleyEvent[] = Object.freeze([]);

function severityOf(speed: number): LandingSeverity | undefined {
  if (speed < LANDING_MIN) return undefined;
  if (speed < LANDING_MEDIUM) return 'light';
  return speed < LANDING_HARD ? 'medium' : 'hard';
}

export function createFoley(): Foley {
  let walked = 0;
  let lastLandings: number | undefined;
  let wasGrounded = true;

  return {
    update(frame) {
      const events: FoleyEvent[] = [];
      const onFeet = frame.grounded && !frame.swimming;

      if (lastLandings === undefined) {
        lastLandings = frame.landings;
      } else if (frame.landings !== lastLandings) {
        const severity = frame.landings > lastLandings ? severityOf(frame.landingSpeed) : undefined;
        lastLandings = frame.landings;
        if (severity) events.push({ kind: 'land', severity, surface: frame.surface });
      }

      if (wasGrounded && !frame.grounded && !frame.swimming && frame.verticalSpeed > JUMP_RISE) {
        events.push({ kind: 'jump' });
      }
      wasGrounded = frame.grounded && !frame.swimming;

      if (!onFeet) {
        // En el aire o nadando: el primer paso al volver llega pronto, no a media zancada completa.
        walked = 0;
        return events.length > 0 ? events : NONE;
      }
      if (frame.speed < MIN_STEP_SPEED) {
        walked = Math.min(walked, 0);
        return events.length > 0 ? events : NONE;
      }
      const run = frame.speed > RUN_FROM;
      const halfStride = (run ? STRIDE_RUN : STRIDE_WALK) / 2;
      if (walked === 0) walked = halfStride * (1 - FIRST_STEP_FRACTION);
      walked += frame.speed * frame.dt;
      if (walked >= halfStride) {
        walked -= halfStride;
        events.push({ kind: 'step', surface: frame.surface, run, speed: frame.speed });
      }
      return events.length > 0 ? events : NONE;
    },
  };
}

/** Qué sample suena para un evento y con qué variación. */
export function soundOf(event: FoleyEvent): { id: string; options: PlayOptions } {
  switch (event.kind) {
    case 'step':
      return {
        id: `step.${event.surface}`,
        options: {
          volume: event.run ? 1 : 0.7,
          rate: event.run ? 1.08 : 1,
          pitchJitter: 0.07,
          volumeJitter: 0.15,
        },
      };
    case 'jump':
      return { id: 'jump', options: { volume: 0.6, pitchJitter: 0.05 } };
    case 'land':
      return { id: `land.${event.severity}`, options: { pitchJitter: 0.05 } };
  }
}
