// Los puzles de lectura (Fase 7, hito 7E): enseñan a comparar relojes sin pedir ninguna fórmula. Lógica pura;
// ui/puzzlePanel.ts los dibuja. El cuaderno de Umbral: completar la última hora del Archivo siguiendo cómo se
// separan las columnas. Las cartas del Archivo: ordenarlas por cuándo se escribieron de verdad (en días de
// Umbral), aunque sus fechas digan otra cosa.
import type { Letter, NotebookConfig } from '../data/puzzles';

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
