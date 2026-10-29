// Arranque del juego: mundos → sistema → nave → jugador → controles → ciclo → bucle de render.
// Cada pieza vive en su módulo; aquí solo se conectan.
import './style.css';
import { Quaternion, Timer, Vector3, type PerspectiveCamera, type WebGLRenderer } from 'three';
import { loadChronology } from './core/chronology';
import { createSoundtrack } from './audio/soundtrack';
import { createFoldedPassage } from './game/foldedPassage';
import { createTideEffects } from './game/tideEffects';
import { insideCavity } from './physics/gravity';
import { createInteriorLights } from './render/interiorLight';
import { createLensView } from './render/lensView';
import { createBlackHoleView } from './render/blackHoleView';
import { BLACK_HOLE } from './data/blackHole';
import { qualityFromQuery } from './core/quality';
import { createSightScale } from './ui/sightScale';
import { createFixedStep } from './core/fixedStep';
import { IDLE_INTENT } from './core/inputController';
import type { DeathCause } from './core/loopDirector';
import { createLoopSession } from './core/loopSession';
import { Player } from './core/player';
import { triggersAsEvents } from './core/timeline';
import {
  FIELD_OF_VIEW,
  MAX_PHYSICS_STEPS_PER_FRAME,
  MOUSE_LOOK_SENSITIVITY,
  PHYSICS_STEP,
} from './data/movement';
import { loadClues } from './data/pistas';
import { createControls } from './game/controls';
import { loadSystem } from './game/loadSystem';
import { createShipFlight, type ShipFlight } from './game/shipFlight';
import type { MotorEnvironment } from './physics/characterMotor';
import { withSphereObstacle } from './physics/obstacles';
import { forwardOf, upOf } from './physics/surfaceFrame';
import { ReadingSession } from './reading/readingSession';
import { createReadingUi, type ReadingUi } from './reading/readingUi';
import { createWorldSources, type WorldSources } from './reading/worldSources';
import { cameraPose } from './render/firstPersonCamera';
import { createStarfield } from './render/sky';
import { AMBIENT_COLOR, AMBIENT_INTENSITY, createStage } from './render/stage';
import { createSystemScene } from './render/systemScene';
import { loadShipModel } from './ship/loadShip';
import { createLocator, createStandaloneLocator, type WorldBody } from './system/locator';
import { bodyPose } from './system/orbits';
import { createDebugOverlay, type SystemSnapshot } from './ui/debugOverlay';
import { createOrbitMap } from './ui/orbitMap';
import { isTouchDevice } from './ui/pauseOverlay';
import type { WorldRuntime } from './worlds/worldRuntime';
import { worldFromQuery, worldTitle } from './worlds/worldSelection';

