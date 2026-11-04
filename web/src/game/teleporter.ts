// El teletransportador del Taller (Fase 11F; ✅ Anthony 2026-11-03): el anillo de la Pista de Pruebas lleva a la
// Sala del Centro, dentro del gigante, pero solo se enciende durante la secuencia de las 7:00 (cuando los puentes
// de luz unen las islas) y si el reloj de la Pista marca la hora del Taller. Ese reloj empieza cada ciclo
// desajustado (🟡 el error) y se ajusta con dos ruedas, como la cuna del Contrapeso: solo hay que comparar dos
// relojes, nada de cuentas. Lógica pura (con tests); el juego la usa en main.ts y la enseña ui/trackClockBody.ts.

export const TELEPORTER = {
  world: 'taller',
  /** La `cerradura` del anillo PASO_ de la Pista. */
  lock: 'pista',
  /** El evento de la cronología durante el que se puede encender. */
  event: 'secuencia_fabrica',
  /** La fuente con el reloj y sus ruedas. */
  source: 'taller.pista',
  /** Nombre de la malla del velo de luz del anillo (se ve solo cuando está abierto). */
  portal: 'Taller_Portal',
} as const;

/** Cuánto va adelantado el reloj de la Pista al empezar cada ciclo (s): 3 min 17 s (🟡). */
export const TRACK_ERROR = 197;
/** Lo que mueve cada rueda por paso (s). */
export const TRACK_WHEELS = { minutes: 60, seconds: 1 } as const;
/** Margen para dar el reloj por ajustado (s). */
export const TRACK_TOLERANCE = 2;

export type TrackWheel = keyof typeof TRACK_WHEELS;

export interface TrackReading {
  /** La hora del Taller (la de la cabina) y la del reloj de la Pista (s de máquina). */
  taller: number;
  track: number;
  matched: boolean;
}

export interface TrackClock {
  read(): TrackReading;
  turn(wheel: TrackWheel, steps: number): void;
  readonly matched: boolean;
  /** Vuelve a desajustarlo (al empezar cada ciclo). */
  reset(): void;
}

/** `tallerClock()` es la hora del Taller ahora (s de máquina). */
export function createTrackClock(tallerClock: () => number, error = TRACK_ERROR): TrackClock {
  let offset = error;
  const matched = (): boolean => Math.abs(offset) <= TRACK_TOLERANCE;
  return {
    read() {
      const taller = tallerClock();
      return { taller, track: Math.max(0, taller + offset), matched: matched() };
    },
    turn(wheel, steps) {
      offset += TRACK_WHEELS[wheel] * steps;
    },
    get matched() {
      return matched();
    },
    reset() {
      offset = error;
    },
  };
}

/** Si el anillo cerrado con `lock` deja pasar ahora. */
export function teleporterOpen(
  lock: string,
  activeEvents: readonly string[],
  track: Pick<TrackClock, 'matched'>,
): boolean {
  return lock === TELEPORTER.lock && activeEvents.includes(TELEPORTER.event) && track.matched;
}
