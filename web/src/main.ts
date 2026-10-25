// Arranque del juego: mundos → sistema → jugador → controles → ciclo → bucle de render.
// Cada pieza vive en su módulo; aquí solo se conectan.
import './style.css';
import { Quaternion, Timer, Vector3, type PerspectiveCamera, type WebGLRenderer } from 'three';
import { loadChronology } from './core/chronology';
import { createFixedStep } from './core/fixedStep';
import { IDLE_INTENT } from './core/inputController';
import { createLoopSession } from './core/loopSession';
import { Player } from './core/player';
import { triggersAsEvents } from './core/timeline';
import {
  FIELD_OF_VIEW,
  MAX_PHYSICS_STEPS_PER_FRAME,
  MOUSE_LOOK_SENSITIVITY,
  PHYSICS_STEP,
} from './data/movement';
import { createControls } from './game/controls';
import { loadSystem } from './game/loadSystem';
import { loadClues } from './data/pistas';
import { ReadingSession } from './reading/readingSession';
import { createReadingUi, type ReadingUi } from './reading/readingUi';
import { createWorldSources, type WorldSources } from './reading/worldSources';
import { forwardOf, upOf } from './physics/surfaceFrame';
import { cameraPose } from './render/firstPersonCamera';
import { createStarfield } from './render/sky';
import { createStage } from './render/stage';
import { createSystemScene } from './render/systemScene';
import { createLocator, createStandaloneLocator, type WorldBody } from './system/locator';
import { bodyPose } from './system/orbits';
import { createDebugOverlay, type SystemSnapshot } from './ui/debugOverlay';
import { createOrbitMap } from './ui/orbitMap';
import { isTouchDevice } from './ui/pauseOverlay';
import { environmentOf, type WorldRuntime } from './worlds/worldRuntime';
import { worldFromQuery, worldTitle } from './worlds/worldSelection';

const NEAR_PLANE = 0.05;

function requireElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Falta el elemento #${id}`);
  return element;
}

function watchGraphicsContext(canvas: HTMLCanvasElement, status: HTMLElement): void {
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); // permite que el navegador restaure el contexto
    status.textContent = 'Se perdió el contexto gráfico; intentando recuperarlo…';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    status.textContent = '';
  });
}

function runFrameLoop(
  renderer: WebGLRenderer,
  render: () => void,
  frame: (dt: number) => void,
): void {
  const timer = new Timer();
  timer.connect(document); // pausa el tiempo cuando la pestaña está oculta
  renderer.setAnimationLoop((time: number) => {
    timer.update(time);
    frame(timer.getDelta());
    render();
  });
}

function runtimeOf(runtimes: ReadonlyMap<string, WorldRuntime>, id: string): WorldRuntime {
  const runtime = runtimes.get(id);
  if (!runtime) throw new Error(`El mundo "${id}" no está cargado`);
  return runtime;
}

