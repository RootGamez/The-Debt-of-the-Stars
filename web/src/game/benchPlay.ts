// Los dos bancos de pruebas físicas del Taller y de Cicatriz (plan de historia y puzzles físicos, T8): la Balanza del
// Contrapeso (P6: pesas en las muescas hasta equilibrar la maqueta del motor viejo; la tapa de la Cuna se abre) y la
// placa que canta (P7: tres pinzas en seis agujeros para que la arena dibuje el símbolo). Las reglas viven en
// puzzles/balance.ts y puzzles/chladni.ts (con tests); coger y encajar, en game/carry.ts. Todo vuelve a empezar con
// el ciclo (D2).
import type { SourceActions } from '../reading/readingUi';
import { BALANCE, isBalanced, leanOf } from '../puzzles/balance';
import { figureOf, isSymbol, toggleClamp, PLATE, type SandFigure } from '../puzzles/chladni';
import {
  RACK,
  carryWhere,
  createCarry,
  heldBy,
  looseAccess,
  loosePoseOf,
  placeHeld,
  placedAt,
  resetCarry,
  takeFromSlot,
  takeObject,
  type CarryState,
  type LooseAccess,
  type LoosePose,
} from './carry';

/** Fuentes con acción (taller.json y cicatriz.json). */
export const BENCH = {
  /** Las pesas de 1, 2 y 3, repartidas por la isla de la Cuna. */
  weights: { 1: 'taller.pesa_1', 2: 'taller.pesa_2', 3: 'taller.pesa_3' } as const,
  /** El brazo de las muescas (una marca por muesca, con `muesca` en `userData`). */
  balance: 'taller.balanza',
  /** La nota de la Cuna: no se alcanza hasta equilibrar la balanza. */
  lid: 'taller.nota_cuna',
  /** La placa de la Fundición (una marca por agujero, con `agujero` en `userData`; también es su lector). */
  plate: 'cicatriz.placa',
} as const;

type Weight = 1 | 2 | 3;
const WEIGHTS: readonly Weight[] = [1, 2, 3];
const WEIGHT_BY_SOURCE = new Map<string, Weight>(WEIGHTS.map((w) => [BENCH.weights[w], w]));
const weightId = (w: Weight): string => `pesa_${String(w)}`;
const NOTCH_PREFIX = 'muesca_';
const notchSlot = (n: number): string => `${NOTCH_PREFIX}${String(n)}`;

export interface BenchSnapshot {
  placement: Record<number, number>;
  held: number | null;
  balanced: boolean;
  clamps: number[];
  symbol: boolean;
}

export interface BenchPlay {
  readonly actions: SourceActions;
  /** Dejar una pesa en cualquier sitio y volver a cogerla (game/looseCarry.ts). */
  readonly loosely: LooseAccess;
  /** Las pesas que están sueltas (por lo que pesan) y dónde. */
  looseWeights(): Partial<Record<Weight, LoosePose>>;
  /** La pesa que llevas (1, 2 o 3), si alguna. */
  readonly held: Weight | undefined;
  /** Lo que hay en cada muesca (su número) y lo que pesa. */
  placement(): Record<number, number>;
  /** La viga está en equilibrio: la tapa de la Cuna se abre. */
  readonly balanced: boolean;
  /** Cuánto se inclina la viga (−1 hacia la maqueta, 1 hacia las pesas). */
  readonly lean: number;
  /** Los agujeros de la placa con pinza. */
  clamps(): number[];
  /** La arena dibuja el símbolo entero. */
  readonly symbol: boolean;
  figure(): SandFigure;
  reset(): void;
  snapshot(): BenchSnapshot;
}

export interface BenchPlayOptions {
  /** La muesca (1–6) de la balanza que tienes delante, si estás junto a ella. */
  nearestNotch: () => number | undefined;
  /** El agujero (1–6) de la placa que tienes delante, si estás junto a ella. */
  nearestHole: () => number | undefined;
}

export function createBenchPlay(options: BenchPlayOptions): BenchPlay {
  let carry: CarryState = createCarry(WEIGHTS.map(weightId));
  let clamps: number[] = [];

  const heldWeight = (): Weight | undefined => {
    const id = heldBy(carry);
    return WEIGHTS.find((w) => weightId(w) === id);
  };
  const placement = (): Record<number, number> => {
    const result: Record<number, number> = {};
    for (let notch = 1; notch <= BALANCE.notches; notch++) {
      const id = placedAt(carry, notchSlot(notch));
      const weight = WEIGHTS.find((w) => weightId(w) === id);
      if (weight !== undefined) result[notch] = weight;
    }
    return result;
  };
  const balanced = (): boolean => isBalanced(placement());

  function verb(source: string): string | undefined {
    const weight = WEIGHT_BY_SOURCE.get(source);
    if (weight !== undefined) {
      return heldBy(carry) === undefined && carryWhere(carry, weightId(weight)) === RACK
        ? 'coger'
        : undefined;
    }
    if (source === BENCH.balance) {
      const notch = options.nearestNotch();
      if (notch === undefined) return undefined;
      const taken = placedAt(carry, notchSlot(notch)) !== undefined;
      if (heldBy(carry) !== undefined) return taken ? undefined : 'poner';
      return taken ? 'recoger' : undefined;
    }
    if (source === BENCH.plate) {
      // Con el símbolo entero la placa canta y ya no se toca: solo se lee.
      if (isSymbol(clamps)) return undefined;
      const hole = options.nearestHole();
      if (hole === undefined) return undefined;
      if (clamps.includes(hole)) return 'soltar';
      return clamps.length < PLATE.clamps ? 'pinzar' : undefined;
    }
    return undefined;
  }

  const actions: SourceActions = {
    // Lo que se llevó deja libre su sitio; la nota de la Cuna espera a que la viga esté en equilibrio.
    gone: (source) => {
      const weight = WEIGHT_BY_SOURCE.get(source);
      if (weight !== undefined) return carryWhere(carry, weightId(weight)) !== RACK;
      return source === BENCH.lid && !balanced();
    },
    verb,
    run(source) {
      if (verb(source) === undefined) return;
      const weight = WEIGHT_BY_SOURCE.get(source);
      if (weight !== undefined) {
        carry = takeObject(carry, weightId(weight));
      } else if (source === BENCH.balance) {
        const notch = options.nearestNotch();
        if (notch === undefined) return;
        carry =
          heldBy(carry) === undefined
            ? takeFromSlot(carry, notchSlot(notch))
            : placeHeld(carry, notchSlot(notch));
      } else if (source === BENCH.plate) {
        const hole = options.nearestHole();
        if (hole !== undefined) clamps = toggleClamp(clamps, hole);
      }
    },
  };

  return {
    actions,
    loosely: looseAccess(
      () => carry,
      (next) => {
        carry = next;
      },
    ),
    looseWeights() {
      const result: Partial<Record<Weight, LoosePose>> = {};
      for (const w of WEIGHTS) {
        const pose = loosePoseOf(carryWhere(carry, weightId(w)));
        if (pose) result[w] = pose;
      }
      return result;
    },
    get held() {
      return heldWeight();
    },
    placement,
    get balanced() {
      return balanced();
    },
    get lean() {
      return leanOf(placement());
    },
    clamps: () => [...clamps],
    get symbol() {
      return isSymbol(clamps);
    },
    figure: () => figureOf(clamps),
    reset() {
      carry = resetCarry(carry);
      clamps = [];
    },
    snapshot() {
      return {
        placement: placement(),
        held: heldWeight() ?? null,
        balanced: balanced(),
        clamps: [...clamps],
        symbol: isSymbol(clamps),
      };
    },
  };
}
