// El final malo en el navegador (F5, «Llegas tarde»; 🟡 todo el aspecto). Con `?mundo=hogar&final=tarde` se llega al
// Hogar de diez años después (worlds/procedural/hogarLater*.ts) y este montaje lleva la visita entera con el reloj
// de game/homeCollapse.ts:
//  1. la llegada, una escena: por La Boca, a pie por la Puerta Mayor encendida; por una boca equivocada del Archivo,
//     en el Albatros II sobre Hogar (game/homeCollapseScene.ts);
//  2. el paseo: se anda libre para reconocer la casa (el reloj corre solo jugando);
//  3. las señales de cada ciclo mientras se sigue andando: los anillos de luz, el pulso y el cielo rojo (los efectos
//     del ciclo, render/loopEffects.ts, más un velo rojo encima del aire, que tapa el fondo);
//  4. la escena del colapso: el agujero nace en la garganta de la Puerta Mayor (la esfera de la Puerta se apaga),
//     crece (render/blackHoleView.ts) y se traga la Luna (render/absorptionView.ts, cae de lejos estirándose) y Hogar
//     (que lo lleva encima: se hunde entero en él). Fundido y la tarjeta.
// Los eventos van con los ids del ciclo, así que la música (`music.cielo_rojo`, `music.agujero_negro`) y el sonido del
// nacimiento los pone main.ts como siempre. Nada de esto toca el agujero de Cicatriz.
import {
  BackSide,
  Color,
  CustomBlending,
  Light,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OneMinusSrcAlphaFactor,
  SphereGeometry,
  SrcAlphaFactor,
  Vector3,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { Vec3 } from '../cinematic/cameraTrack';
import { shotAt, type Cinematic } from '../cinematic/timeline';
import { createAbsorptionView, type AbsorptionView } from '../render/absorptionView';
import { createBlackHoleView, type BlackHoleView } from '../render/blackHoleView';
import { createLoopEffects, type LoopEffects } from '../render/loopEffects';
import { createWormholeSphere, type WormholeSphere } from '../render/wormholeSphere';
import { lettersPerSecond, type TextSettings } from '../typewriter/textPreferences';
import { voicePitch } from '../typewriter/speech';
import { GATE_SPHERE_RADIUS } from '../worlds/procedural/hogarLaterShape';
import type { Soundtrack } from '../audio/soundtrack';
import { t } from '../i18n';
import { createCinematicRunner, type CinematicRunner } from './cinematicRunner';
import type { HomeVia } from './homecoming';
import {
  activeEvents,
  advanceFree,
  COLLAPSE,
  collapseAt,
  collapseTimeline,
  type CollapsePhase,
  type CollapseView,
} from './homeCollapse';
import {
  ARRIVAL_PREROLL,
  arrivalByShip,
  arrivalOnFoot,
  collapseCinematic,
  ELDER,
  GATE_FLASH_CUE,
  type CameraEnd,
} from './homeCollapseScene';

/** El grupo de rombos de las fuentes de cada mundo (render/sourceMarkers.ts). */
const SOURCE_MARKERS = 'Rombos de fuentes';
/** El otro lado de la Puerta Mayor: la luz de la Brasa (la llamada viene de allí). */
const GATE_TINT = 0xffc590;
/** El destello de la Puerta al cruzarla: lo que crece la esfera y lo que tarda en apagarse (s). */
const FLASH_GROW = 0.1;
const FLASH_FADE = 1.4;
/** El velo del cielo: rojo del final y destello del pulso (encima del aire, que tapa el fondo). */
const RED_VEIL = new Color(0x8a2412);
const PULSE_VEIL = new Color(0xc03a1c);
const VEIL = { red: 0.55, pulse: 0.7, radius: 1400 } as const;
/** Hacia dónde se curvan los anillos de las señales (marco del ancla): delante y alto, sobre el Instituto. */
const SIGNALS_SKY: Vec3 = [0, 0.55, 0.83];
/** A qué distancia delante de la vista se toma el punto al que mira al acabar la llegada (m). */
const LOOK_AHEAD = 60;
/** Lo hundido que tiene que estar Hogar para dejar de dibujarlo (su tamaño ya es casi nada). */
const SUNK = 0.995;
/** Fotogramas de juego que se esperan antes de la llegada: en el primero la nave aún no está sobre Hogar. */
const SETTLE_FRAMES = 3;

type Stage = 'waiting' | 'arrival' | 'free' | 'collapse' | 'card';

export interface HomeWorld {
  /** Lo que el sistema mueve (`systemScene.groupOf`). */
  pivot: Object3D;
  /** El modelo del mundo, con el centro en el origen (`runtime.world.scene`). */
  model: Object3D;
  radius: number;
}

export interface HomeLaterRigOptions {
  via: HomeVia;
  scene: Scene;
  sun: Light;
  hogar: HomeWorld;
  luna: HomeWorld | undefined;
  /** La garganta de la Puerta Mayor (la marca del `"agujero"` de data/sistema-hogar.json). */
  anchor: Object3D;
  soundtrack: Soundtrack;
  reducedMotion: boolean;
  text: TextSettings;
  /** El explorador: se esconde en las escenas (sus luces no, para no recompilar los materiales). */
  hide: readonly (Object3D | undefined)[];
  /** La nave (llegando por el Archivo, para el primer plano). */
  ship(): Object3D | undefined;
  /** Cuánto tapa el aire el cielo donde está la cámara (0–1): el velo rojo va encima. */
  air(): number;
  /** Empieza una escena: el juego deja de escuchar (lectura, pausa, ratón). */
  hold(): void;
  /** Acaba la llegada: se vuelve a jugar. */
  release(): void;
  /** Acaba el colapso: la tarjeta del final. */
  finish(): void;
}

export interface HomeLaterSnapshot {
  via: HomeVia;
  stage: Stage;
  phase: CollapsePhase;
  /** Segundos desde que se llegó; y desde que empezó la escena del colapso (negativo antes). */
  time: number;
  sceneTime: number;
  /** La escena en curso, su plano y si está en pausa. */
  cinematic: string | null;
  shot: string | null;
  paused: boolean;
  events: string[];
  hole: { radius: number; visible: boolean; fill: number };
  absorbed: CollapseView['absorbed'];
  red: number;
  pulse: number;
  gate: number;
  /** Dónde está la Luna (marco del ancla, m), para encuadrar. */
  moon: number[] | null;
  timeline: {
    arrivalEnd: number;
    signalsStart: number;
    sceneStart: number;
    birth: number;
    end: number;
  };
}

export interface HomeLaterRig {
  readonly phase: CollapsePhase;
  /** Hay una escena (o la tarjeta): ni andar ni mirar. */
  readonly blocking: boolean;
  /** Los eventos en curso, con los ids del ciclo (para la música y los sonidos). */
  readonly events: readonly string[];
  /** Cuánto cielo ocupa el agujero (0–1), para su rumor. */
  readonly fill: number;
  /** El agujero en la escena, para la lente del cielo. */
  lens(): { position: Vector3; radius: number } | undefined;
  /** Cada fotograma, después de poner el sistema y la vista del juego en su sitio. */
  apply(camera: PerspectiveCamera, dt: number, running: boolean): void;
  snapshot(): HomeLaterSnapshot;
  /** Para probar (`?debug`): salta a ese segundo de la visita (las escenas quedan en pausa si no se dice). */
  seek(time: number, pause?: boolean): void;
  /** Para probar: salta a ese segundo de la escena del colapso (en pausa si no se dice). */
  seekScene(time: number, pause?: boolean): void;
}

/**
 * El marco de las escenas: el del ancla, pero colgado del pivote de Hogar (no de su modelo, que se encoge hacia el
 * agujero al final): así las cámaras no se encogen con él.
 */
function sceneFrame(anchor: Object3D, pivot: Object3D): Object3D {
  const frame = new Object3D();
  frame.name = 'Hogar · marco de las escenas';
  pivot.updateWorldMatrix(true, false);
  anchor.updateWorldMatrix(true, false);
  frame.matrix.copy(pivot.matrixWorld).invert().multiply(anchor.matrixWorld);
  frame.matrix.decompose(frame.position, frame.quaternion, frame.scale);
  pivot.add(frame);
  frame.updateWorldMatrix(true, false);
  return frame;
}

/**
 * Hogar cae en el agujero que nació en su superficie: el modelo entero (tierra, mar y nubes) se encoge hacia él,
 * cada vez más deprisa. `hole`: el agujero en el marco del padre del modelo; `rest`, cómo estaba el modelo.
 */
function sink(model: Object3D, rest: Object3D, hole: Vector3, progress: number): void {
  const q = Math.min(1, Math.max(0, progress)) ** 2;
  model.visible = q < SUNK;
  model.position.copy(rest.position).lerp(hole, q);
  model.scale.copy(rest.scale).multiplyScalar(1 - q);
}

/** Esconde lo que no es luz (las luces siguen: su número no cambia). */
function hideKeepingLights(root: Object3D): void {
  if (root instanceof Light) return;
  if (root.getObjectByProperty('isLight', true) === undefined) {
    root.visible = false;
    return;
  }
  for (const child of root.children) hideKeepingLights(child);
}

/** Un punto de la escena en el marco del ancla. */
function local(anchor: Object3D, point: Vector3): Vec3 {
  const p = anchor.worldToLocal(point.clone());
  return [p.x, p.y, p.z];
}

/** La vista de la cámara (posición y punto al que mira) en el marco del ancla. */
function viewOf(anchor: Object3D, camera: PerspectiveCamera): CameraEnd {
  const eye = camera.getWorldPosition(new Vector3());
  const ahead = camera.getWorldDirection(new Vector3()).multiplyScalar(LOOK_AHEAD).add(eye);
  return { pos: local(anchor, eye), look: local(anchor, ahead) };
}

/** El velo del cielo: una esfera por dentro, alrededor de la cámara, que tiñe lo que pinta el aire. */
function createVeil(scene: Scene): Mesh<SphereGeometry, MeshBasicMaterial> {
  const veil = new Mesh(
    new SphereGeometry(1, 24, 12),
    // Opaco a efectos de orden (como el aire: va en la lista de lo opaco, detrás de todo), pero mezclado por su alfa.
    new MeshBasicMaterial({
      color: RED_VEIL,
      opacity: 0,
      side: BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
      blending: CustomBlending,
      blendSrc: SrcAlphaFactor,
      blendDst: OneMinusSrcAlphaFactor,
    }),
  );
  veil.name = 'Hogar · velo del cielo';
  veil.scale.setScalar(VEIL.radius);
  veil.renderOrder = -0.45; // justo después del aire (-0,5)
  veil.frustumCulled = false;
  veil.visible = false;
  scene.add(veil);
  return veil;
}

/** El montaje de la visita: espera a que el juego corra para empezar la llegada. */
export function createHomeLaterRig(options: HomeLaterRigOptions): HomeLaterRig {
  const { via } = options;
  const tl = collapseTimeline(COLLAPSE, via);
  const anchor = sceneFrame(options.anchor, options.hogar.pivot);
  const skyDirection = new Vector3(...SIGNALS_SKY).transformDirection(anchor.matrixWorld);
  const effects: LoopEffects = createLoopEffects(options.scene, options.sun, skyDirection);
  const veil = createVeil(options.scene);
  const gate: WormholeSphere = createWormholeSphere(GATE_TINT);
  gate.root.name = 'Hogar · Puerta Mayor encendida';
  gate.root.scale.setScalar(GATE_SPHERE_RADIUS);
  anchor.add(gate.root);
  const gateTint = new Color(GATE_TINT);
  const birthplace = options.hogar.pivot.worldToLocal(anchor.getWorldPosition(new Vector3()));
  const hole: BlackHoleView = createBlackHoleView(options.hogar.pivot, birthplace, tl.growth);
  // La Luna cae de lejos (se estira hacia él); Hogar, que lo lleva encima, se hunde en él entero (`sink`).
  const absorption: AbsorptionView = createAbsorptionView(
    options.scene,
    options.luna ? [{ id: 'luna', ...options.luna, window: tl.absorption.luna }] : [],
  );
  const home = options.hogar.model;
  const homeRest = new Object3D();
  homeRest.position.copy(home.position);
  homeRest.scale.copy(home.scale);
  const homeHole = (home.parent ?? options.hogar.pivot).worldToLocal(
    anchor.getWorldPosition(new Vector3()),
  );
  const markers: Object3D[] = [];
  options.hogar.model.traverse((child) => {
    if (child.name === SOURCE_MARKERS) markers.push(child);
  });
  const speakers = {
    [ELDER]: { name: t('Una Ool mayor'), voice: voicePitch('Una Ool mayor') },
  };

  let stage: Stage = 'waiting';
  let settled = 0;
  let time = 0;
  let runner: CinematicRunner | undefined;
  let scene: Cinematic | undefined;
  let flash = 0;
  let view = collapseAt(tl, 0);
  let events: string[] = [];

  function play(cinematic: Cinematic, label: string, preroll: number, onEnd: () => void): void {
    scene = cinematic;
    runner = createCinematicRunner({
      scene: cinematic,
      frame: anchor,
      reducedMotion: options.reducedMotion,
      preroll,
      speakers,
      label,
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
        if (cue.id === GATE_FLASH_CUE) flash = 1;
      },
      onEnd,
    });
  }

  function startArrival(camera: PerspectiveCamera): void {
    stage = 'arrival';
    options.hold();
    document.body.classList.add('cinematica');
    const end = viewOf(anchor, camera);
    const ship = via === 'archivo' ? options.ship() : undefined;
    const cinematic = ship
      ? arrivalByShip(tl.arrivalEnd, local(anchor, ship.getWorldPosition(new Vector3())), end)
      : arrivalOnFoot(tl.arrivalEnd, end);
    play(cinematic, t('Llegada a Hogar'), ARRIVAL_PREROLL, endArrival);
  }

  /** Acaba la llegada (o se salta con `seek`): se vuelve a jugar. */
  function endArrival(): void {
    if (stage !== 'arrival') return;
    stage = 'free';
    time = Math.max(time, tl.arrivalEnd);
    runner?.dispose();
    runner = undefined;
    scene = undefined;
    document.body.classList.remove('cinematica');
    for (const group of markers) group.visible = true;
    options.release();
  }

  function startCollapse(): void {
    if (stage === 'arrival') endArrival();
    stage = 'collapse';
    time = Math.max(time, tl.sceneStart);
    options.hold();
    document.body.classList.add('cinematica');
    const moon = options.luna?.pivot.getWorldPosition(new Vector3());
    play(
      collapseCinematic(COLLAPSE, moon ? local(anchor, moon) : undefined),
      t('El colapso de Hogar'),
      0,
      () => {
        stage = 'card';
        time = tl.end;
        options.finish();
      },
    );
  }

  /** Avanza la escena en curso y pone la cámara; el reloj de la visita sigue al de la escena. */
  function playScene(camera: PerspectiveCamera, dt: number, from: number): void {
    const current = runner;
    if (!current) return;
    current.update(dt);
    // La llegada acabó en este paso: manda ya la vista del juego (es donde acababa la escena).
    if (current !== runner) return;
    if (stage === 'arrival' || stage === 'collapse') time = from + Math.max(0, current.state.time);
    current.aim(camera);
  }

  function seek(to: number, pause = true): void {
    if (stage === 'waiting' || stage === 'card') return;
    if (to < tl.arrivalEnd) {
      if (stage === 'arrival') runner?.seek(to, pause);
      return;
    }
    if (to < tl.sceneStart) {
      if (stage === 'collapse') return; // la escena no tiene vuelta atrás
      endArrival();
      time = to;
      return;
    }
    if (stage !== 'collapse') startCollapse();
    runner?.seek(to - tl.sceneStart, pause);
  }

  /** Lo que se ve: los efectos del ciclo, el velo del cielo, la Puerta encendida, el agujero y lo que se traga. */
  function draw(camera: PerspectiveCamera, dt: number): void {
    view = collapseAt(tl, time);
    const active = activeEvents(tl, time);
    events = view.events;
    effects.update(time, active, view.absorbed.hogar, dt);
    camera.position.add(effects.shake);
    camera.updateMatrixWorld();

    const air = Math.min(1, Math.max(0, options.air()));
    const veilOpacity = Math.max(view.red * VEIL.red, view.pulse * VEIL.pulse) * air;
    veil.visible = veilOpacity > 0.002;
    veil.position.copy(camera.position);
    veil.material.opacity = veilOpacity;
    veil.material.color.copy(RED_VEIL).lerp(PULSE_VEIL, view.pulse);

    flash = Math.max(0, flash - dt / FLASH_FADE);
    gate.root.visible = view.gate > 0.002;
    gate.open.value = view.gate;
    gate.time.value += dt;
    gate.root.scale.setScalar(GATE_SPHERE_RADIUS * (1 + FLASH_GROW * flash));
    gate.tint.value
      .copy(gateTint)
      .lerp(RED_VEIL, view.red * 0.6)
      .lerp(new Color(1, 1, 1), flash);

    hole.update(time, camera, dt);
    sink(home, homeRest, homeHole, view.absorbed.hogar);
    absorption.update({
      t: time,
      hole: hole.lens(),
      reference: undefined,
      viewer: camera.position,
      dt,
    });
  }

  function hideForScene(): void {
    for (const root of options.hide) if (root) hideKeepingLights(root);
    for (const group of markers) group.visible = false;
  }

  return {
    get phase() {
      return stage === 'waiting' ? 'arrival' : view.phase;
    },
    get blocking() {
      return stage !== 'free';
    },
    get events() {
      return events;
    },
    get fill() {
      return hole.fill;
    },
    lens() {
      return hole.lens();
    },
    apply(camera, dt, running) {
      if (stage === 'waiting') {
        if (!running) return;
        // La nave (y con ella la cámara de la cabina) se pone en su sitio en el primer fotograma de juego.
        settled += 1;
        if (settled < SETTLE_FRAMES) return;
        startArrival(camera);
      }
      let step = running ? dt : 0;
      if (stage === 'arrival') {
        hideForScene();
        playScene(camera, dt, 0);
        step = runner?.state.paused ? 0 : dt;
      } else if (stage === 'free') {
        time = advanceFree(tl, time, dt, running);
        if (time >= tl.sceneStart) startCollapse();
      }
      if (stage === 'collapse' || stage === 'card') {
        hideForScene();
        playScene(camera, dt, tl.sceneStart);
        step = stage === 'card' || runner?.state.paused ? 0 : dt;
      }
      draw(camera, step);
    },
    snapshot() {
      const state = runner?.state;
      const sceneNow = state && scene ? Math.max(0, state.time) : undefined;
      const holeNow = hole.snapshot();
      const moonNow = options.luna?.pivot.getWorldPosition(new Vector3());
      return {
        via,
        stage,
        phase: stage === 'waiting' ? 'arrival' : view.phase,
        time,
        sceneTime: time - tl.sceneStart,
        cinematic: scene?.id ?? null,
        shot: scene && sceneNow !== undefined ? shotAt(scene, sceneNow).shot.id : null,
        paused: state?.paused ?? false,
        events: [...events],
        hole: { radius: holeNow.radius, visible: holeNow.visible, fill: hole.fill },
        absorbed: { ...view.absorbed },
        red: view.red,
        pulse: view.pulse,
        gate: view.gate,
        moon: moonNow ? local(anchor, moonNow).map((v) => Math.round(v)) : null,
        timeline: {
          arrivalEnd: tl.arrivalEnd,
          signalsStart: tl.signalsStart,
          sceneStart: tl.sceneStart,
          birth: tl.birth,
          end: tl.end,
        },
      };
    },
    seek,
    seekScene(to, pause) {
      seek(tl.sceneStart + to, pause);
    },
  };
}
