// Relojes del ciclo. `t` es el tiempo de Umbral (el del colapso y la cronología); `tau` es el tiempo
// propio del jugador. Modo B (decisión de Anthony, CONTEXTO_HISTORIA.md §8): el tiempo real es el del
// jugador y, en un mundo lento, el de fuera avanza más rápido. El modo A queda para probar.

/** 'player' = modo B (tiempo real = jugador) · 'reference' = modo A (tiempo real = Umbral). */
export type TimeMode = 'player' | 'reference';

/** Ritmo mínimo: evita dividir por cero si un mundo tuviera ritmo 0 o negativo por error. */
const MIN_RATE = 0.05;

export interface LoopClock {
  /** Tiempo de Umbral desde el inicio del ciclo (s). */
  t: number;
  /** Tiempo propio del jugador desde el inicio del ciclo (s). */
  tau: number;
  readonly duration: number;
  readonly ended: boolean;
}

export interface ClockSpan {
  from: number;
  to: number;
}

export function createLoopClock(duration: number): LoopClock {
  if (!(duration > 0))
    throw new RangeError(`La duración del ciclo debe ser positiva (${duration})`);
  return {
    t: 0,
    tau: 0,
    duration,
    get ended() {
      return this.t >= this.duration;
    },
  };
}

/**
 * Avanza los relojes `realDt` segundos reales con el ritmo del lugar donde está el jugador.
 * Devuelve el intervalo de tiempo de Umbral recorrido (para no saltarse eventos).
 */
export function advanceClock(
  clock: LoopClock,
  realDt: number,
  rate: number,
  mode: TimeMode,
): ClockSpan {
  const from = clock.t;
  if (!Number.isFinite(realDt) || realDt <= 0) return { from, to: from };
  const r = Number.isFinite(rate) ? Math.max(MIN_RATE, rate) : 1;
  if (mode === 'player') {
    clock.t += realDt / r;
    clock.tau += realDt;
  } else {
    clock.t += realDt;
    clock.tau += realDt * r;
  }
  return { from, to: clock.t };
}

/** 192,7 s → "03:12". */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