const NEAR_PLANE = 0.05;
/** Mundo donde espera la nave al empezar cada ciclo (la llegada). */
const SHIP_HOME = 'umbral';
/** Desde aquí, durante este evento, la imagen del Nudo se ve con claridad (cronologia.json). */
const OBSERVATORY = 'observatorio';
const ALIGNMENT_EVENT = 'alineacion';
/** La marea del Borde sale de donde está su fuente de lectura (CONTEXTO_PLANETAS.md §6). */
const EDGE_WORLD = 'cicatriz';
const EDGE_SOURCE = 'cicatriz.borde';

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
  const { renderer, scene, camera, sun, ambient } = createStage(canvas);
  setupCamera(camera);
  watchGraphicsContext(canvas, status);

  const { spec, startWorld, runtimes } = await loadSystem(worldFromQuery(window.location.search));
  const shipModel = spec && runtimes.has(SHIP_HOME) ? await loadShipModel() : undefined;
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
  // El Nudo por dentro: su luz sustituye a la de la Brasa, y sus anillos pliegan el paso.
  const interior = createInteriorLights(runtimes, sun);
  const passage = createFoldedPassage();
  // …y por fuera: su imagen en el cielo, girada hacia la Brasa, y las estrellas que dobla a su paso.
  // (el agujero negro dobla también las estrellas; con `?calidad=baja` no se dobla nada).
  const lens = createLensView(scene, sky, qualityFromQuery(window.location.search) === 'alta');
  // El agujero negro: nace a las 13:30 en la Sala del Motor de Cicatriz y viaja con ella.
  const birthplace = sources
    .get(BLACK_HOLE.world)
    ?.interactables.find((i) => i.id === BLACK_HOLE.source)?.position;
  const blackHole = createBlackHoleView(systemScene.groupOf(BLACK_HOLE.world), birthplace);
  // La mira graduada (G): solo mide ángulos; con ella se corrige la imagen sin calcular nada.
  const sight = createSightScale(camera, canvas);
  // Las mareas: junto al Borde de Cicatriz, subiendo hacia la semilla del Nudo y sobre su cáscara.
  const edge = sources.get(EDGE_WORLD)?.interactables.find((i) => i.id === EDGE_SOURCE);
  const tides = createTideEffects(camera, {
    edge: edge ? { world: EDGE_WORLD, position: edge.position } : undefined,
  });
  let tideDeath: DeathCause | undefined;
  const hiddenWorld = spec?.bodies.find((body) => body.hidden)?.world;

  // A pie, la nave posada es un obstáculo más del mundo donde está.
  const game: { ui?: ReadingUi; flight?: ShipFlight } = {};
  const walking = new Map<string, MotorEnvironment>(
    [...runtimes].map(([id, runtime]) => [
      id,
      {
        wells: [runtime.well],
        world: withSphereObstacle(runtime.collision, () => game.flight?.obstacleIn(id)),
      },
    ]),
  );
  const envOf = (id: string): MotorEnvironment => {
    const env = walking.get(id);
    if (!env) throw new Error(`El mundo "${id}" no está cargado`);
    return env;
  };

  const first = runtimeOf(runtimes, startWorld);
  const player = new Player(first.spawn, envOf(startWorld), first.well);
  let currentWorld = first;

  /** Pasa a pie a otro mundo: nuevo marco de referencia, gravedad, colisiones y fuentes. */
  function enterWorld(id: string): void {
    currentWorld = runtimeOf(runtimes, id);
    player.switchWorld(currentWorld.spawn, envOf(id), currentWorld.well);
    passage.reset(player.state.position);
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
      const { flight } = game;
      const piloting = flight?.piloting ?? false;
      const frame = piloting ? flight?.frame : currentWorld.id;
      const position = piloting && flight ? flight.position : player.state.position;
      systemScene.toSystem(position, t, systemPosition);
      return systemLocator.locate(t, frame, systemPosition);
    },
    extraEvents: [...runtimes.values()].flatMap((r) =>
      triggersAsEvents(r.world.markers.triggers, r.id),
    ),
    player,
    skyDirection: arrivalSkyDirection(player),
    // Cada ciclo empieza en el mundo de llegada, a pie, con la nave esperando (y sin tensión de marea).
    onRestart: () => {
      game.flight?.reset();
      enterWorld(startWorld);
      tides.reset();
    },
  });
  const reading = new ReadingSession(clues, session.savedFacts, (facts) =>
    session.saveFacts(facts),
  );
  const { input, overlay, touch } = createControls(
    canvas,
    worldTitle(startWorld),
    session,
    () => {
      game.ui?.openRegistry();
    },
    {
      isPiloting: () => game.flight?.piloting ?? false,
      onShipAction: (action) => {
        shipAction(action);
      },
    },
  );
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

  const flight =
    spec && shipModel
      ? createShipFlight({
          spec,
          runtimes,
          model: shipModel,
          systemScene,
          player,
          homeWorld: SHIP_HOME,
          walkInto: enterWorld,
          setReadingEnabled: (enabled) => {
            ui.setEnabled(enabled);
          },
          touch: isTouchDevice(),
        })
      : undefined;
  game.flight = flight;
  const canAct = (): boolean => overlay.playing && session.acceptsInput && !ui.blocking;
  function shipAction(action: 'board' | 'target' | 'stabilize'): void {
    if (flight && canAct()) flight.action(action, currentWorld.id, session.director.clock.t);
  }
  input.onActionKey = shipAction;

  const debug = createDebugOverlay({
    where: () => ({
      world: currentWorld.id,
      home: currentWorld.well,
      wells: envOf(currentWorld.id).wells,
    }),
    player,
    renderer,
    loop: () => session.snapshot(),
    registry: () => ui.snapshot(),
    system: () => systemSnapshot(),
    ship: () => flight?.snapshot() ?? null,
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
  // El sonido se sintetiza (sin archivos) y arranca con el primer gesto del jugador.
  const soundtrack = createSoundtrack();
  if (window.__juego) {
    window.__juego.teleportTo = (clueId) => {
      if (flight?.piloting) return false;
      const owner = [...sources.values()].find((s) => s.interactables.some((i) => i.id === clueId));
      if (!owner) return false;
      if (owner.world !== currentWorld.id) enterWorld(owner.world);
      const placed = ui.teleportTo(clueId);
      passage.reset(player.state.position);
      return placed;
    };
    window.__juego.place = () => ({
      world: currentWorld.id,
      inside: insideCavity(player.state.position, currentWorld.well),
      crossings: passage.crossings,
    });
    window.__juego.warpTo = (world) => {
      if (flight?.piloting || !runtimes.has(world)) return false;
      enterWorld(world);
      return true;
    };
    window.__juego.shipTo = (world, altitude) => flight?.warpTo(world, altitude) ?? false;
    window.__juego.toShip = () => flight?.standAtHatch(currentWorld.id) ?? false;
    window.__juego.audio = () => soundtrack.snapshot();
    window.__juego.lens = () => lens.snapshot();
    window.__juego.tide = () => tides.snapshot();
    window.__juego.blackHole = () => blackHole.snapshot();
    window.__juego.skipTo = (seconds) => {
      session.director.skip(seconds - session.director.clock.t);
      return session.director.clock.t;
    };
  }

  // Lo que solo se ve durante un evento (EVT_): el haz de la ranura del Archivo…
  const eventProps = [...runtimes.values()].flatMap((r) => r.world.markers.eventProps);
  // …y las piezas que giran (ANIM_): los brazos del Taller, siempre; la maqueta, solo en su evento.
  const animated = [...runtimes.values()].flatMap((r) => r.world.markers.animated);
  /** La luz ambiente es la del mundo donde estás (o la general en el espacio abierto). */
  let litWorld: string | null = null;
  function lightFor(world: string | undefined): void {
    if ((world ?? '') === litWorld) return;
    litWorld = world ?? '';
    const own = world ? runtimes.get(world)?.world.info.ambient : undefined;
    ambient.color.setHex(own?.color ?? AMBIENT_COLOR);
    ambient.intensity = own?.intensity ?? AMBIENT_INTENSITY;
  }
  let shipDeath: DeathCause | undefined;
  const physics = createFixedStep(
    { stepSeconds: PHYSICS_STEP, maxStepsPerFrame: MAX_PHYSICS_STEPS_PER_FRAME },
    (dt) => {
      const moving = overlay.playing && session.acceptsInput && !ui.blocking;
      if (flight?.piloting) {
        if (moving) shipDeath ??= flight.step(session.director.clock.t, input.flightKeys(), dt);
        else flight.hold();
      } else {
        player.step(moving ? tides.slow(input.intent()) : IDLE_INTENT, dt);
      }
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
        if (flight?.piloting) flight.addLook(look.x, look.y);
        else player.look(-look.x * MOUSE_LOOK_SENSITIVITY, -look.y * MOUSE_LOOK_SENSITIVITY);
      }
      session.update(dt, timeRuns, shipDeath ?? tideDeath);
      if (timeRuns) shipDeath = tideDeath = undefined; // si el ciclo no corrió, la muerte espera
      for (const prop of eventProps) {
        prop.object.visible = session.activeEventIds.includes(prop.event);
      }
      if (timeRuns) {
        for (const part of animated) {
          if (!part.event || session.activeEventIds.includes(part.event)) {
            part.object.rotateY(part.spin * dt);
          }
        }
      }
      // En pausa la física sigue (jugador quieto, se asienta en el suelo); el ciclo sí se detiene.
      const alpha = physics.advance(dt);
      const piloting = flight?.piloting ?? false;
      if (!piloting && canAct()) passage.update(currentWorld, player);
      interior.update(
        currentWorld.id,
        !piloting && insideCavity(player.state.position, currentWorld.well),
      );
      const tideLethal = tides.update(
        {
          world: piloting ? (flight?.frame ? runtimes.get(flight.frame) : undefined) : currentWorld,
          position: piloting && flight ? flight.position : player.state.position,
          loopTime: session.director.clock.t,
          running: timeRuns && session.acceptsInput,
          piloting,
        },
        dt,
      );
      if (tideLethal && session.acceptsInput) tideDeath = 'marea';
      if (flight?.piloting) {
        flight.view(alpha, camera);
      } else {
        player.interpolatedFeet(alpha, feet);
        player.interpolatedBody(alpha, body);
        cameraPose(body, player.pitch, feet, camera.position, camera.quaternion);
      }
      camera.position.add(session.shake);
      const t = session.director.clock.t;
      systemScene.update(t);
      lightFor(systemScene.referenceWorld);
      blackHole.update(t, camera, timeRuns ? dt : 0);
      lens.update({
        camera: camera.position,
        nudo: hiddenWorld ? systemScene.groupOf(hiddenWorld) : undefined,
        brasa: sun.position,
        aligned: session.activeEventIds.includes(ALIGNMENT_EVENT),
        inObservatory: systemScene.referenceWorld === OBSERVATORY,
        time: performance.now() / 1000,
        hole: blackHole.lens(),
      });
      soundtrack.update({
        worldId: spec ? systemScene.referenceWorld : currentWorld.id,
        rate: session.director.rate,
        events: session.activeEventIds,
        absorption: session.director.absorption,
        phase: session.director.phase,
        fade: session.director.fade.amount,
        running: timeRuns,
        piloting: flight?.piloting ?? false,
        recording: ui.listening,
      });
      camera.updateMatrixWorld();
      flight?.update({ t, alpha, dt, camera, onFootWorld: currentWorld.id, active: canAct() });
      ui.update(performance.now() / 1000);
      sight.update();
      touch?.update();
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