async function start(): Promise<void> {
  const canvas = requireElement('game', HTMLCanvasElement);
  const status = requireElement('status', HTMLParagraphElement);
  const { renderer, scene, camera, sun } = createStage(canvas);
  setupCamera(camera);
  watchGraphicsContext(canvas, status);

  const { spec, startWorld, runtimes } = await loadSystem(worldFromQuery(window.location.search));
  const clues = loadClues();
  // Las fuentes salen de las marcas del modelo: se crean antes de colgar los mundos de la escena.
  const sources = new Map<string, WorldSources>(
    [...runtimes].map(([id, runtime]) => [id, createWorldSources(runtime, clues)]),
  );
  const sky = createStarfield();
  scene.add(sky);
  const systemScene = createSystemScene({
    scene,
    system: spec,
    worlds: new Map([...runtimes].map(([id, runtime]) => [id, runtime.world])),
    sun,
    sky,
    start: startWorld,
  });

  const first = runtimeOf(runtimes, startWorld);
  const player = new Player(first.spawn, environmentOf(first), first.well);
  let currentWorld = first;
  const game: { ui?: ReadingUi } = {};

  /** Pasa a pie a otro mundo: nuevo marco de referencia, gravedad, colisiones y fuentes. */
  function enterWorld(id: string): void {
    currentWorld = runtimeOf(runtimes, id);
    player.switchWorld(currentWorld.spawn, environmentOf(currentWorld), currentWorld.well);
    systemScene.setReference(id);
    const worldSources = sources.get(id);
    if (worldSources) game.ui?.setWorld(worldSources);
  }

  const chronology = loadChronology(window.location.search);
  const bodies: WorldBody[] = [...runtimes.values()].map((r) => ({
    world: r.id,
    radius: r.world.info.radius,
    clockRate: r.world.info.clockRate,
  }));
  const systemLocator = spec ? createLocator(spec, bodies, chronology) : undefined;
  const standalone = createStandaloneLocator(
    bodies.find((b) => b.world === startWorld) ?? { world: startWorld, radius: 1, clockRate: 1 },
    chronology,
  );
  const systemPosition = new Vector3();

  const session = createLoopSession({
    scene,
    sun,
    chronology,
    locate: (t) => {
      if (!systemLocator) return standalone(t);
      systemScene.toSystem(player.state.position, t, systemPosition);
      return systemLocator.locate(t, currentWorld.id, systemPosition);
    },
    extraEvents: [...runtimes.values()].flatMap((r) =>
      triggersAsEvents(r.world.markers.triggers, r.id),
    ),
    player,
    skyDirection: arrivalSkyDirection(player),
    // Cada ciclo empieza en el mundo de llegada.
    onRestart: () => {
      enterWorld(startWorld);
    },
  });
  const reading = new ReadingSession(clues, session.savedFacts, (facts) =>
    session.saveFacts(facts),
  );
  const { input, overlay } = createControls(canvas, worldTitle(startWorld), session, () => {
    game.ui?.openRegistry();
  });
  const startSources = sources.get(startWorld);
  if (!startSources) throw new Error(`Faltan las fuentes de ${startWorld}`);
  const ui = createReadingUi({
    camera,
    sources: startSources,
    clues,
    reading,
    loop: session,
    overlay,
    player,
    touch: isTouchDevice(),
  });
  game.ui = ui;

  const debug = createDebugOverlay({
    where: () => ({
      world: currentWorld.id,
      home: currentWorld.well,
      wells: environmentOf(currentWorld).wells,
    }),
    player,
    renderer,
    loop: () => session.snapshot(),
    registry: () => ui.snapshot(),
    system: () => systemSnapshot(),
  });
  function systemSnapshot(): SystemSnapshot {
    const t = session.director.clock.t;
    const positions: SystemSnapshot['bodies'] = {};
    for (const body of spec?.bodies ?? []) {
      const { position } = bodyPose(body, t);
      positions[body.world] = [position.x, position.y, position.z];
    }
    return { reference: systemScene.referenceWorld ?? null, bodies: positions };
  }
  const orbitMap = spec ? createOrbitMap(spec, systemSnapshot) : undefined;
  if (window.__juego) {
    window.__juego.teleportTo = (clueId) => {
      const owner = [...sources.values()].find((s) => s.interactables.some((i) => i.id === clueId));
      if (!owner) return false;
      if (owner.world !== currentWorld.id) enterWorld(owner.world);
      return ui.teleportTo(clueId);
    };
    window.__juego.warpTo = (world) => {
      if (!runtimes.has(world)) return false;
      enterWorld(world);
      return true;
    };
  }

  const physics = createFixedStep(
    { stepSeconds: PHYSICS_STEP, maxStepsPerFrame: MAX_PHYSICS_STEPS_PER_FRAME },
    (dt) => {
      const moving = overlay.playing && session.acceptsInput && !ui.blocking;
      player.step(moving ? input.intent() : IDLE_INTENT, dt);
    },
  );
  status.textContent = '';

  const feet = new Vector3();
  const body = new Quaternion();
  runFrameLoop(
    renderer,
    () => {
      renderer.render(scene, camera);
    },
    (dt) => {
      const look = input.consumeLook();
      const timeRuns = overlay.playing && !ui.blocking; // leer o abrir el Registro detiene el ciclo
      if (timeRuns && session.acceptsInput) {
        player.look(-look.x * MOUSE_LOOK_SENSITIVITY, -look.y * MOUSE_LOOK_SENSITIVITY);
      }
      session.update(dt, timeRuns);
      // En pausa la física sigue (jugador quieto, se asienta en el suelo); el ciclo sí se detiene.
      const alpha = physics.advance(dt);
      player.interpolatedFeet(alpha, feet);
      player.interpolatedBody(alpha, body);
      cameraPose(body, player.pitch, feet, camera.position, camera.quaternion);
      camera.position.add(session.shake);
      systemScene.update(session.director.clock.t);
      ui.update(performance.now() / 1000);
      debug.update(dt, overlay.playing);
      orbitMap?.update(dt);
    },
  );
}

/** Delante y unos 25° por encima del horizonte del punto de llegada (provisional, Fase 3). */
function arrivalSkyDirection(player: Player): Vector3 {
  const { body } = player.state;
  return forwardOf(body).addScaledVector(upOf(body), 0.45).normalize();
}

function setupCamera(camera: PerspectiveCamera): void {
  camera.fov = FIELD_OF_VIEW;
  camera.near = NEAR_PLANE;
  camera.updateProjectionMatrix();
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = 'No se pudo cargar el mundo. Revisa la consola.';
});
