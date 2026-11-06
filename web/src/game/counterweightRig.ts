// Monta el Contrapeso (Fase 10): carga su modelo, lo pone en su Banco del Laboratorio y une su estado
// (counterweightPlay.ts) con lo que se ve (render/counterweightView.ts) y con la Sala del Motor de Cicatriz (el motor
// viejo que sale, la cuna y sus ruedas, el núcleo). Solo si el sistema tiene el Laboratorio.
import { buildCounterweight } from '../worlds/procedural/contrapeso';
import type { Camera, Object3D, Scene, Vector3 } from 'three';
import type { Chronology } from '../core/timeline';
import { createCounterweightView, type CounterweightAnchors } from '../render/counterweightView';
import { createEngineRoomView, type EngineRoomView } from '../render/engineRoomView';
import { anchorAt } from '../render/poseTween';
import type { CustomReaders } from '../ui/puzzlePanel';
import { wheelsBody } from '../ui/wheelsBody';
import { WorldDataError } from '../worlds/markers';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { COUNTERWEIGHT, machineTime, type CounterweightPlace } from './counterweight';
import {
  CRADLE,
  createCounterweightPlay,
  type CounterweightFrame,
  type CounterweightPlay,
} from './counterweightPlay';
import { t } from '../i18n';

/** En el núcleo se ve más grande: el hueco del motor viejo es enorme. */
const CORE_SCALE = 2.2;
/** Si la cronología no trae el pulso (no debería), las 9:00. */
const DEFAULT_PULSE = 540;

const NOTICES: Partial<Record<CounterweightPlace, string>> = {
  installed: t('El pulso lo encaja: el Contrapeso ocupa el lugar del motor.'),
  rejected: t('El pulso lo rechaza: los dos relojes no coincidían.'),
};
const MOTOR_OUT_NOTICE = t(
  'El motor viejo sale del núcleo. El núcleo queda abierto hasta el pulso.',
);

export interface CounterweightRigOptions {
  scene: Scene;
  runtimes: ReadonlyMap<string, WorldRuntime>;
  chronology: Chronology;
  /** Un aviso breve (el motor sale, el pulso encaja o rechaza). */
  notify: (message: string) => void;
  /** La mesa de carga de la nave: ahí se ve mientras pilotas. */
  stowage?: Object3D;
}

export interface CounterweightRig {
  readonly play: CounterweightPlay;
  /** El lector de la cuna: las dos ruedas. */
  readonly readers: CustomReaders;
  /** El centro del núcleo de la máquina, en el marco de Cicatriz (si está): ahí nace el agujero negro. */
  readonly core: Vector3 | undefined;
  /** Una vez por fotograma, con la cámara ya colocada; `dt` 0 si el tiempo no corre. */
  update(camera: Camera, frame: CounterweightFrame, dt: number): void;
}

function markerOf(runtime: WorldRuntime, clueId: string) {
  const marker = runtime.world.markers.interactions.find((m) => m.clueId === clueId)?.object;
  const anchor = marker ? anchorAt(marker) : undefined;
  if (!anchor) throw new WorldDataError(`${runtime.id}: falta la marca de ${clueId}`);
  return anchor;
}

export function createCounterweightRig(
  options: CounterweightRigOptions,
): CounterweightRig | undefined {
  const { scene, runtimes, chronology, notify } = options;
  const lab = runtimes.get(COUNTERWEIGHT.world);
  if (!lab) return undefined;
  const machineWorld = runtimes.get(COUNTERWEIGHT.installWorld);
  const engineRoom: EngineRoomView | undefined = machineWorld
    ? createEngineRoomView(machineWorld.world.scene)
    : undefined;
  const anchors: CounterweightAnchors = { bench: markerOf(lab, COUNTERWEIGHT.source) };
  if (machineWorld && engineRoom) {
    anchors.cradle = markerOf(machineWorld, CRADLE);
    anchors.core = { ...engineRoom.core, pose: { ...engineRoom.core.pose, scale: CORE_SCALE } };
  }
  const view = createCounterweightView(buildCounterweight(), scene, anchors, options.stowage);
  const pulse = chronology.events.find((e) => e.id === COUNTERWEIGHT.pulseEvent);
  const play = createCounterweightPlay({
    worldClock: (world, t) =>
      machineTime(t, runtimes.get(world)?.world.info.clockRate ?? 1, chronology.clocks[world]),
    pulseAt: pulse?.t ?? DEFAULT_PULSE,
  });
  let place = play.place;
  let motorOut = play.motorOut;
  return {
    play,
    readers: { ruedas: (status, _solved, solve) => wheelsBody(play.wheels, status, solve) },
    core: engineRoom?.coreCenter,
    update(camera, frame, dt) {
      view.update(play.update(frame), camera, dt);
      engineRoom?.update(play.motorOut, dt);
      if (play.motorOut && !motorOut) notify(MOTOR_OUT_NOTICE);
      const notice = play.place === place ? undefined : NOTICES[play.place];
      if (notice) notify(notice);
      place = play.place;
      motorOut = play.motorOut;
    },
  };
}
