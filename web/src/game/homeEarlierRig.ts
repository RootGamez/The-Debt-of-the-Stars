// La llegada del final bueno en el navegador (F4, «Hogar tres días después»; 🟡 todo el aspecto). Con
// `?mundo=hogar&final=A` se carga el Hogar que dejaste, con la Luna mordida (game/homecoming.ts), y este montaje
// reproduce la escena del nido (game/homeEarlierScene.ts) con el director (game/cinematicRunner.ts): el Albatros II
// que pasa sobre la mordida y se posa en el nido, los Ool de la plaza mirando al cielo, la Maestra que te espera y lee
// tu cuaderno (las páginas de tu Registro, render/notebookModel.ts), tu advertencia y su respuesta. Al acabar, en
// negro al Mirador de Umbral (F3) por homecomingRig.finish().
//
// Los actores son suyos (otra nave, otro explorador, la Maestra y los que miran, articulados), colgados de la marca
// PARK_Hangar: la nave y el explorador del juego se esconden (el vuelo los pondría en su sitio después de este
// montaje), y la Maestra del mundo también (está en el nido, no en su torre). Lo puro está en homeEarlier*.ts.
import {
  Group,
  Light,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Quaternion,
  Vector3,
  type Material,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { Vec3 } from '../cinematic/cameraTrack';
import { smoothstep } from '../cinematic/easing';
import { cameraAt, shotAt, trackValue, type Cinematic } from '../cinematic/timeline';
import { buildExplorer } from '../character/explorerModel';
import { createGait, gaitPose, stepGait, type ArmPose } from '../character/gait';
import { buildOolRig, type OolRig } from '../character/oolRig';
import {
  aimHead,
  breathe,
  lookUpPose,
  nod,
  OOL_LIMITS,
  pointUpPose,
  type OolPose,
} from '../character/oolPoses';
import { createNotebookModel, NOTEBOOK, type NotebookModel } from '../render/notebookModel';
import { castShadowsFrom } from '../render/sunShadow';
import { DESIGN_FIT } from '../registry/bookLayout';
import type { Clues } from '../registry/clues';
import { notebookPages, type NotebookPage } from '../registry/notebookPages';
import { buildRegistryView } from '../registry/registryView';
import { buildAlbatros } from '../ship/model/albatros';
import { THRUSTERS } from '../ship/thrusters';
import { lettersPerSecond, type TextSettings } from '../typewriter/textPreferences';
import { voicePitch } from '../typewriter/speech';
import { placeInWorld } from '../worlds/procedural/kit';
import { biteSphere } from '../worlds/procedural/lunaBite';
import { OOL_UPRIGHT, type OolSpec } from '../worlds/procedural/ool';
import { worldPages, type WorldNames } from '../worlds/worldLog';
import type { Soundtrack } from '../audio/soundtrack';
import { t } from '../i18n';
import { createCinematicRunner, type CinematicRunner } from './cinematicRunner';
import { talkScript } from './endingTalk';
import {
  beatAt,
  earlierTimeline,
  headingTo,
  NEST,
  phaseAt,
  type EarlierTimeline,
} from './homeEarlier';
import { bookAt, explorerAt, maestraAt, shipAt, type ArrivalPath } from './homeEarlierMotion';
import {
  arrivalPath,
  bookInHands,
  DEFAULT_SKY,
  earlierCinematic,
  EARLIER_MUSIC,
  EARLIER_PREROLL,
  MUSIC_CUE,
  type EarlierSky,
} from './homeEarlierScene';
import { beaconOn, poseHatch, positionLights } from './shipCabin';

/** La marca del nido en el mundo de Hogar. */
const NEST_MARK = 'PARK_Hangar';
/** El grupo de rombos de las fuentes (render/sourceMarkers.ts) y la Maestra del mundo (en su torre). */
const SOURCE_MARKERS = 'Rombos de fuentes';
const WORLD_MAESTRA = 'OOL_maestra';
const WORLD_MAESTRA_BODY = 'hogar_ool_maestra';
/** Fotogramas que se esperan antes de empezar (el sistema y la Luna ya en su sitio). */
const SETTLE_FRAMES = 3;
const MAESTRA: OolSpec = { id: 'maestra', age: 0.85, outfit: 'maestra', seed: 11 };
/** 🟡 Los que miran al cielo en la plaza: una tejedora, una cría (la que señala), un campesino y un vecino. */
const WATCHERS: readonly OolSpec[] = [
  { id: 'mira_tejedora', age: 0.6, outfit: 'tejedora', seed: 31 },
  { id: 'mira_cria', age: 0.22, outfit: 'cria', seed: 32 },
  { id: 'mira_campesino', age: 0.75, outfit: 'campesino', seed: 33 },
  { id: 'mira_vecino', age: 0.45, outfit: 'vecino', seed: 34 },
];
const POINTER = 1;
/** La luz de relleno del nido: el rebote cálido de la mañana en la arena (marco del nido). */
const FILL = {
  color: '#ffd6ae',
  intensity: 3.2,
  range: 9,
  decay: 1.4,
  at: [-1.0, -7.4, 2.4],
} as const;
/** Más cerca de la cabeza de ella que esto, la cámara está en sus ojos: la cabeza no se dibuja (m). */
const EYE_CLEARANCE = 0.42;
/** Lo que dura el paso del cuaderno de tu mano a las suyas (s, a cada lado del momento). */
const HAND_OVER = 0.35;
/** Cómo giran las cabezas hacia lo que miran (1/s) y cuánto puede girar la cabeza antes de girar el cuerpo. */
const HEAD_RATE = 3.5;
const HEAD_REACH = 0.85;
/** Tu brazo derecho: con el cuaderno pegado al cuerpo y tendiéndoselo. */
const CARRY_ARM: ArmPose = { shoulder: 0.35, shoulderRoll: 0.18, elbow: 1.25, wrist: 0 };
const OFFER_ARM: ArmPose = { shoulder: 1.25, shoulderRoll: 0.08, elbow: 0.3, wrist: -0.2 };
const Z = new Vector3(0, 0, 1);
const X = new Vector3(1, 0, 0);
/** De los ejes de la nave (Y arriba, −Z proa) y del explorador (igual) al marco del nido (Z arriba, proa al norte). */
const UPRIGHT = new Quaternion().setFromAxisAngle(X, Math.PI / 2);
/** El cuaderno cerrado en tu mano: tapa arriba y el texto hacia ti (así ella lo recibe derecho). */
const BOOK_IN_HAND = new Quaternion().setFromRotationMatrix(
  new Matrix4().makeBasis(new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0)),
);

