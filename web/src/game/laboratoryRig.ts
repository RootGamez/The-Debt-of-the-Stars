// Monta lo vivo del Laboratorio (hito E4 de docs/plan-finales.md §3.2–3.3): el portal caído del Nudo (su reloj en el
// muelle de la cáscara y los dos anillos, el de fuera y su gemelo de dentro), la científica congelada en su lecho, a
// quien se despierta calentándolo sin prisa, y la burbuja visible del Contrapeso. Une las reglas puras
// (fallenGatePlay.ts y scientist.ts) con lo que se ve (render/fallenGateView.ts y character/absent*.ts) y con los
// lectores del panel (ui/fallenGateClockBody.ts y ui/coldBedBody.ts). Solo si el sistema tiene el Laboratorio.
import { Mesh, ShaderMaterial, type Material, type Object3D } from 'three';
import { buildAbsent, type AbsentRig } from '../character/absentModel';
import {
  advanceAbsentPoser,
  createAbsentPoser,
  currentAbsentPose,
  switchAbsentPose,
  type AbsentPoser,
} from '../character/absentPoser';
import { DEFAULT_SEAT } from '../character/absentPoses';
import { t } from '../i18n';
import type { SourceActions } from '../reading/readingUi';
import { createFallenGateView, type FallenGateView } from '../render/fallenGateView';
import { coldBedBody, type ColdBedControl } from '../ui/coldBedBody';
import { fallenGateClockBody, type FallenGateClockLabels } from '../ui/fallenGateClockBody';
import type { CustomReaders } from '../ui/puzzlePanel';
import type { Gate } from '../worlds/gates';
import { BUBBLE_MESH } from '../worlds/procedural/laboratorioBubble';
import {
  BED_STEP_LIGHTS,
  FROST_MIST,
  SCIENTIST_ANCHOR,
} from '../worlds/procedural/laboratorioCold';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { LABORATORY_GATE } from './fallenGate';
import { createFallenGatePlay, type FallenGatePlay } from './fallenGatePlay';
import {
  COLD_BED,
  bedWarmth,
  frozenBed,
  scientistGone,
  scientistTalk,
  warmBed,
  type ColdBedState,
  type ScientistTalkId,
} from './scientist';

const WORLD = 'laboratorio';
/** Lo que se ve la neblina de escarcha con el lecho helado (0–1); se apaga al calentarse. */
const MIST_OPACITY = 0.4;

export interface LaboratoryOptions {
  runtimes: ReadonlyMap<string, WorldRuntime>;
  /** La hora de fuera, la del Nudo (s de máquina). */
  reference: () => number;
  /** Fuentes abiertas alguna vez (lo que sabes de él) y si llevas el Contrapeso en brazos. */
  opened: () => ReadonlySet<string>;
  carrying: () => boolean;
  /** El Contrapeso está en su Banco (se ve su burbuja). */
  onBench: () => boolean;
  notify: (message: string) => void;
}

export interface LaboratorySnapshot {
  gate: ReturnType<FallenGatePlay['snapshot']>;
  bed: ColdBedState & { warmth: number };
  pose: string;
  seated: number;
  talk: ScientistTalkId;
  view: ReturnType<FallenGateView['snapshot']>;
}

export interface LaboratoryRig {
  readonly play: FallenGatePlay;
  readonly actions: SourceActions;
  readonly readers: CustomReaders;
  /** La Puerta del Nudo está encendida. */
  readonly lit: boolean;
  /** Si deja pasar el anillo `gate`; `undefined` si no es del Nudo. */
  gateOpen(gate: Gate): boolean | undefined;
  /** Una vez por fotograma: `dt` y `time` en s reales, `events` los eventos de ahora. */
  update(dt: number, time: number, events: readonly string[]): void;
  /** Cada ciclo: la Puerta se apaga y ella vuelve a dormir (no recuerda los ciclos). */
  reset(): void;
  snapshot(): LaboratorySnapshot;
  /** Depuración: pone el reloj del portal en hora y la despierta de golpe. */
  lightGate(): boolean;
  wake(): void;
}

interface ChamberParts {
  anchor: Object3D;
  steps: Object3D[];
  mist: Mesh | undefined;
  bubble: Mesh | undefined;
}

function findParts(scene: Object3D): ChamberParts | undefined {
  const anchor = scene.getObjectByName(SCIENTIST_ANCHOR);
  if (!anchor) return undefined;
  const steps: Object3D[] = [];
  scene.traverse((o) => {
    if (typeof o.userData['lab_bed_step'] === 'number') steps.push(o);
  });
  steps.sort((a, b) => Number(a.userData['lab_bed_step']) - Number(b.userData['lab_bed_step']));
  const mesh = (name: string): Mesh | undefined => {
    const o = scene.getObjectByName(name);
    return o instanceof Mesh ? o : undefined;
  };
  return { anchor, steps, mist: mesh(FROST_MIST), bubble: mesh(BUBBLE_MESH) };
}

