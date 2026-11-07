// Los puzzles físicos del fondo del Archivo (plan de historia y puzzles físicos, T7): la Cisterna del Fondo del Cañón
// (P4: lastrar con siete partes de piedra, la madera flota) y los péndulos de la Sala Cerrada (P3: la figura que los
// desacopla). Las reglas viven en puzzles/cistern.ts y puzzles/pendulums.ts (con tests). Todo vuelve a empezar con el
// ciclo (D2).
import type { SourceActions } from '../reading/readingUi';
import { CISTERN, addCargo, isFull, supplyOf, type Cargo } from '../puzzles/cistern';
import { PENDULUMS, coupled, cycleLength, isFigure, swing } from '../puzzles/pendulums';

/** Fuentes con acción (archivo.json). */
export const DEPTHS = {
  /** Cinco marcas, una por péndulo (con `pendulo` en `userData`). */
  pendulums: 'archivo.pendulos',
  /** La viga: su lector da lo que enseñan los péndulos al soltarse. */
  beam: 'archivo.viga',
  cistern: 'archivo.cisterna',
  piles: {
    b1: 'archivo.bloques_1',
    b2: 'archivo.bloques_2',
    b3: 'archivo.bloques_3',
    wood: 'archivo.tablones',
  },
  /** Los registros cerrados de la barcaza: no se alcanzan hasta lastrar la cisterna. */
  records: 'archivo.fondo_canon',
  /** La cerradura del anillo de la trampilla de la Sala Cerrada. */
  lock: 'sala_cerrada',
} as const;

const CARGOS: readonly Cargo[] = ['b1', 'b2', 'b3', 'wood'];
const CARGO_BY_PILE = new Map<string, Cargo>(CARGOS.map((cargo) => [DEPTHS.piles[cargo], cargo]));

export interface DepthsSnapshot {
  lengths: number[];
  held: string | null;
  level: number;
  full: boolean;
  hatch: boolean;
}

export interface DepthsPlay {
  readonly actions: SourceActions;
  /** Lo que llevas: una piedra, un tablón o nada. */
  readonly held: Cargo | undefined;
  /** El agua de la cisterna (partes de piedra). */
  readonly level: number;
  /** Se llenó hasta la tercera marca: la barcaza toca el borde. */
  readonly cisternFull: boolean;
  /** Cuánto queda en un montón. */
  remaining(cargo: Cargo): number;
  /** El largo de cada péndulo (muescas). */
  lengths(): number[];
  /** La figura que desacopla la viga: la trampilla cede. */
  readonly hatchOpen: boolean;
  /** El ángulo (−1 a 1) del péndulo `index` (0–4) a los `t` s. */
  swing(index: number, t: number): number;
  reset(): void;
  snapshot(): DepthsSnapshot;
}

export interface DepthsPlayOptions {
  /** El péndulo (1–5) que tienes delante, si estás junto a la viga. */
  nearestPendulum: () => number | undefined;
}

export function createDepthsPlay(options: DepthsPlayOptions): DepthsPlay {
  let lengths: number[] = [...PENDULUMS.start];
  let held: Cargo | undefined;
  let level = 0;
  let thrown: Record<Cargo, number> = { b1: 0, b2: 0, b3: 0, wood: 0 };
  /** Una vez llena, la barcaza se queda tocando el borde el resto del ciclo. */
  let opened = false;

  const remaining = (cargo: Cargo): number =>
    supplyOf(cargo) - thrown[cargo] - (held === cargo ? 1 : 0);

  function verb(source: string): string | undefined {
    const cargo = CARGO_BY_PILE.get(source);
    if (cargo !== undefined)
      return held === undefined && remaining(cargo) > 0 ? 'coger' : undefined;
    if (source === DEPTHS.cistern) return held !== undefined && !opened ? 'echar' : undefined;
    if (source === DEPTHS.pendulums)
      return options.nearestPendulum() === undefined ? undefined : 'alargar';
    return undefined;
  }

  const actions: SourceActions = {
    gone: (source) => {
      const cargo = CARGO_BY_PILE.get(source);
      if (cargo !== undefined) return remaining(cargo) <= 0 && held !== cargo;
      return source === DEPTHS.records && !opened;
    },
    verb,
    run(source) {
      if (verb(source) === undefined) return;
      const cargo = CARGO_BY_PILE.get(source);
      if (cargo !== undefined) {
        held = cargo;
      } else if (source === DEPTHS.cistern && held !== undefined) {
        thrown = { ...thrown, [held]: thrown[held] + 1 };
        level = addCargo(level, held);
        held = undefined;
        if (isFull(level)) opened = true;
      } else if (source === DEPTHS.pendulums) {
        const index = (options.nearestPendulum() ?? 1) - 1;
        lengths = lengths.map((length, i) => (i === index ? cycleLength(length) : length));
      }
    },
  };

  return {
    actions,
    get held() {
      return held;
    },
    get level() {
      return level;
    },
    get cisternFull() {
      return opened;
    },
    remaining,
    lengths: () => [...lengths],
    get hatchOpen() {
      return isFigure(lengths);
    },
    swing: (index, t) => swing(lengths, index, t),
    reset() {
      lengths = [...PENDULUMS.start];
      held = undefined;
      level = 0;
      thrown = { b1: 0, b2: 0, b3: 0, wood: 0 };
      opened = false;
    },
    snapshot() {
      return {
        lengths: [...lengths],
        held: held ?? null,
        level,
        full: opened,
        hatch: isFigure(lengths),
      };
    },
  };
}

/** Los largos que se parecen lo bastante para que la viga los contagie (para la vista). */
export function pendulumsCoupled(lengths: readonly number[]): boolean {
  return coupled(lengths);
}

export const CISTERN_FULL = CISTERN.full;
