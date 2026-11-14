import { t } from '../i18n';
import { BUBBLE } from './bubble';
// Los números de los lectores de puzle (plan de la Fase 7, hito 7E). Los textos son de Anthony: aquí solo
// van la mecánica y rótulos neutros (borradores). Los ritmos son los de CONTEXTO_PLANETAS.md. E2: el Laboratorio
// ya no es el sitio lento (0,20) sino el rápido (su burbuja, data/bubble.ts); los textos de las fuentes que lo
// cuentan se reescriben en E6.

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
  other: t('Archivo'),
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
 * Umbral, se ordenan. Rótulos provisionales. La de ella se escribió dentro de la burbuja del Contrapeso: su fecha va
 * por delante (🟡 día 75 de allí = día 15 de Umbral, el mismo de antes con «día 3» a 0,20; el orden bueno no cambia).
 */
export const LETTERS: readonly Letter[] = [
  {
    id: 'investigadora',
    title: t('Carta desde el destino sin nombre'),
    clock: t('el destino sin nombre'),
    rate: BUBBLE.bench,
    day: 75,
  },
  { id: 'consejo', title: t('Respuesta del Consejo'), clock: t('Umbral'), rate: 1, day: 12 },
  { id: 'archivista', title: t('Nota del archivista'), clock: t('el Archivo'), rate: 0.8, day: 16 },
  { id: 'informe', title: t('Informe archivado'), clock: t('el Archivo'), rate: 0.8, day: 8 },
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
  /** Rótulo en la consola (el Laboratorio no tiene nombre: solo un número de ruta). */
  label: string;
  /** Ritmo respecto a Umbral (CONTEXTO_PLANETAS.md). */
  rate: number;
}

/**
 * La consola de la Cabina de Control: el reloj del Taller frente a los de los otros destinos, en vivo. La ruta sin
 * nombre es el Laboratorio, con el Contrapeso en su Banco: el Nudo (1) dentro de su burbuja.
 */
export const CONSOLE_CLOCKS: readonly ConsoleClock[] = [
  { id: 'taller', label: t('Taller'), rate: 0.85 },
  { id: 'umbral', label: t('Umbral'), rate: 1 },
  { id: 'archivo', label: t('Archivo'), rate: 0.8 },
  { id: 'cicatriz', label: t('Cicatriz'), rate: 0.6 },
  { id: 'sin_nombre', label: t('Ruta 7 (sin nombre)'), rate: BUBBLE.bench },
];

/** Minutos de Umbral que corren en la consola por cada segundo real (para que la deriva se vea enseguida). */
export const CONSOLE_MINUTES_PER_SECOND = 1;

export interface RouteLeg {
  place: string;
  /** Minutos de Umbral que pasa allí el Contrapeso. */
  minutes: number;
  /** Ritmo del reloj de ese sitio. */
  rate: number;
  /** Lo que su burbuja acelera su reloj en ese tramo: ×5 en su Banco, ×2,5 llevado (E2). */
  bubble: number;
}

/**
 * La pizarra del Laboratorio: un viaje de ejemplo del Contrapeso hasta la máquina, que marcha a 0,60. E2: el
 * Contrapeso marca a su burbuja y llega muy adelantado (antes, un minuto atrasado); 🟡 los minutos del viaje siguen.
 */
export const ROUTE = {
  machineRate: 0.6,
  legs: [
    { place: t('Laboratorio'), minutes: 10, rate: 1, bubble: BUBBLE.bench },
    { place: t('El vuelo'), minutes: 5, rate: 1, bubble: BUBBLE.carried },
    { place: t('Taller'), minutes: 4, rate: 0.85, bubble: BUBBLE.carried },
  ] satisfies RouteLeg[],
} as const;
