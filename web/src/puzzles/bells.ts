// Las campanas del Anfiteatro de Umbral (plan de historia y puzzles físicos, P1): el plano inclinado de Galileo.
// Una bola rueda por un canal con dieciséis marcas, acelerando; para que cada campana suene a intervalos iguales
// hay que separarlas cada vez más: en las marcas 1, 4, 9 y 16. Lógica pura (con tests); la vista y el sonido van aparte.

export const BELLS = {
  /** Marcas del canal, numeradas desde arriba. */
  marks: 16,
  /** Lo que separa dos marcas (m). */
  spacing: 0.4,
  /** Cuántas campanas hay. */
  count: 4,
  /** Una bola rueda cada tanto (s de Umbral). */
  rollSeconds: 20,
  /** La aceleración de la bola (m/s²): llega a la marca 16 en 4 s. */
  acceleration: 0.8,
  /** Cuánto pueden diferir los intervalos entre campanas para que se oigan a compás. */
  tolerance: 0.02,
} as const;

/** Cuándo suena una campana en cada marca, desde que se suelta la bola (s): √(2·d/a) con d = marca × separación. */
export function ringTimes(marks: readonly number[]): number[] {
  return marks.map((mark) => Math.sqrt((2 * mark * BELLS.spacing) / BELLS.acceleration));
}

/** Cuánto se desvían los intervalos entre toques del intervalo medio (0 = a compás perfecto). */
export function rhythmSpread(marks: readonly number[]): number {
  const times = ringTimes([...marks].sort((a, b) => a - b));
  const gaps = times.map((time, index) => time - (times[index - 1] ?? 0));
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  return mean === 0 ? 1 : Math.max(...gaps.map((gap) => Math.abs(gap - mean))) / mean;
}

/** Suenan a compás: todas puestas, en marcas distintas del canal, con los intervalos iguales. */
export function isInTime(marks: readonly number[]): boolean {
  if (marks.length !== BELLS.count) return false;
  if (new Set(marks).size !== marks.length) return false;
  if (marks.some((m) => !Number.isInteger(m) || m < 1 || m > BELLS.marks)) return false;
  return rhythmSpread(marks) <= BELLS.tolerance;
}

/** Dónde va la bola (m desde arriba) a los `elapsed` s de soltarla; nada si aún no rueda o ya salió del canal. */
export function ballAlong(elapsed: number): number | undefined {
  if (!(elapsed >= 0) || elapsed >= BELLS.rollSeconds) return undefined;
  const along = 0.5 * BELLS.acceleration * elapsed * elapsed;
  return along > BELLS.marks * BELLS.spacing + 1e-9 ? undefined : along;
}

/** Las campanas (por su posición en `marks`) que suenan entre `from` y `to` (s de reloj; la bola rueda cada tanto). */
export function ringsBetween(marks: readonly number[], from: number, to: number): number[] {
  if (!(to > from)) return [];
  const times = ringTimes(marks);
  const rings: number[] = [];
  const firstRoll = Math.floor(from / BELLS.rollSeconds);
  const lastRoll = Math.floor(to / BELLS.rollSeconds);
  for (let roll = firstRoll; roll <= lastRoll; roll++) {
    const start = roll * BELLS.rollSeconds;
    times.forEach((time, index) => {
      const at = start + time;
      if (at > from && at <= to) rings.push(index);
    });
  }
  return rings;
}
