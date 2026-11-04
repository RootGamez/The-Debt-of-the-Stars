// El epílogo (Fase 10D): en el Archivo de las Puertas, las bocas de casa y los planos del Contrapeso. Al otro lado
// de cada boca se ve un día de Hogar (contado desde que despegaste), pero se llega a ese día corrido por el desfase
// de la boca (K7: sus relojes no marcan lo mismo); la prueba mayor es el día 40 (K8). Solo una deja antes. La boca
// y llevar o no los planos deciden el final (CONTEXTO_HISTORIA.md, Finales). Los números son 🟡.
import type { SourceActions } from '../reading/readingUi';
import { plural, t } from '../i18n';

/** El día de la prueba mayor, contado desde que despegaste. */
export const GREAT_TEST_DAY = 40;
/** La fuente de los planos, en el Banco del Archivo. */
export const PLANS = 'puertas.planos';
/** La fuente de las bocas de casa (su lector es `bocas`). */
export const MOUTHS = 'puertas.bocas';
/** Lo que hay que haber entendido para ver el desfase de cada boca y el día de la prueba. */
export const OFFSETS_CONCLUSION = 'K7';
export const TEST_DAY_CONCLUSION = 'K8';

export type MouthId = 'fragmentos' | 'instituto' | 'anochecer' | 'pronto';

export interface HomeMouth {
  id: MouthId;
  /** Lo que se ve al otro lado. */
  view: string;
  /** El día de Hogar que se ve (desde que despegaste); sin él, la boca está cerrada. */
  seen?: number;
  /** Cuántos días después de lo que se ve se llega al cruzarla. */
  offset?: number;
}

/**
 * La trampa: las tres abiertas se ven antes de la prueba, y la que se ve más cerca de cuando despegaste llega
 * tarde. Solo el Instituto más joven, corregido por su desfase, deja antes.
 */
export const HOME_MOUTHS: readonly HomeMouth[] = [
  { id: 'fragmentos', view: t('La Sala de Fragmentos, llena'), seen: 2, offset: 44 },
  { id: 'instituto', view: t('El Instituto, más joven'), seen: -400, offset: 280 },
  { id: 'anochecer', view: t('Hogar al anochecer'), seen: 38, offset: 12 },
  { id: 'pronto', view: t('Tapada con una losa. Una marca: «pronto».') },
];

/** A: llega antes y sin los planos; B: llega antes con los planos (la profecía autocumplida); tarde: después. */
export type Ending = 'A' | 'B' | 'tarde';

export function mouthById(id: MouthId): HomeMouth | undefined {
  return HOME_MOUTHS.find((m) => m.id === id);
}

/** El día de Hogar al que se llega por la boca, o undefined si está cerrada. */
export function arrivalDay(mouth: HomeMouth): number | undefined {
  if (mouth.seen === undefined) return undefined;
  return mouth.seen + (mouth.offset ?? 0);
}

/** Si la boca deja antes de la prueba mayor. */
export function arrivesBefore(mouth: HomeMouth): boolean {
  const day = arrivalDay(mouth);
  return day !== undefined && day < GREAT_TEST_DAY;
}

/** El final de cruzar por `mouth` llevando o no los planos (undefined: está cerrada). */
export function endingFor(mouth: HomeMouth, carryingPlans: boolean): Ending | undefined {
  if (arrivalDay(mouth) === undefined) return undefined;
  if (!arrivesBefore(mouth)) return 'tarde';
  return carryingPlans ? 'B' : 'A';
}

/** Un día de Hogar contado desde que despegaste, en palabras. */
export function formatHomeDay(day: number): string {
  if (day === 0) return t('el día que despegaste');
  const count = Math.abs(day);
  const days = `${String(count)} ${plural(count, 'día', 'días')}`;
  return day < 0
    ? t('{days} antes de despegar', { days })
    : t('el día {day} desde que despegaste', { day });
}

export interface MouthKnowledge {
  /** K7: las bocas tienen relojes distintos (se ve el desfase). */
  offsets: boolean;
  /** K8: cuándo es la prueba mayor. */
  testDay: boolean;
}

export interface MouthRow {
  id: MouthId;
  view: string;
  open: boolean;
  /** Lo que se ve, en días de Hogar (si está abierta). */
  seen?: string;
  /** Solo con K7: cuánto después se llega. */
  offset?: string;
}

/** Lo que enseña el atril de cada boca: sin K7, solo lo que se ve (la trampa). */
export function mouthRows(knowledge: MouthKnowledge): MouthRow[] {
  return HOME_MOUTHS.map((mouth) => {
    if (mouth.seen === undefined) return { id: mouth.id, view: mouth.view, open: false };
    const offset = mouth.offset ?? 0;
    return {
      id: mouth.id,
      view: mouth.view,
      open: true,
      seen: t('Se ve {day}.', { day: formatHomeDay(mouth.seen) }),
      offset: knowledge.offsets
        ? t(
            'Su reloj va {offset} {days} por delante: se llega {offset} {days} después de lo que se ve.',
            {
              offset,
              days: plural(offset, 'día', 'días'),
            },
          )
        : undefined,
    };
  });
}

/** Solo con K8: el día de la prueba mayor. */
export function testDayLine(knowledge: MouthKnowledge): string | undefined {
  return knowledge.testDay
    ? t('La prueba mayor es {day}.', { day: formatHomeDay(GREAT_TEST_DAY) })
    : undefined;
}

export interface EpiloguePlay {
  /** Lleva los planos del Contrapeso. */
  readonly carryingPlans: boolean;
  /** Los planos: primero se examinan; luego se cogen y se pueden dejar otra vez en el Banco. */
  readonly actions: SourceActions;
}

export function createEpiloguePlay(): EpiloguePlay {
  let carrying = false;
  return {
    get carryingPlans() {
      return carrying;
    },
    actions: {
      gone: () => false,
      verb: (id, unread) => {
        if (id !== PLANS || unread) return undefined;
        return carrying ? 'dejar' : 'coger';
      },
      run: (id) => {
        if (id === PLANS) carrying = !carrying;
      },
    },
  };
}
