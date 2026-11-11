// Los dos puzzles físicos del Archivo que se resuelven llevando piezas (plan de historia y puzzles físicos, T6): el
// Planetario de la Gran Nave (P2: cinco esferas en sus rieles, el quinto vacío) y el prisma de la Ranura (P5: lo que
// guiaba la luz está en el suelo y hay que encajarlo en su soporte). Coger y encajar es game/carry.ts; la regla del
// Planetario, puzzles/orrery.ts. Todo vuelve a empezar con el ciclo (D2).
import type { SourceActions } from '../reading/readingUi';
import { ORRERY, isOrreryRight, type SphereId } from '../puzzles/orrery';
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

/** Fuentes con acción (archivo.json). */
export const ARCHIVO_PLAY = {
  /** La mesa del Planetario (una marca por riel; también es su lector). */
  orrery: 'archivo.planetario',
  prism: 'archivo.prisma',
  stand: 'archivo.soporte',
  /** La tablilla de la ranura: no se alcanza hasta encajar el prisma. */
  slotTablet: 'archivo.ranura_luz',
} as const;

export const sphereSource = (id: SphereId): string => `archivo.esfera_${id}`;
const SPHERE_BY_SOURCE = new Map(ORRERY.spheres.map((id) => [sphereSource(id), id] as const));

const PRISM_ID = 'prisma';
const RAIL_PREFIX = 'riel_';
const STAND_SLOT = 'soporte';
const railSlot = (rail: number): string => `${RAIL_PREFIX}${String(rail)}`;
/** Lo que tarda la manivela en llevar el Planetario a su alineación (s). */
export const CRANK_SECONDS = 14;

export type PieceWhere = 'home' | 'hands' | 'stand' | { rail: number } | { loose: LoosePose };

export interface ArchivoSnapshot {
  placement: Record<number, string>;
  held: string | null;
  solved: boolean;
  crank: number;
  prism: boolean;
}

export interface ArchivoPlay {
  readonly actions: SourceActions;
  /** Dejar una pieza en cualquier sitio y volver a cogerla (game/looseCarry.ts). */
  readonly loosely: LooseAccess;
  /** Lo que llevas en las manos: una esfera, el prisma o nada. */
  readonly held: string | undefined;
  /** Las esferas en cada riel (por su número). */
  placement(): Record<number, SphereId>;
  /** Todas en su riel y el quinto vacío. */
  readonly orreryRight: boolean;
  /** Cuánto ha recorrido la manivela (0–1); a 1 se para: la alineación. */
  readonly crank: number;
  readonly prismFitted: boolean;
  /** Dónde está cada pieza: en su sitio, en las manos, en un riel (su número) o en el soporte. */
  pieces(): { id: string; where: PieceWhere }[];
  update(dt: number): void;
  reset(): void;
  snapshot(): ArchivoSnapshot;
}

export interface ArchivoPlayOptions {
  /** El riel (1–6) de la mesa que tienes delante, si estás junto a ella. */
  nearestRail: () => number | undefined;
}

export function createArchivoPlay(options: ArchivoPlayOptions): ArchivoPlay {
  const ids = [...ORRERY.spheres, PRISM_ID];
  let carry: CarryState = createCarry(ids);
  let crank = 0;

  const placement = (): Record<number, SphereId> => {
    const result: Record<number, SphereId> = {};
    for (let rail = 1; rail <= ORRERY.rails; rail++) {
      const id = placedAt(carry, railSlot(rail));
      if (id !== undefined) result[rail] = id as SphereId;
    }
    return result;
  };
  const right = (): boolean => isOrreryRight(placement());
  const holding = (): string | undefined => heldBy(carry);
  const fitted = (): boolean => placedAt(carry, STAND_SLOT) === PRISM_ID;

  function verb(source: string): string | undefined {
    const sphere = SPHERE_BY_SOURCE.get(source);
    if (sphere !== undefined) {
      return holding() === undefined && carryWhere(carry, sphere) === RACK ? 'coger' : undefined;
    }
    if (source === ARCHIVO_PLAY.prism) {
      return holding() === undefined && carryWhere(carry, PRISM_ID) === RACK ? 'coger' : undefined;
    }
    if (source === ARCHIVO_PLAY.stand) {
      if (holding() === PRISM_ID) return 'poner';
      return holding() === undefined && fitted() ? 'recoger' : undefined;
    }
    if (source !== ARCHIVO_PLAY.orrery) return undefined;
    // Con todo en su sitio los engranajes se enganchan: la mesa ya no se toca, solo se lee.
    if (right()) return undefined;
    const rail = options.nearestRail();
    if (rail === undefined) return undefined;
    const taken = placedAt(carry, railSlot(rail)) !== undefined;
    const held = holding();
    if (held !== undefined) return held !== PRISM_ID && !taken ? 'poner' : undefined;
    return taken ? 'recoger' : undefined;
  }

  const actions: SourceActions = {
    // Lo que se llevó deja libre su sitio; la tablilla de la ranura espera al prisma.
    gone: (source) => {
      const sphere = SPHERE_BY_SOURCE.get(source);
      if (sphere !== undefined) return carryWhere(carry, sphere) !== RACK;
      if (source === ARCHIVO_PLAY.prism) return carryWhere(carry, PRISM_ID) !== RACK;
      return source === ARCHIVO_PLAY.slotTablet && !fitted();
    },
    verb,
    run(source) {
      const sphere = SPHERE_BY_SOURCE.get(source);
      if (sphere !== undefined) carry = takeObject(carry, sphere);
      else if (source === ARCHIVO_PLAY.prism) carry = takeObject(carry, PRISM_ID);
      else if (source === ARCHIVO_PLAY.stand) {
        carry =
          holding() === PRISM_ID ? placeHeld(carry, STAND_SLOT) : takeFromSlot(carry, STAND_SLOT);
      } else if (source === ARCHIVO_PLAY.orrery && !right()) {
        const rail = options.nearestRail();
        if (rail === undefined) return;
        const accepts = (_slot: string, id: string): boolean => id !== PRISM_ID;
        carry =
          holding() === undefined
            ? takeFromSlot(carry, railSlot(rail))
            : placeHeld(carry, railSlot(rail), accepts);
      }
      // Sacar una esfera deshace la alineación.
      if (!right()) crank = 0;
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
    get held() {
      return holding();
    },
    placement,
    get orreryRight() {
      return right();
    },
    get crank() {
      return crank;
    },
    get prismFitted() {
      return fitted();
    },
    pieces() {
      return ids.map((id) => {
        const where = carryWhere(carry, id) ?? RACK;
        const pose = loosePoseOf(where);
        const spot: PieceWhere = pose
          ? { loose: pose }
          : where === RACK
            ? 'home'
            : where === STAND_SLOT
              ? 'stand'
              : where.startsWith(RAIL_PREFIX)
                ? { rail: Number(where.slice(RAIL_PREFIX.length)) }
                : 'hands';
        return { id, where: spot };
      });
    },
    update(dt) {
      if (right() && dt > 0) crank = Math.min(1, crank + dt / CRANK_SECONDS);
    },
    reset() {
      carry = resetCarry(carry);
      crank = 0;
    },
    snapshot() {
      return {
        placement: placement(),
        held: holding() ?? null,
        solved: crank >= 1,
        crank,
        prism: fitted(),
      };
    },
  };
}
