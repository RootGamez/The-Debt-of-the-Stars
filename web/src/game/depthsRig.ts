// Monta los puzzles del fondo del Archivo (T7): une su juego (depthsPlay.ts) con lo que se ve
// (render/archivoDepthsView.ts) a partir de las marcas de la Galería. Solo si el sistema tiene el Archivo.
import { Vector3, type Camera, type Object3D, type Scene } from 'three';
import type { Cargo } from '../puzzles/cistern';
import { PENDULUMS } from '../puzzles/pendulums';
import { createDepthsView } from '../render/archivoDepthsView';
import { pendulumsBody } from '../ui/pendulumsBody';
import type { CustomReaders } from '../ui/puzzlePanel';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { DEPTHS, createDepthsPlay, type DepthsPlay } from './depthsPlay';

const WORLD = 'archivo';
/** A cuánto de un péndulo se considera «delante de él» (m). */
const PENDULUM_REACH = 1.6;
const CARGOS: readonly Cargo[] = ['b1', 'b2', 'b3', 'wood'];

export interface DepthsRig {
  readonly play: DepthsPlay;
  readonly readers: CustomReaders;
  /** Depuración: fija el péndulo más cercano (undefined lo suelta). */
  forcePendulum(pendulum: number | undefined): void;
  /** Una vez por fotograma, con el reloj de Umbral (s). */
  update(camera: Camera, t: number): void;
}

export function createDepthsRig(options: {
  scene: Scene;
  runtimes: ReadonlyMap<string, WorldRuntime>;
}): DepthsRig | undefined {
  const runtime = options.runtimes.get(WORLD);
  if (!runtime) return undefined;
  const marks = runtime.world.markers.interactions;
  const byClue = (clue: string): Object3D | undefined =>
    marks.find((m) => m.clueId === clue)?.object;
  const cistern = byClue(DEPTHS.cistern);
  const pendulums = marks
    .filter((m) => m.clueId === DEPTHS.pendulums)
    .map((m) => m.object)
    .sort((a, b) => Number(a.userData['pendulo']) - Number(b.userData['pendulo']));
  const piles: Partial<Record<Cargo, Object3D>> = {};
  for (const cargo of CARGOS) {
    const pile = byClue(DEPTHS.piles[cargo]);
    if (pile) piles[cargo] = pile;
  }
  if (!cistern || pendulums.length !== PENDULUMS.count || CARGOS.some((c) => !piles[c])) {
    return undefined;
  }
  const view = createDepthsView(options.scene, {
    cistern,
    piles: piles as Record<Cargo, Object3D>,
    pendulums,
  });

  const eye = new Vector3();
  const where = new Vector3();
  let forced: number | undefined;
  const nearestPendulum = (): number | undefined => {
    if (forced !== undefined) return forced;
    let best: number | undefined;
    let bestDistance = PENDULUM_REACH;
    for (const [index, pendulum] of pendulums.entries()) {
      const distance = pendulum.getWorldPosition(where).distanceTo(eye);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index + 1;
      }
    }
    return best;
  };
  const play = createDepthsPlay({ nearestPendulum });

  return {
    play,
    readers: { pendulos: (status, _solved, solve) => pendulumsBody(play, status, solve) },
    forcePendulum(pendulum) {
      forced = pendulum;
    },
    update(camera, t) {
      eye.copy(camera.position);
      view.update(
        {
          held: play.held,
          level: play.level,
          remaining: {
            b1: play.remaining('b1'),
            b2: play.remaining('b2'),
            b3: play.remaining('b3'),
            wood: play.remaining('wood'),
          },
          lengths: play.lengths(),
          swings: Array.from({ length: PENDULUMS.count }, (_, index) => play.swing(index, t)),
        },
        camera,
      );
    },
  };
}