type Stage = 'waiting' | 'scene' | 'done';

export interface MoonSight {
  /** Lo que el sistema mueve y el modelo (con el marco `luna_Marco`, donde está la mordida). */
  pivot: Object3D;
  model: Object3D;
  radius: number;
}

export interface HomeEarlierRigOptions {
  scene: Scene;
  /** La escena del mundo de Hogar (`runtime.world.scene`). */
  hogar: Object3D;
  luna: MoonSight | undefined;
  soundtrack: Soundtrack;
  reducedMotion: boolean;
  text: TextSettings;
  /** Tu cuaderno tal como está (las páginas del Registro) y lo que sabes: se leen al empezar. */
  pages(): readonly NotebookPage[];
  known(): ReadonlySet<string>;
  /** El explorador y la nave del juego: se esconden (sus luces no, para no recompilar los materiales). */
  hide: readonly (Object3D | undefined)[];
  /** Empieza la escena: el viaje se cierra (homecomingRig.begin). */
  begin(): void;
  /** Acaba: al Mirador (homecomingRig.finish). */
  finish(): void;
}

export interface HomeEarlierSnapshot {
  stage: Stage;
  time: number;
  shot: string;
  phase: string;
  paused: boolean;
  done: boolean;
  /** La página que ella lee (índice del cuaderno) y la doble página a la vista. */
  page: number | null;
  book: { holder: string; open: number; spread: number };
  marks: Record<string, number>;
  /** El cielo medido (marco del nido, m redondeados) y dónde está la nave. */
  moon: number[];
  bite: number[];
  ship: number[];
  /** La cámara del guion (marco del nido, cm): para encuadrar. */
  camera: { pos: number[]; look: number[]; fov: number };
  pages: number;
}

