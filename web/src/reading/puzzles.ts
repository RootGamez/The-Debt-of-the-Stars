// Los puzles de lectura (Fase 7, hito 7E): enseñan a comparar relojes sin pedir ninguna fórmula. Lógica pura;
// ui/puzzlePanel.ts los dibuja. El cuaderno de Umbral: completar la última hora del Archivo siguiendo cómo se
// separan las columnas. Las cartas del Archivo: ordenarlas por cuándo se escribieron de verdad (en días de
// Umbral), aunque sus fechas digan otra cosa.
import type { ConsoleClock, Letter, NotebookConfig, RouteLeg, TwinsConfig } from '../data/puzzles';

export interface Notebook {
  rows: { umbral: number; other: number }[];
  /** La hora del otro reloj en la última fila (lo que hay que completar), en minutos. */
  answer: number;
  /** Opciones para la última fila, en minutos (sin repetir). */
  options: number[];
}

export function notebook({ otherRate, stepMinutes, rows }: NotebookConfig): Notebook {
  const lines = Array.from({ length: rows }, (_, i) => {
    const umbral = i * stepMinutes;
    return { umbral, other: Math.round(umbral * otherRate) };
  });
  const last = lines.at(-1) ?? { umbral: 0, other: 0 };
  const previous = lines.at(-2) ?? last;
  const answer = last.other;
  // La buena, "son iguales" (la trampa), la que repite el último salto sin quedarse atrás y una que se pasa.
  const candidates = [
    answer,
    last.umbral,
    previous.other + stepMinutes,
    Math.round(last.umbral * (2 - otherRate)),
  ];
  const options = [...new Set(candidates)].sort((a, b) => a - b);
  return { rows: lines, answer, options };
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return `${String(h)}:${String(m).padStart(2, '0')}`;
}

/** Día de Umbral en que se escribió una carta: su fecha deshecha con el ritmo de su reloj. */
export function umbralDay(letter: Letter): number {
  return letter.day / letter.rate;
}

/** Ids de las cartas en el orden en que se escribieron de verdad. */
export function lettersInOrder(letters: readonly Letter[]): string[] {
  return [...letters].sort((a, b) => umbralDay(a) - umbralDay(b)).map((l) => l.id);
}

export function checkLetters(letters: readonly Letter[], ids: readonly string[]): boolean {
  const right = lettersInOrder(letters);
  return ids.length === right.length && ids.every((id, i) => id === right[i]);
}

// Fase 10 (hito 10A): los diarios de los gemelos, la consola de la Cabina y la pizarra del Laboratorio.

export interface ChoiceStep {
  answer: number;
  /** Opciones sin repetir, de menor a mayor; incluyen la buena y las trampas típicas. */
  options: number[];
}

function choices(answer: number, traps: readonly number[]): ChoiceStep {
  return { answer, options: [...new Set([answer, ...traps])].sort((a, b) => a - b) };
}

export interface Twins {
  /** El día de la tormenta en el diario del técnico (el de la hermana es `stormDay`). */
  stormTaller: number;
  /** Paso 1: cuántos días se queda atrás el técnico cada `stormDay` días de Umbral. */
  lag: ChoiceStep;
  /** Paso 2: en qué día va el diario del técnico en la última página de la hermana. */
  last: ChoiceStep;
}

/**
 * Una regla de tres guiada: los dos diarios anotan la misma tormenta en días distintos; el atraso crece con el
 * tiempo (no es fijo), así que a los tres meses el técnico va mucho más atrás.
 */
export function twins({ rate, stormDay, lastDay }: TwinsConfig): Twins {
  const stormTaller = Math.round(stormDay * rate);
  const lag = stormDay - stormTaller;
  const answer = Math.round(lastDay * rate);
  return {
    stormTaller,
    // La buena; el día del técnico (no el atraso); el de Umbral (la trampa de que no se atrasa).
    lag: choices(lag, [stormTaller, stormDay]),
    // La buena; el atraso fijo de la tormenta; "van iguales"; al revés (adelantado).
    last: choices(answer, [lastDay - lag, lastDay, lastDay + (lastDay - answer)]),
  };
}

/** Lo que marca cada reloj de la consola tras `umbralMinutes` minutos de Umbral desde que se igualaron. */
export function consoleReadings(
  clocks: readonly ConsoleClock[],
  umbralMinutes: number,
): { id: string; minutes: number }[] {
  return clocks.map((clock) => ({ id: clock.id, minutes: umbralMinutes * clock.rate }));
}

/** El reloj que se queda atrás más deprisa: el del sitio lento. */
export function slowestClock(clocks: readonly ConsoleClock[]): string | undefined {
  return [...clocks].sort((a, b) => a.rate - b.rate)[0]?.id;
}

export interface RouteDrift {
  /** Por tramo: lo que marcan el Contrapeso y la máquina (minutos). */
  legs: { place: string; counterweight: number; machine: number }[];
  /** Minutos que va adelantado (positivo) o atrasado (negativo) al llegar. */
  drift: number;
  /** Las opciones, en minutos con signo. */
  step: ChoiceStep;
}

/** La cuenta de la pizarra: cada tramo suma la diferencia entre el reloj del sitio y el de la máquina. */
export function routeDrift(legs: readonly RouteLeg[], machineRate: number): RouteDrift {
  const rows = legs.map((leg) => ({
    place: leg.place,
    counterweight: leg.minutes * leg.rate,
    machine: leg.minutes * machineRate,
  }));
  const drift = round2(rows.reduce((sum, row) => sum + row.counterweight - row.machine, 0));
  const first = rows[0];
  const firstOnly = first ? round2(first.counterweight - first.machine) : drift;
  // La buena; solo el primer tramo; el signo al revés; "en hora".
  return { legs: rows, drift, step: choices(drift, [firstOnly, -drift, 0]) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 3,4 minutos → "3:24" (minutos y segundos). */
export function formatMinutesSeconds(minutes: number): string {
  const total = Math.round(Math.abs(minutes) * 60);
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, '0')}`;
}

/** −1 → "1:00 atrasado"; 0,5 → "0:30 adelantado"; 0 → "en hora". */
export function formatDrift(minutes: number): string {
  if (Math.abs(minutes) < 1e-9) return 'en hora';
  return `${formatMinutesSeconds(minutes)} ${minutes < 0 ? 'atrasado' : 'adelantado'}`;
}
