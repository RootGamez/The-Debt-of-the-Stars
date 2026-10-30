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

// Fase 10 (hito 10A): los tres lectores que enseñan la cuenta del Contrapeso.

export interface TwinsConfig {
  /** El reloj del técnico (el Taller, 0,85: su órbita rapidísima lo atrasa). */
  rate: number;
  /** Día de Umbral en que los dos diarios anotan la misma tormenta. */
  stormDay: number;
  /** Día de Umbral de la última página de la hermana: lo que hay que llevar al diario del técnico. */
  lastDay: number;
}

/** Los diarios de los gemelos: la hermana en Umbral, el técnico en el Taller, los mismos tres meses. */
export const TWINS: TwinsConfig = { rate: 0.85, stormDay: 20, lastDay: 100 };

export interface ConsoleClock {
  id: string;
  /** Rótulo en la consola (el sitio lento no tiene nombre: solo un número de ruta). */
  label: string;
  /** Ritmo respecto a Umbral (CONTEXTO_PLANETAS.md). */
  rate: number;
}

/** La consola de la Cabina de Control: el reloj del Taller frente a los de los otros destinos, en vivo. */
export const CONSOLE_CLOCKS: readonly ConsoleClock[] = [
  { id: 'taller', label: 'Taller', rate: 0.85 },
  { id: 'umbral', label: 'Umbral', rate: 1 },
  { id: 'archivo', label: 'Archivo', rate: 0.8 },
  { id: 'cicatriz', label: 'Cicatriz', rate: 0.6 },
  { id: 'sin_nombre', label: 'Ruta 7 (sin nombre)', rate: 0.2 },
];

/** Minutos de Umbral que corren en la consola por cada segundo real (para que la deriva se vea enseguida). */
export const CONSOLE_MINUTES_PER_SECOND = 1;

export interface RouteLeg {
  place: string;
  /** Minutos de Umbral que pasa allí el Contrapeso. */
  minutes: number;
  /** Ritmo del reloj de ese sitio. */
  rate: number;
}

/** La pizarra del Laboratorio: un viaje de ejemplo del Contrapeso hasta la máquina, que marcha a 0,60. */
export const ROUTE = {
  machineRate: 0.6,
  legs: [
    { place: 'Laboratorio', minutes: 10, rate: 0.2 },
    { place: 'El vuelo', minutes: 5, rate: 1 },
    { place: 'Taller', minutes: 4, rate: 0.85 },
  ] satisfies RouteLeg[],
} as const;