export interface HomeEarlierRig {
  /** La escena ha empezado (o acabado): el juego no se toca. */
  readonly active: boolean;
  /** Cada fotograma, después de poner el sistema en su sitio. */
  apply(camera: PerspectiveCamera, dt: number): void;
  snapshot(): HomeEarlierSnapshot | null;
  /** Para probar (`?debug`): salta a ese segundo de la escena, en pausa. */
  seek(time: number): void;
}

/** Esconde lo que no es luz (las luces siguen: su número no cambia). */
function hideKeepingLights(root: Object3D): void {
  // Por capas y no con `visible`: el juego vuelve a poner `visible` en algunas piezas cada fotograma (la escalerilla
  // de la nave, el cuerpo en primera persona), y las capas no las toca nadie.
  root.traverse((child) => {
    if (!(child instanceof Light)) child.layers.disableAll();
  });
}

const toVec = (v: Vector3): Vec3 => [v.x, v.y, v.z];
const round = (v: Vec3): number[] => v.map((x) => Math.round(x));
const centimeters = (v: Vec3): number[] => v.map((x) => Math.round(x * 100));
const clampTo = (x: number, [low, high]: readonly [number, number]): number =>
  Math.min(high, Math.max(low, x));

/** La Luna y su mordida vistas desde el nido (marco de la marca). */
function measureSky(anchor: Object3D, luna: MoonSight | undefined): EarlierSky {
  if (!luna) return DEFAULT_SKY;
  anchor.updateWorldMatrix(true, false);
  const inverse = anchor.matrixWorld.clone().invert();
  const turn = anchor.getWorldQuaternion(new Quaternion()).invert();
  const frame = luna.model.getObjectByName('luna_Marco') ?? luna.model;
  frame.updateWorldMatrix(true, false);
  const bite = biteSphere();
  const moon = luna.pivot.getWorldPosition(new Vector3()).applyMatrix4(inverse);
  const center = frame.localToWorld(bite.center.clone()).applyMatrix4(inverse);
  const up = bite.up
    .clone()
    .transformDirection(frame.matrixWorld)
    .applyQuaternion(turn)
    .normalize();
  return { moon: toVec(moon), moonRadius: luna.radius, bite: toVec(center), biteUp: toVec(up) };
}

/**
 * La luz de cielo del material de los Ool de Hogar (applySkyLight con `moved`) lee de cada vértice dónde está en el
 * planeta y cuál es allí la vertical: sin eso, el Ool sale negro. Se calcula con el Ool ya en su sitio (las poses solo
 * mueven un poco cabeza y brazos).
 */
function settleOnPlanet(root: Object3D, planet: Object3D): void {
  planet.updateWorldMatrix(true, false);
  const toPlanet = planet.matrixWorld.clone().invert();
  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const mesh = child as Mesh;
    placeInWorld(mesh.geometry, toPlanet.clone().multiply(mesh.matrixWorld));
  });
}

function bodyMaterial(hogar: Object3D): Material {
  const found = hogar.getObjectByName(WORLD_MAESTRA_BODY);
  if (found instanceof Mesh && !Array.isArray(found.material)) return found.material as Material;
  return new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
}

/** Un giro sobre la vertical del nido y luego de pie: para el explorador, la nave y los Ool. */
function standing(target: Quaternion, heading: number, upright: Quaternion): Quaternion {
  return target.setFromAxisAngle(Z, -heading).multiply(upright);
}

