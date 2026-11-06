// Las campanas del Anfiteatro en juego (plan de historia y puzzles físicos, P1): coger una campana del estante,
// ponerla en una marca del canal (o volver a cogerla), la bola que rueda cada 20 s y los toques. Al sonar las cuatro
// a compás se abre el atril (la canción de los mundos). La regla del compás vive en puzzles/bells.ts; coger y encajar,
// en game/carry.ts. Todo vuelve a empezar con el ciclo (D2).
import type { SourceActions } from '../reading/readingUi';
import { BELLS, ballAlong, isInTime, ringTimes } from '../puzzles/bells';
import {
  carryWhere,
  createCarry,
  heldBy,
  placeHeld,
  placedAt,
  resetCarry,
  RACK,
  takeFromRack,
  takeFromSlot,
  type CarryState,
} from './carry';

/** Fuentes con acción (umbral.json): el estante de campanas, el canal y el atril (un lector de puzle). */
export const BELLS_RACK = 'umbral.campanas';
export const BELLS_CHANNEL = 'umbral.canal';
export const BELLS_LECTERN = 'umbral.atril';

export const BELL_IDS: readonly string[] = Array.from(
  { length: BELLS.count },
  (_, index) => `campana_${String(index + 1)}`,
);
const SLOT_PREFIX = 'marca_';
const slotOf = (mark: number): string => `${SLOT_PREFIX}${String(mark)}`;

/** Dónde está una campana. */
export type BellWhere = 'rack' | 'hands' | { mark: number };

export interface BellsFrame {
  /** Lo que se oye en este fotograma: el índice de cada campana puesta que acaba de sonar (0 = la primera de arriba). */
  rings: number[];
  /** Dónde va la bola (m desde arriba del canal), o undefined si no rueda. */
  ball: number | undefined;
}

export interface BellsSnapshot {
  placed: number[];
  held: boolean;
  solved: boolean;
}

export interface BellsPlay {
  readonly actions: SourceActions;
  readonly held: boolean;
  /** Las cuatro suenan a compás: el atril está abierto. */
  readonly solved: boolean;
  /** Las marcas con campana, de arriba abajo. */
  placedMarks(): number[];
  /** Las campanas puestas, con su identidad (para dibujarlas): [marca, id], de arriba abajo. */
  placed(): [number, string][];
  /** Cuántas campanas quedan en el estante. */
  onRack(): number;
  /** Dónde está cada campana: en el estante, en las manos o en una marca. */
  bells(): { id: string; where: BellWhere }[];
  /** Una vez por fotograma, con el reloj de Umbral (s). */
  update(t: number): BellsFrame;
  reset(): void;
  snapshot(): BellsSnapshot;
}

export interface BellsPlayOptions {
  /** La marca del canal más cercana a donde estás, si estás junto al canal. */
  nearestMark: () => number | undefined;
}

export function createBellsPlay(options: BellsPlayOptions): BellsPlay {
  let carry: CarryState = createCarry(BELL_IDS);
  let lastT = 0;
  let solved = false;

  const placed = (): [number, string][] =>
    BELL_IDS.flatMap((id): [number, string][] => {
      const where = carryWhere(carry, id) ?? '';
      return where.startsWith(SLOT_PREFIX) ? [[Number(where.slice(SLOT_PREFIX.length)), id]] : [];
    }).sort((a, b) => a[0] - b[0]);
  const placedMarks = (): number[] => placed().map(([mark]) => mark);
  const onRack = (): number => BELL_IDS.filter((id) => carryWhere(carry, id) === RACK).length;
  const holding = (): boolean => heldBy(carry) !== undefined;

  function verb(id: string): string | undefined {
    if (id === BELLS_RACK) return !holding() && onRack() > 0 ? 'coger' : undefined;
    if (id !== BELLS_CHANNEL) return undefined;
    const mark = options.nearestMark();
    if (mark === undefined) return undefined;
    const taken = placedAt(carry, slotOf(mark)) !== undefined;
    if (holding()) return taken ? undefined : 'poner';
    return taken ? 'recoger' : undefined;
  }

  const actions: SourceActions = {
    gone: () => false,
    verb,
    run(id) {
      if (id === BELLS_RACK) {
        carry = takeFromRack(carry);
        return;
      }
      if (id !== BELLS_CHANNEL) return;
      const mark = options.nearestMark();
      if (mark === undefined) return;
      carry = holding() ? placeHeld(carry, slotOf(mark)) : takeFromSlot(carry, slotOf(mark));
    },
  };

  return {
    actions,
    get held() {
      return holding();
    },
    get solved() {
      return solved;
    },
    placedMarks,
    placed,
    onRack,
    bells() {
      return BELL_IDS.map((id) => {
        const where = carryWhere(carry, id) ?? RACK;
        const spot: BellWhere =
          where === RACK
            ? 'rack'
            : where.startsWith(SLOT_PREFIX)
              ? { mark: Number(where.slice(SLOT_PREFIX.length)) }
              : 'hands';
        return { id, where: spot };
      });
    },
    update(t) {
      // Un salto atrás (depuración) no cuenta: solo suena lo que avanza.
      const from = Math.min(lastT, t);
      const current = placedMarks();
      const times = ringTimes(current);
      const rings: number[] = [];
      let lastRang = false;
      for (
        let roll = Math.floor(from / BELLS.rollSeconds);
        roll <= Math.floor(t / BELLS.rollSeconds);
        roll++
      ) {
        for (const [index, time] of times.entries()) {
          const at = roll * BELLS.rollSeconds + time;
          if (at <= from || at > t) continue;
          rings.push(index);
          if (index === times.length - 1) lastRang = true;
        }
      }
      // Al sonar la última campana de la fila, si todas estaban a compás, el atril se abre.
      if (lastRang && isInTime(current)) solved = true;
      lastT = t;
      const elapsed = t - Math.floor(t / BELLS.rollSeconds) * BELLS.rollSeconds;
      return { rings, ball: ballAlong(elapsed) };
    },
    reset() {
      carry = resetCarry(carry);
      lastT = 0;
      solved = false;
    },
    snapshot() {
      return { placed: placedMarks(), held: holding(), solved };
    },
  };
}
