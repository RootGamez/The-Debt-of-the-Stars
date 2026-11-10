// Monta los bancos de pruebas (T8): la Balanza del Contrapeso del Taller y la placa que canta de Cicatriz. Une su
// juego (benchPlay.ts) con lo que se ve (render/benchView.ts) a partir de las marcas de cada mundo. Funciona aunque
// falte uno de los dos mundos (solo se ve el que hay).
import { Vector3, type Camera, type Object3D, type Scene } from 'three';
import { BALANCE } from '../puzzles/balance';
import { PLATE } from '../puzzles/chladni';
import {
  createBalanceView,
  createPlateView,
  type BalanceView,
  type PlateView,
} from '../render/benchView';
import { plateBody } from '../ui/plateBody';
import type { CustomReaders } from '../ui/puzzlePanel';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { BENCH, createBenchPlay, type BenchPlay } from './benchPlay';

/** A cuánto de una muesca o un agujero se considera «delante de él» (m). */
const REACH = 1.2;

export interface BenchRig {
  readonly play: BenchPlay;
  readonly readers: CustomReaders;
  /** Depuración: fija la muesca o el agujero más cercano (undefined los suelta). */
  forceNotch(notch: number | undefined): void;
  forceHole(hole: number | undefined): void;
  update(camera: Camera): void;
}

type Weight = 1 | 2 | 3;

export function createBenchRig(options: {
  scene: Scene;
  runtimes: ReadonlyMap<string, WorldRuntime>;
}): BenchRig | undefined {
  const find = (world: string, clue: string, key: string): Object3D[] =>
    (options.runtimes.get(world)?.world.markers.interactions ?? [])
      .filter((m) => m.clueId === clue)
      .map((m) => m.object)
      .sort((a, b) => Number(a.userData[key]) - Number(b.userData[key]));
  const notches = find('taller', BENCH.balance, 'muesca');
  const holes = find('cicatriz', BENCH.plate, 'agujero');
  const homes = {} as Record<Weight, Object3D>;
  let weightsFound = 0;
  for (const w of [1, 2, 3] as const) {
    const home = (options.runtimes.get('taller')?.world.markers.interactions ?? []).find(
      (m) => m.clueId === BENCH.weights[w],
    )?.object;
    if (home) {
      homes[w] = home;
      weightsFound++;
    }
  }
  const hasBalance = notches.length === BALANCE.notches && weightsFound === 3;
  const hasPlate = holes.length === PLATE.holes;
  if (!hasBalance && !hasPlate) return undefined;

  const eye = new Vector3();
  const where = new Vector3();
  let forcedNotch: number | undefined;
  let forcedHole: number | undefined;
  const nearest = (marks: readonly Object3D[], forced: number | undefined): number | undefined => {
    if (forced !== undefined) return forced;
    let best: number | undefined;
    let bestDistance = REACH;
    for (const [index, mark] of marks.entries()) {
      const distance = mark.getWorldPosition(where).distanceTo(eye);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index + 1;
      }
    }
    return best;
  };
  const play = createBenchPlay({
    nearestNotch: () => (hasBalance ? nearest(notches, forcedNotch) : undefined),
    nearestHole: () => (hasPlate ? nearest(holes, forcedHole) : undefined),
  });
  const balance: BalanceView | undefined = hasBalance
    ? createBalanceView(options.scene, { notches, homes })
    : undefined;
  const plate: PlateView | undefined = hasPlate ? createPlateView(holes) : undefined;

  return {
    play,
    readers: { placa: (status, _solved, solve) => plateBody(play, status, solve) },
    forceNotch(notch) {
      forcedNotch = notch;
    },
    forceHole(hole) {
      forcedHole = hole;
    },
    update(camera) {
      eye.copy(camera.position);
      balance?.update({ placement: play.placement(), held: play.held, lean: play.lean }, camera);
      plate?.update({ clamps: play.clamps(), figure: play.figure() });
    },
  };
}