const mixArm = (a: ArmPose, b: ArmPose, k: number): ArmPose => ({
  shoulder: a.shoulder + (b.shoulder - a.shoulder) * k,
  shoulderRoll: a.shoulderRoll + (b.shoulderRoll - a.shoulderRoll) * k,
  elbow: a.elbow + (b.elbow - a.elbow) * k,
  wrist: a.wrist + (b.wrist - a.wrist) * k,
});

/** Lo que gira (cuerpo y cabeza) y alza la vista un Ool para mirar `target`, suavizado. */
interface Gaze {
  turn: number;
  yaw: number;
  pitch: number;
}

/**
 * Tu cuaderno tal como lo verías en el Registro (sin marcar lo nuevo), con páginas del tamaño de diseño: es lo que
 * pinta ui/notebookCanvas.ts.
 */
export function yourNotebook(
  clues: Clues,
  known: ReadonlySet<string>,
  names: WorldNames,
  opened: ReadonlySet<string>,
): NotebookPage[] {
  return notebookPages(
    buildRegistryView(clues, known),
    worldPages(names, clues, known, opened),
    { facts: new Set(), worlds: new Set() },
    DESIGN_FIT,
  );
}

/** La escena, si se vuelve con el final A y está la marca del nido; si no, nada. */
export function createHomeEarlierRig(options: HomeEarlierRigOptions): HomeEarlierRig | undefined {
  const anchor = options.hogar.getObjectByName(NEST_MARK);
  if (!anchor) return undefined;
  return buildRig(options, anchor);
}

