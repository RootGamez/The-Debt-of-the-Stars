// Monta las campanas del Anfiteatro (P1): une su juego (bellsPlay.ts) con lo que se ve (render/bellsView.ts) y con el
// sonido, a partir de las marcas del Anfiteatro de Umbral. Solo si el sistema tiene a Umbral.
import { Vector3, type Camera, type Scene } from 'three';
import { createBellsView } from '../render/bellsView';
import type { CustomReaders } from '../ui/puzzlePanel';
import { bellsBody } from '../ui/bellsBody';
import {
  CHANNEL_INTERACT,
  INTERACT_LIFT,
  channelPoint,
  markNear,
} from '../worlds/procedural/umbralBellsShape';
import type { Triple } from '../worlds/procedural/kit';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { BELL_IDS, BELLS_CHANNEL, createBellsPlay, type BellsPlay } from './bellsPlay';

const WORLD = 'umbral';
/** A qué distancia se oyen las campanas (m). */
const HEARING = 40;
/** Cuánto se aleja del canal alguien «junto a él» en vertical (m), para no contar a quien pasa por una grada alta. */
const VERTICAL_REACH = 3;
/** Los tonos de las campanas, de arriba abajo del canal (Hz): una escala de cinco notas. */
const PITCHES: readonly number[] = [523.25, 587.33, 659.25, 783.99];

export interface BellsRigOptions {
  scene: Scene;
  runtimes: ReadonlyMap<string, WorldRuntime>;
  /** Suena una campana (Hz). */
  chime: (frequency: number) => void;
}

export interface BellsRig {
  readonly play: BellsPlay;
  /** El lector del atril. */
  readonly readers: CustomReaders;
  /** Depuración: fija la marca más cercana (para probar sin andar al milímetro); undefined la suelta. */
  forceMark(mark: number | undefined): void;
  /** Una vez por fotograma, con la cámara ya colocada; `dt` 0 si el tiempo no corre; `t` es el reloj de Umbral. */
  update(camera: Camera, t: number, dt: number): void;
}

export function createBellsRig(options: BellsRigOptions): BellsRig | undefined {
  const { scene, runtimes, chime } = options;
  const runtime = runtimes.get(WORLD);
  const anchor = runtime?.world.markers.interactions.find(
    (m) => m.clueId === BELLS_CHANNEL,
  )?.object;
  if (!anchor) return undefined;
  const first = CHANNEL_INTERACT[0] ?? 0;
  const anchorAt: Triple = channelPoint(first, INTERACT_LIFT);
  const view = createBellsView(scene, anchor, anchorAt, BELL_IDS);
  const eye = new Vector3();
  const where = new Vector3();

  /** Dónde está el jugador en el marco del Anfiteatro. */
  let feet: Triple | undefined;
  let forced: number | undefined;
  const play = createBellsPlay({
    nearestMark: () => forced ?? (feet ? markNear(feet) : undefined),
  });

  return {
    play,
    forceMark(mark) {
      forced = mark;
    },
    readers: { campanas: (status, _solved, solve) => bellsBody(play, status, solve) },
    update(camera, t, dt) {
      anchor.updateWorldMatrix(true, false);
      eye.copy(camera.position);
      anchor.worldToLocal(eye);
      const local: Triple = [eye.x + anchorAt[0], eye.y + anchorAt[1], eye.z + anchorAt[2]];
      feet = Math.abs(local[2] - anchorAt[2]) <= VERTICAL_REACH ? local : undefined;
      const frame = play.update(t);
      const near = anchor.getWorldPosition(where).distanceTo(camera.position) < HEARING;
      const placed = play.placed();
      if (near) {
        for (const index of frame.rings)
          chime(PITCHES[index % PITCHES.length] ?? PITCHES[0] ?? 440);
      }
      const mark = feet ? markNear(feet) : undefined;
      const targeted =
        mark !== undefined && (play.held || placed.some(([m]) => m === mark)) ? mark : undefined;
      view.update(
        {
          bells: play.bells(),
          ball: frame.ball,
          highlight: targeted,
          rung: frame.rings.flatMap((index) => {
            const id = placed[index]?.[1];
            return id === undefined ? [] : [id];
          }),
          lecternOpen: play.solved,
        },
        camera,
        dt,
      );
    },
  };
}
