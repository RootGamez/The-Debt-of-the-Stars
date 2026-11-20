// El escéptico en su casa, la Sala del Centro del Taller (plan de finales, E5; lógica pura). Recuerda cada ciclo: lo
// que dice depende de si ya os visteis en otro, de lo que sabes de ella y de si entras con el Contrapeso en brazos.
// Cada momento de la charla es una fuente `charla` propia (ids acabados en `.esceptico`, que les da su retrato); solo
// se ve la del momento. Enseñarle el Contrapeso hace que te dé la fuente de poder y la encaje: el bucle se corta.
import { INTACT_LOOP, type LoopState } from '../core/save';
import { createLoopCore, isLoopCut, moveSource, type LoopCore } from './loopCore';

/** Los momentos de su charla. */
export type SkepticStage = 'saludo' | 'vuelta' | 'ella' | 'contrapeso' | 'cuenta' | 'adios';

/** La fuente de cada momento (🟡 ids propuestos; los textos son borradores). */
export const SKEPTIC_TALK: Readonly<Record<SkepticStage, string>> = Object.freeze({
  saludo: 'taller.saludo.esceptico',
  vuelta: 'taller.vuelta.esceptico',
  ella: 'taller.ella.esceptico',
  contrapeso: 'taller.contrapeso.esceptico',
  cuenta: 'taller.cuenta.esceptico',
  adios: 'taller.adios.esceptico',
});

export const SKEPTIC_TALK_IDS: readonly string[] = Object.freeze(Object.values(SKEPTIC_TALK));

/** La Cámara girando con la fuente dentro: no se ve una vez que la fuente sale. */
export const CAMARA_SOURCE = 'taller.camara';

/** El verbo de enseñarle el Contrapeso (lo traduce `i18n/en.ts`). */
export const SHOW_VERB = 'enseñar';

/** Lo que dice que sabes de ella (🟡; E6 puede sumar los del Laboratorio). */
export const HER_FACTS: readonly string[] = Object.freeze([
  'silencio.investigadora',
  'silencio.dos_investigadores',
  'ellos.ella_congelada',
  'ellos.el_vive',
]);

export interface SkepticSituation {
  /** Ya hablasteis en un ciclo anterior. */
  metBefore: boolean;
  knowsHer: boolean;
  /** Llevas el Contrapeso en brazos. */
  carrying: boolean;
  loopCut: boolean;
}

export function skepticStage(s: SkepticSituation): SkepticStage {
  if (s.loopCut) return 'adios';
  if (s.carrying) return s.knowsHer ? 'cuenta' : 'contrapeso';
  if (s.knowsHer) return 'ella';
  return s.metBefore ? 'vuelta' : 'saludo';
}

export function knowsHer(known: ReadonlySet<string>): boolean {
  return HER_FACTS.some((fact) => known.has(fact));
}

/** Ya os visteis si alguna de sus charlas se abrió antes (en otro ciclo o partida). */
export function metBefore(opened: Iterable<string>): boolean {
  for (const id of opened) if (SKEPTIC_TALK_IDS.includes(id)) return true;
  return false;
}

/**
 * ¿Esta fuente no se puede leer ahora? Sus charlas: todas menos la del momento, y todas si ya no está en su casa
 * (`present` falso). La Cámara, en cuanto el bucle se corta. Las demás fuentes no son cosa suya.
 */
/** ¿Es una fuente de la escéptica (su charla o la cámara)? De las demás no dice nada. */
export function isSkepticSource(sourceId: string): boolean {
  return sourceId === CAMARA_SOURCE || SKEPTIC_TALK_IDS.includes(sourceId);
}

export function skepticGone(sourceId: string, stage: SkepticStage, present: boolean): boolean {
  if (sourceId === CAMARA_SOURCE) return stage === 'adios';
  if (!SKEPTIC_TALK_IDS.includes(sourceId)) return false;
  return !present || sourceId !== SKEPTIC_TALK[stage];
}

/** Con el Contrapeso en brazos, su charla se abre enseñándoselo. */
export function skepticVerb(sourceId: string, stage: SkepticStage): string | undefined {
  const showing = stage === 'contrapeso' || stage === 'cuenta';
  return showing && sourceId === SKEPTIC_TALK[stage] ? SHOW_VERB : undefined;
}

/** Lo que cambia en un ciclo: la fuente, si ya os visteis antes y si ha salido contigo por el portal. */
export interface SkepticState {
  readonly core: LoopCore;
  readonly metBefore: boolean;
  readonly left: boolean;
}

/** Cada ciclo empieza con la fuente en su sitio y él en casa (tras «Sin vuelta», también). */
export function createSkepticState(met: boolean): SkepticState {
  return Object.freeze({ core: createLoopCore(), metBefore: met, left: false });
}

/** Te da la fuente y la encaja en el Contrapeso: el bucle se corta. */
export function handOverSource(state: SkepticState): SkepticState {
  const core = moveSource(state.core, 'inContrapeso');
  return core === state.core ? state : Object.freeze({ ...state, core });
}

/** Sale contigo por el portal; solo una vez cortado el bucle (antes no se mueve de su sitio). */
export function leaveWithYou(state: SkepticState): SkepticState {
  if (state.left || !isLoopCut(state.core)) return state;
  return Object.freeze({ ...state, left: true });
}

/** Lo que se guarda de él: dónde está la fuente y si salió contigo (core/save.ts, versión 7). */
export function skepticLoopState(state: SkepticState): LoopState {
  return { source: state.core.source, left: state.left };
}

/**
 * Lo que se guardó, de vuelta: la fuente donde estaba y él fuera si ya salió. Un estado que no cuadra (haber salido sin
 * que el bucle esté cortado) se queda en casa. `met`: si os visteis antes (sale de las fuentes abiertas, no se guarda aquí).
 */
export function restoreSkepticState(saved: LoopState, met: boolean): SkepticState {
  const fresh = createSkepticState(met);
  if (saved.source === INTACT_LOOP.source) return fresh;
  const cut = moveSource(moveSource(fresh.core, 'inContrapeso'), saved.source);
  return Object.freeze({ core: cut, metBefore: met, left: saved.left });
}
