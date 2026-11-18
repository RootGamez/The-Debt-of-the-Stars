// La científica en su cámara de frío (hito E4 de docs/plan-finales.md §3.3; ✅ que está congelada y que al despertar
// dice que irá a ver si él está bien; 🟡 cómo se la despierta y lo que dice). Lógica pura (con tests):
// - El lecho de escarcha se calienta **por pasos y sin prisa**: cada paso tiene que asentarse antes del siguiente; si se
//   fuerza, la escarcha se cierra otra vez y se pierde un paso (allí el ciclo apenas avanza: no hay por qué correr).
//   Con el último paso despierta (el deshielo de 6 s lo hace character/absentPoser.ts).
// - Lo que dice depende de lo que sabes de él (🟡 D6: ella no recuerda los ciclos, cada despertar es el primero): sin
//   saber nada pregunta la fecha y quién eres; si ya has hablado con él (una charla `.esceptico` abierta alguna vez),
//   pregunta cosas pequeñas por él; con el Contrapeso en brazos, te pide que se lo lleves.

export const COLD_BED = {
  /** Pasos de calor hasta despertarla. */
  steps: 4,
  /** Lo que tarda cada paso en asentarse (s reales): antes de eso, la escarcha se cierra otra vez. */
  settle: 2.5,
} as const;

/** Las tres charlas de ella (data/pistas/laboratorio.json). Terminan en `.cientifica`: llevan su retrato. */
export const SCIENTIST_TALKS = {
  first: 'lab.cientifica',
  news: 'lab.noticias.cientifica',
  errand: 'lab.encargo.cientifica',
} as const;

export type ScientistTalkId = (typeof SCIENTIST_TALKS)[keyof typeof SCIENTIST_TALKS];

/** El lecho: cuántos pasos lleva, desde dónde venía el calor (en pasos) y cuándo cambió por última vez. */
export interface ColdBedState {
  readonly stage: number;
  readonly from: number;
  readonly at: number;
  readonly awake: boolean;
}

export type WarmResult = 'warmer' | 'too_soon' | 'awake' | 'idle';

export function frozenBed(): ColdBedState {
  return { stage: 0, from: 0, at: Number.NEGATIVE_INFINITY, awake: false };
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** El calor en pasos (puede ir a medias mientras se asienta). */
function level(state: ColdBedState, now: number): number {
  if (!Number.isFinite(state.at) || !Number.isFinite(now)) return state.stage;
  const t = clamp01((now - state.at) / COLD_BED.settle);
  return state.from + (state.stage - state.from) * t;
}

/** El calor del lecho (0 helado, 1 despierta), subiendo o bajando despacio hacia el paso en que está. */
export function bedWarmth(state: ColdBedState, now: number): number {
  return clamp01(level(state, now) / COLD_BED.steps);
}

/** Gira la rueda una vez a los `now` s reales. */
export function warmBed(
  state: ColdBedState,
  now: number,
): { state: ColdBedState; result: WarmResult } {
  if (state.awake) return { state, result: 'idle' };
  const t = Number.isFinite(now) ? now : 0;
  const from = level(state, t);
  if (t - state.at < COLD_BED.settle) {
    const stage = Math.max(0, state.stage - 1);
    return { state: { ...state, stage, from, at: t }, result: 'too_soon' };
  }
  const stage = state.stage + 1;
  const awake = stage >= COLD_BED.steps;
  return { state: { stage, from, at: t, awake }, result: awake ? 'awake' : 'warmer' };
}

/** Ya has hablado con él alguna vez (cualquier charla con su retrato, `.esceptico`). */
export function heardFromHim(opened: ReadonlySet<string>): boolean {
  for (const id of opened) if (id.endsWith('.esceptico')) return true;
  return false;
}

/** El lector del lecho (data/pistas/laboratorio.json). */
export const COLD_BED_SOURCE = 'lab.lecho';
const TALK_IDS: readonly string[] = Object.values(SCIENTIST_TALKS);

/**
 * ¿Esta fuente no se puede leer ahora? Sus charlas: todas mientras duerme y, despierta, todas menos la que toca. El
 * lecho, en cuanto despierta. Las demás fuentes no son cosa suya.
 */
export function scientistGone(sourceId: string, awake: boolean, talk: ScientistTalkId): boolean {
  if (sourceId === COLD_BED_SOURCE) return awake;
  if (!TALK_IDS.includes(sourceId)) return false;
  return !awake || sourceId !== talk;
}

/** Qué charla toca: con el Contrapeso en brazos manda el encargo; si no, lo que sabes de él. */
export function scientistTalk(input: {
  opened: ReadonlySet<string>;
  carrying: boolean;
}): ScientistTalkId {
  if (input.carrying) return SCIENTIST_TALKS.errand;
  return heardFromHim(input.opened) ? SCIENTIST_TALKS.news : SCIENTIST_TALKS.first;
}