/** Ella, congelada y colgada del ancla del lecho; `seat` la lleva hacia atrás, hasta el asiento. */
function createScientist(anchor: Object3D): {
  body: AbsentRig;
  pose(poser: AbsentPoser): number;
} {
  const body = buildAbsent('cientifica');
  anchor.add(body.root);
  const back = Number(anchor.userData['seat_back'] ?? 0);
  return {
    body,
    pose(poser) {
      body.setPose(currentAbsentPose(poser));
      const seated = poser.name === 'slumped' ? (poser.from ? poser.blend : 1) : 0;
      body.root.position.set(0, 0, back * seated);
      return seated;
    },
  };
}

function setOpacity(material: Material | Material[], opacity: number): void {
  for (const m of Array.isArray(material) ? material : [material]) m.opacity = opacity;
}

/** Las luces de los pasos, la neblina y la burbuja, según el calor del lecho y dónde está el Contrapeso. */
function paintChamber(parts: ChamberParts, warmth: number, onBench: boolean, time: number): void {
  for (const [k, light] of parts.steps.entries()) {
    light.visible = warmth * BED_STEP_LIGHTS > k + 0.5;
  }
  if (parts.mist) {
    const opacity = MIST_OPACITY * (1 - warmth);
    parts.mist.visible = opacity > 0.01;
    setOpacity(parts.mist.material, opacity);
  }
  if (parts.bubble) {
    parts.bubble.visible = onBench;
    const material = parts.bubble.material;
    if (material instanceof ShaderMaterial && material.uniforms['time']) {
      material.uniforms['time'].value = time;
    }
  }
}

const now = (): number => performance.now() / 1000;

/** El lecho de escarcha: lo que lee el panel (ui/coldBedBody.ts); `onWake` se llama al despertarla. */
function createColdBed(onWake: () => void): ColdBedControl & {
  readonly state: ColdBedState;
  reset(): void;
  wakeNow(): void;
} {
  let bed = frozenBed();
  return {
    warm() {
      const next = warmBed(bed, now());
      bed = next.state;
      if (next.result === 'awake') onWake();
      return next.result;
    },
    warmth: () => bedWarmth(bed, now()),
    get awake() {
      return bed.awake;
    },
    get state() {
      return bed;
    },
    reset() {
      bed = frozenBed();
    },
    wakeNow() {
      if (bed.awake) return;
      bed = { stage: COLD_BED.steps, from: COLD_BED.steps, at: now(), awake: true };
      onWake();
    },
  };
}

const clockLabels = (): FallenGateClockLabels => ({
  hint: t(
    'La Puerta no se enciende con su reloj fuera de hora. Gira las ruedas hasta que marque la hora de dentro.',
  ),
  outside: t('Fuera (el Nudo)'),
  gate: t('La Puerta (dentro)'),
});

export function createLaboratoryRig(options: LaboratoryOptions): LaboratoryRig | undefined {
  const runtime = options.runtimes.get(WORLD);
  const parts = runtime && findParts(runtime.world.scene);
  if (!runtime || !parts) return undefined;
  const id = LABORATORY_GATE.id;
  const play = createFallenGatePlay([{ spec: LABORATORY_GATE, reference: options.reference }]);
  const view = createFallenGateView([runtime.world.scene], play);
  const scientist = createScientist(parts.anchor);
  let poser = createAbsentPoser('cientifica', 'frozen');
  let seated = 0;
  const bed = createColdBed(() => {
    poser = switchAbsentPose(poser, 'slumped', { seatHeight: DEFAULT_SEAT.slumped });
  });
  const talk = (): ScientistTalkId =>
    scientistTalk({ opened: options.opened(), carrying: options.carrying() });
  const gone = (source: string): boolean => scientistGone(source, bed.awake, talk());
  return {
    play,
    actions: { gone, verb: () => undefined, run: () => undefined },
    readers: {
      puerta_nudo: (status) => fallenGateClockBody(play, id, clockLabels(), status),
      lecho: (status) => coldBedBody(bed, status),
    },
    get lit() {
      return play.lit(id);
    },
    gateOpen: (gate) => play.isOpen(gate.lock),
    update(dt, time, events) {
      if (play.step(dt, events).includes(id)) options.notify(t('La Puerta del Nudo se enciende.'));
      view.update(time);
      poser = advanceAbsentPoser(poser, dt);
      seated = scientist.pose(poser);
      paintChamber(parts, bed.warmth(), options.onBench(), time);
    },
    reset() {
      play.reset();
      bed.reset();
      poser = createAbsentPoser('cientifica', 'frozen');
    },
    snapshot: () => ({
      gate: play.snapshot(),
      bed: { ...bed.state, warmth: bed.warmth() },
      pose: poser.name,
      seated,
      talk: talk(),
      view: view.snapshot(),
    }),
    lightGate: () => play.setOnTime(id),
    wake: () => {
      bed.wakeNow();
    },
  };
}
