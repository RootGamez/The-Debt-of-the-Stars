// Los números de los lectores de puzle (plan de la Fase 7, hito 7E). Los textos son de Anthony: aquí solo
// van la mecánica y rótulos neutros (borradores). Los ritmos son los de CONTEXTO_PLANETAS.md.

export interface NotebookConfig {
  /** Nombre del otro reloj anotado junto al de Umbral. */
  other: string;
  /** Su ritmo (Archivo: 0,80). */
  otherRate: number;
  /** Minutos de Umbral entre una anotación y la siguiente. */
  stepMinutes: number;
  rows: number;
}

/** El cuaderno del turno de Umbral: horas de Umbral y del Archivo, que se separan. */
export const NOTEBOOK: NotebookConfig = {
  other: 'Archivo',
  otherRate: 0.8,
  stepMinutes: 150,
  rows: 6,
};

export interface Letter {
  id: string;
  title: string;
  /** Reloj con que se fechó (nombre) y su ritmo respecto a Umbral. */
  clock: string;
  rate: number;
  /** Día escrito en la carta, en su propio reloj. */
  day: number;
}

/**
 * Las cartas del Archivo: por sus fechas parecen contestar antes de haber sido enviadas; puestas en días de
 * Umbral, se ordenan. Rótulos provisionales.
 */
export const LETTERS: readonly Letter[] = [
  {
    id: 'investigadora',
    title: 'Carta desde el destino sin nombre',
    clock: 'el destino sin nombre',
    rate: 0.2,
    day: 3,
  },
  { id: 'consejo', title: 'Respuesta del Consejo', clock: 'Umbral', rate: 1, day: 12 },
  { id: 'archivista', title: 'Nota del archivista', clock: 'el Archivo', rate: 0.8, day: 16 },
  { id: 'informe', title: 'Informe archivado', clock: 'el Archivo', rate: 0.8, day: 8 },
];
