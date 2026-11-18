// El portal caído de la Pista del Taller (hito E4 de docs/plan-finales.md §3.2): el reloj de la Pista, desfasado al
// empezar cada ciclo, se pone en hora con dos ruedas y, con la secuencia de las 7:00, enciende el anillo de la Pista
// y el de dentro del Centro (los dos con la cerradura `pista`). Encendido deja pasar en los dos sentidos el resto del
// ciclo. Une las reglas puras (fallenGatePlay.ts) con lo que se ve (render/fallenGateView.ts) y con el lector del
// panel (ui/fallenGateClockBody.ts).
import type { Object3D } from 'three';
import { t } from '../i18n';
import { createFallenGateView } from '../render/fallenGateView';
import { fallenGateClockBody, type FallenGateClockLabels } from '../ui/fallenGateClockBody';
import type { CustomReaders } from '../ui/puzzlePanel';
import type { Gate } from '../worlds/gates';
import { TALLER_GATE } from './fallenGate';
import { createFallenGatePlay, type FallenGatePlay, type FallenGateStatus } from './fallenGatePlay';

export interface TrackGateOptions {
  /** La escena del Taller (donde están las piezas del anillo marcadas con `fallen_lock`). */
  scene: Object3D;
  /** La hora del Taller ahora (s de máquina): la de fuera con que se compara el reloj de la Pista. */
  reference: () => number;
  notify: (message: string) => void;
}

export interface TrackGateSnapshot {
  gate: FallenGateStatus[];
  /** El reloj está en hora y el anillo, encendido (lo que lee la depuración y e2e/taller.spec.ts). */
  matched: boolean;
  open: boolean;
}

export interface TrackGateRig {
  readonly play: FallenGatePlay;
  readonly readers: CustomReaders;
  readonly lit: boolean;
  /** Si deja pasar el anillo `gate`; `undefined` si no es el de la Pista. */
  gateOpen(gate: Gate): boolean | undefined;
  /** Una vez por fotograma: `dt` y `time` en s reales, `events` los eventos de ahora. */
  update(dt: number, time: number, events: readonly string[]): void;
  /** Cada ciclo: el anillo se apaga y el reloj vuelve a desfasarse. */
  reset(): void;
  snapshot(): TrackGateSnapshot;
  /** Depuración: pone el reloj en hora. */
  setOnTime(): boolean;
}

const clockLabels = (): FallenGateClockLabels => ({
  hint: t(
    'El anillo de la Pista no se enciende con su reloj desajustado. Gira las ruedas hasta que marque la hora del Taller.',
  ),
  outside: t('El Taller'),
  gate: t('La Pista'),
  matched: t('Los dos relojes marcan lo mismo.'),
  lit: t('El anillo está encendido.'),
});

export function createTrackGateRig(options: TrackGateOptions): TrackGateRig {
  const id = TALLER_GATE.id;
  const play = createFallenGatePlay([{ spec: TALLER_GATE, reference: options.reference }]);
  const view = createFallenGateView([options.scene], play);
  return {
    play,
    readers: {
      pista: (status, _solved, solve) =>
        fallenGateClockBody(play, id, clockLabels(), status, solve),
    },
    get lit() {
      return play.lit(id);
    },
    gateOpen: (gate) => play.isOpen(gate.lock),
    update(dt, time, events) {
      if (play.step(dt, events).includes(id)) {
        options.notify(t('El anillo de la Pista se enciende.'));
      }
      view.update(time);
    },
    reset() {
      play.reset();
    },
    snapshot: () => ({
      gate: play.snapshot(),
      matched: play.reading(id)?.matched ?? false,
      open: play.lit(id),
    }),
    setOnTime: () => play.setOnTime(id),
  };
}