function buildRig(options: HomeEarlierRigOptions, anchor: Object3D): HomeEarlierRig {
  const stage = new Group();
  stage.name = 'Hogar · escena del nido';
  stage.visible = false;
  anchor.add(stage);
  // La nave, con sus luces de posición; el explorador; la Maestra y los que miran.
  const ship = buildAlbatros();
  ship.object.name = 'Hogar · el Albatros II de la escena';
  const beacons = positionLights(ship.object);
  castShadowsFrom(ship.object);
  const lift = ship.flames.filter((_, i) => THRUSTERS[i]?.group === 'lift');
  const you = buildExplorer();
  castShadowsFrom(you.root);
  const material = bodyMaterial(options.hogar);
  const her = buildOolRig(MAESTRA, { body: material });
  const watchers = WATCHERS.map((spec) => buildOolRig(spec, { body: material }));
  stage.add(ship.object, you.root, her.root, ...watchers.map((w) => w.root));
  her.root.position.set(...NEST.maestra);
  const herHeading = headingTo(NEST.maestra, NEST.ladderFoot);
  standing(her.root.quaternion, herHeading, OOL_UPRIGHT);
  watchers.forEach((w, i) => {
    const spot = NEST.watchers[i];
    if (spot) w.root.position.set(...spot);
    standing(w.root.quaternion, -Math.PI / 2, OOL_UPRIGHT);
  });
  const fill = new PointLight(FILL.color, 0, FILL.range, FILL.decay);
  fill.name = 'Hogar · relleno del nido';
  options.scene.add(fill);
  const markers: Object3D[] = [];
  options.hogar.traverse((child) => {
    if (child.name === SOURCE_MARKERS) markers.push(child);
  });
  const worldMaestra = options.hogar.getObjectByName(WORLD_MAESTRA);
  const speakers = {
    maestra: { name: t('La Maestra'), voice: voicePitch('La Maestra') },
    explorador: { name: t('Tú'), voice: voicePitch('Tú') },
  };

  let current: Stage = 'waiting';
  let settled = 0;
  let runner: CinematicRunner | undefined;
  let scene: Cinematic | undefined;
  let tl: EarlierTimeline | undefined;
  let sky: EarlierSky = DEFAULT_SKY;
  let path: ArrivalPath | undefined;
  let book: NotebookModel | undefined;
  let pageCount = 0;
  let lastTime = Number.NaN;
  const gait = createGait();
  const gazes = new Map<OolRig, Gaze>();
  const tmp = new Vector3();
  const hand = new Vector3();
  const head = new Vector3();
  const turnBack = new Quaternion();
  const yourTurn = new Quaternion();
  const herBook = new Quaternion();
  const yourBook = new Quaternion();
  const basis = new Matrix4();

  function start(): void {
    current = 'scene';
    options.begin();
    document.body.classList.add('cinematica');
    sky = measureSky(anchor, options.luna);
    path = arrivalPath(sky);
    const pages = options.pages();
    pageCount = pages.length;
    const known = options.known();
    tl = earlierTimeline(talkScript(known), pages, known);
    scene = earlierCinematic(tl, sky, path);
    book = createNotebookModel(pages);
    stage.add(book.object);
    // Los que miran, vueltos hacia la Luna.
    for (const w of watchers) {
      standing(w.root.quaternion, headingTo(toVec(w.root.position), sky.moon), OOL_UPRIGHT);
    }
    const planet = worldMaestra?.parent ?? options.hogar;
    for (const ool of [her, ...watchers]) settleOnPlanet(ool.root, planet);
    stage.visible = true;
    runner = createCinematicRunner({
      scene,
      frame: anchor,
      reducedMotion: options.reducedMotion,
      preroll: EARLIER_PREROLL,
      speakers,
      label: t('Tres días después'),
      draft: true,
      text: {
        lettersPerSecond: () => lettersPerSecond(options.text.current.speed),
        letterSound: () => options.text.current.letterSound,
      },
      audio: {
        running: () => options.soundtrack.snapshot().running,
        muted: () => options.soundtrack.muted,
        unlock: () => {
          options.soundtrack.unlock();
        },
        blip: (pitch) => {
          options.soundtrack.blip(pitch);
        },
      },
      onCue: (cue) => {
        if (cue.id === MUSIC_CUE) options.soundtrack.playMusic(EARLIER_MUSIC, { fade: 8 });
      },
      onEnd: () => {
        current = 'done';
        options.finish();
      },
    });
  }

  function placeShip(timeline: EarlierTimeline, time: number): Vec3 {
    const state = shipAt(timeline, time, path);
    ship.object.position.set(...state.position);
    ship.object.quaternion.setFromAxisAngle(Z, state.yaw).multiply(UPRIGHT);
    poseHatch(ship.parts, state.hatch);
    const flicker = 0.85 + 0.15 * Math.sin(time * 31);
    for (const flame of lift) {
      flame.visible = state.burn > 0.04;
      const full = typeof flame.userData.fullLength === 'number' ? flame.userData.fullLength : 1;
      flame.scale.z = full * Math.sqrt(state.burn) * flicker;
    }
    const lit = beaconOn(time);
    for (const beacon of beacons) beacon.visible = lit;
    return state.position;
  }

  function placeYou(timeline: EarlierTimeline, time: number, dt: number): void {
    const walker = explorerAt(timeline, time);
    you.root.visible = walker.visible;
    stepGait(gait, {
      dt,
      speed: walker.speed,
      forward: 1,
      grounded: true,
      swimming: false,
      verticalSpeed: 0,
      turnRate: 0,
      landings: 0,
      landingSpeed: 0,
    });
    const pose = gaitPose(gait, 0);
    const carried = mixArm(pose.arms[1], CARRY_ARM, walker.holdsBook ? 1 : 0);
    you.setPose({ ...pose, arms: [pose.arms[0], mixArm(carried, OFFER_ARM, walker.offer)] }, 1);
    you.root.position.set(...walker.position);
    standing(you.root.quaternion, walker.heading, UPRIGHT);
  }

  /** Gira la mirada de `rig` hacia `target` (marco del nido) con `weight`; `body`, si puede girar el cuerpo. */
  function look(
    rig: OolRig,
    target: Vec3 | undefined,
    weight: number,
    body: number,
    dt: number,
    jumped: boolean,
  ): Gaze {
    const goal: Gaze = { turn: 0, yaw: 0, pitch: 0 };
    if (target) {
      turnBack.copy(rig.root.quaternion).invert();
      tmp
        .set(...target)
        .sub(rig.root.position)
        .applyQuaternion(turnBack);
      const dx = tmp.x - rig.eye.x;
      const dz = tmp.z - rig.eye.z;
      const raw = Math.atan2(-dx, -dz);
      const turn = body * (raw - clampTo(raw, [-HEAD_REACH, HEAD_REACH]));
      // Lo que queda por mirar con la cabeza, en el marco del cuerpo ya girado.
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const aimed = aimHead(
        [rig.eye.x, rig.eye.y, rig.eye.z],
        [rig.eye.x + dx * cos - dz * sin, tmp.y, rig.eye.z + dx * sin + dz * cos],
      );
      goal.turn = turn;
      goal.yaw = aimed.yaw * weight;
      goal.pitch = aimed.pitch * weight;
    }
    const was = gazes.get(rig);
    const k = jumped || !was ? 1 : 1 - Math.exp(-HEAD_RATE * dt);
    const now: Gaze = was
      ? {
          turn: was.turn + (goal.turn - was.turn) * k,
          yaw: was.yaw + (goal.yaw - was.yaw) * k,
          pitch: was.pitch + (goal.pitch - was.pitch) * k,
        }
      : goal;
    gazes.set(rig, now);
    return now;
  }

  function placeHer(
    timeline: EarlierTimeline,
    time: number,
    ship: Vec3,
    dt: number,
    jumped: boolean,
  ): void {
    const state = maestraAt(timeline, time);
    const youAt = explorerAt(timeline, time).position;
    const target: Vec3 | undefined =
      state.attention === 'nave'
        ? ship
        : state.attention === 'explorador'
          ? [youAt[0], youAt[1], youAt[2] + 1.15]
          : state.attention === 'cielo'
            ? sky.moon
            : undefined;
    const sky01 = state.attention === 'cielo' ? 1 : 0;
    const gaze = look(her, target, state.aim, sky01, dt, jumped);
    const bob = nod(time - timeline.marks.nod);
    const free = 1 - state.aim;
    const pose: OolPose = {
      ...state.pose,
      turn: gaze.turn,
      headYaw: state.pose.headYaw * free + gaze.yaw,
      headPitch:
        clampTo((state.pose.headPitch - bob) * free + gaze.pitch, OOL_LIMITS.headPitch) + bob,
      glow: state.pose.glow + breathe(time, 0.3).glow,
      lean: state.pose.lean + breathe(time, 0.3).lean,
    };
    her.setPose(pose);
  }

  function placeWatchers(
    timeline: EarlierTimeline,
    time: number,
    ship: Vec3,
    dt: number,
    jumped: boolean,
  ): void {
    const { touchdown } = timeline.marks;
    const onMoon = smoothstep(touchdown + 0.5, touchdown + 3, time);
    const target: Vec3 = [
      ship[0] + (sky.moon[0] - ship[0]) * onMoon,
      ship[1] + (sky.moon[1] - ship[1]) * onMoon,
      ship[2] + (sky.moon[2] - ship[2]) * onMoon,
    ];
    watchers.forEach((w, i) => {
      const gaze = look(w, target, 1, 1, dt, jumped);
      const base = i === POINTER ? pointUpPose() : lookUpPose(1);
      const pointing = i === POINTER ? 1 - smoothstep(touchdown - 1, touchdown + 1.5, time) : 0;
      const breath = breathe(time, i);
      w.setPose({
        ...base,
        armR: {
          raise: base.armR.raise * pointing,
          out: base.armR.out * pointing,
        },
        turn: gaze.turn,
        headYaw: gaze.yaw,
        headPitch: gaze.pitch,
        lean: base.lean + breath.lean,
        glow: base.glow + breath.glow,
      });
    });
  }

  function placeBook(timeline: EarlierTimeline, time: number): void {
    if (!book) return;
    const state = bookAt(timeline, time);
    book.set({ open: state.open, spread: state.spread, turning: state.turning });
    const hold = bookInHands();
    basis.makeBasis(new Vector3(...hold.x), new Vector3(...hold.y), new Vector3(...hold.z));
    herBook.setFromRotationMatrix(basis);
    const { handOver } = timeline.marks;
    const k = smoothstep(handOver - HAND_OVER, handOver + HAND_OVER, time);
    book.object.visible = you.root.visible || state.holder === 'maestra';
    if (k >= 1) {
      book.object.position.set(...hold.center);
      book.object.quaternion.copy(herBook);
      return;
    }
    // En tu mano: el cuaderno sale de la palma (con el lomo hacia fuera), girado contigo.
    stage.updateWorldMatrix(true, false);
    you.root.updateMatrixWorld(true);
    you.bones.handR.getWorldPosition(hand);
    stage.worldToLocal(hand);
    yourTurn.copy(you.root.quaternion);
    yourBook.copy(yourTurn).multiply(BOOK_IN_HAND);
    tmp.set(NOTEBOOK.pageWidth * 0.45, 0, 0.012).applyQuaternion(yourBook);
    hand.add(tmp);
    book.object.position.copy(hand).lerp(tmp.set(...hold.center), k);
    book.object.quaternion.copy(yourBook).slerp(herBook, k);
  }

  function hideGame(): void {
    for (const root of options.hide) if (root) hideKeepingLights(root);
    for (const group of markers) group.visible = false;
    if (worldMaestra) worldMaestra.visible = false;
  }

  function light(time: number): void {
    if (!scene) return;
    anchor.updateWorldMatrix(true, false);
    fill.position.set(...FILL.at).applyMatrix4(anchor.matrixWorld);
    fill.intensity = FILL.intensity * trackValue(scene, 'fill', time, 0);
  }

  function pose(camera: PerspectiveCamera, dt: number): void {
    if (!tl || !runner) return;
    const time = Math.max(0, runner.state.time);
    const step = runner.state.paused ? 0 : dt;
    const jumped = !Number.isFinite(lastTime) || Math.abs(time - lastTime - step) > 0.25;
    lastTime = time;
    const shipAtNow = placeShip(tl, time);
    placeYou(tl, time, step);
    placeHer(tl, time, shipAtNow, step, jumped);
    placeWatchers(tl, time, shipAtNow, step, jumped);
    placeBook(tl, time);
    light(time);
    runner.aim(camera);
    camera.updateMatrixWorld();
    // En sus ojos (las páginas), su cabeza no se dibuja.
    her.joints.head.getWorldPosition(head);
    her.joints.head.visible = head.distanceTo(camera.position) > EYE_CLEARANCE;
  }

  return {
    get active() {
      return current !== 'waiting';
    },
    apply(camera, dt) {
      if (current === 'waiting') {
        settled += 1;
        if (settled < SETTLE_FRAMES) return;
        start();
      }
      hideGame();
      runner?.update(dt);
      pose(camera, dt);
    },
    snapshot() {
      if (!tl || !scene) return null;
      const state = runner?.state;
      const time = state?.time ?? -EARLIER_PREROLL;
      const now = Math.max(0, time);
      const reading = beatAt(tl, now);
      const held = bookAt(tl, now);
      const view = cameraAt(scene, now);
      return {
        stage: current,
        time,
        shot: shotAt(scene, now).shot.id,
        phase: phaseAt(tl, now),
        paused: state?.paused ?? false,
        done: state?.done ?? false,
        page: reading?.page ?? null,
        book: { holder: held.holder, open: held.open, spread: held.spread },
        marks: { ...tl.marks, duration: tl.duration },
        moon: round(sky.moon),
        bite: round(sky.bite),
        ship: round(shipAt(tl, now, path).position),
        camera: { pos: centimeters(view.pos), look: centimeters(view.look), fov: view.fov },
        pages: pageCount,
      };
    },
    seek(time) {
      runner?.seek(time);
    },
  };
}
