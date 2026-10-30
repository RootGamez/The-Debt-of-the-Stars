// Monta el Contrapeso (Fase 10): carga su modelo, lo pone en su Banco del Laboratorio y une su estado
// (counterweightPlay.ts) con lo que se ve (render/counterweightView.ts). Solo si el sistema tiene el Laboratorio.
import type { Camera, Scene } from 'three';
import { rateAt } from '../core/clockRates';
import type { Chronology } from '../core/timeline';
import {
  createCounterweightView,
  loadCounterweightModel,
  type CounterweightView,
} from '../render/counterweightView';
import { WorldDataError } from '../worlds/markers';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { COUNTERWEIGHT } from './counterweight';
import {
  createCounterweightPlay,
  type CounterweightFrame,
  type CounterweightPlay,
} from './counterweightPlay';

export interface CounterweightRig {
  readonly play: CounterweightPlay;
  /** Una vez por fotograma, con la cámara ya colocada; `dt` 0 si el tiempo no corre. */
  update(camera: Camera, frame: CounterweightFrame, dt: number): void;
}

export async function createCounterweightRig(
  scene: Scene,
  runtimes: ReadonlyMap<string, WorldRuntime>,
  chronology: Chronology,
): Promise<CounterweightRig | undefined> {
  const lab = runtimes.get(COUNTERWEIGHT.world);
  if (!lab) return undefined;
  const bench = lab.world.markers.interactions.find(
    (m) => m.clueId === COUNTERWEIGHT.source,
  )?.object;
  if (!bench) throw new WorldDataError(`${lab.id}: falta la marca de ${COUNTERWEIGHT.source}`);
  const view: CounterweightView = createCounterweightView(await loadCounterweightModel(), scene);
  view.anchorTo(bench);
  const play = createCounterweightPlay((world, t) =>
    rateAt(runtimes.get(world)?.world.info.clockRate ?? 1, chronology.clocks[world], t),
  );
  return {
    play,
    update(camera, frame, dt) {
      view.update(play.update(frame), camera, dt);
    },
  };
}
