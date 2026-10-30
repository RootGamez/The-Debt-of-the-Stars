// Arranque del juego: mundos → sistema → nave → jugador → controles → ciclo → bucle de render.
// Cada pieza vive en su módulo; aquí solo se conectan.
import './style.css';
import { Quaternion, Timer, Vector3, type PerspectiveCamera, type WebGLRenderer } from 'three';
import { loadChronology } from './core/chronology';
import { createSoundtrack } from './audio/soundtrack';
import { createCounterweightRig } from './game/counterweightRig';
import { createFoldedPassage } from './game/foldedPassage';
import { createTideEffects } from './game/tideEffects';
import { insideCavity } from './physics/gravity';
import { createInteriorLights } from './render/interiorLight';
import { createLensView } from './render/lensView';
import { createAtmosphereView } from './render/atmosphereView';
import { createOolView } from './render/oolView';
import { createFilaments } from './ui/filaments';
import { ATMOSPHERES } from './data/atmospheres';
import { createBlackHoleView } from './render/blackHoleView';
import { growthFor } from './system/blackHole';
import { BLACK_HOLE } from './data/blackHole';
import { qualityFromQuery } from './core/quality';
import { createSightScale } from './ui/sightScale';
import { createFixedStep } from './core/fixedStep';
import { IDLE_INTENT } from './core/inputController';
import type { DeathCause } from './core/loopDirector';
import { createLoopSession } from './core/loopSession';
import { browserStore, loadSave } from './core/save';
import { createPrologueGate, WORMHOLE } from './game/prologue';
import { Guide } from './game/guide';
import { wormholeCenter } from './game/wormhole';
import { createGuideView } from './ui/guideView';
import { createWormholeView } from './render/wormholeView';
import { Player } from './core/player';
import { absorptionWindow, quietChronology, triggersAsEvents } from './core/timeline';
import { createAbsorptionView } from './render/absorptionView';
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
import { createStarfield, dimStars } from './render/sky';
import { finalApproach, finalLight } from './system/absorption';
import { AMBIENT_COLOR, AMBIENT_INTENSITY, createStage } from './render/stage';
import { createSystemScene } from './render/systemScene';
import { loadShipModel } from './ship/loadShip';
import { createLocator, createStandaloneLocator, type WorldBody } from './system/locator';
import { bodyPose } from './system/orbits';
import { createDebugOverlay, type SystemSnapshot } from './ui/debugOverlay';
import { createOrbitMap } from './ui/orbitMap';
import { isTouchDevice } from './ui/pauseOverlay';
import {
  createArrivalLayer,
  endArrivingPaint,
  markCrossing,
  sessionStore,
  takeCrossing,
} from './ui/arrival';
import type { WorldRuntime } from './worlds/worldRuntime';
import { arrivalHref, startWorld as firstWorld, worldTitle } from './worlds/worldSelection';

const NEAR_PLANE = 0.05;
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
  // Si se viene del gusano, la pantalla sigue en blanco hasta que esté el mundo.
  const arrival = takeCrossing(sessionStore()) ? createArrivalLayer() : undefined;
  const { renderer, scene, camera, sun, ambient } = createStage(canvas);
  setupCamera(camera);
  watchGraphicsContext(canvas, status);

  // Una partida nueva empieza en casa (el prólogo); tras cruzar el gusano, en Umbral. `?mundo=` manda.
  const saved = loadSave(browserStore());
  if (saved.warning) console.warn(saved.warning);
  // Una partida de una versión más nueva (que no se toca) ya pasó por casa: se empieza en Umbral.
  const { spec, startWorld, runtimes } = await loadSystem(
    firstWorld(window.location.search, saved.data.prologueDone || saved.readOnly),
  );
  // La nave espera donde diga su sistema: junto a La Boca o en el hangar del Instituto.
  const shipHome = spec?.ship !== undefined && runtimes.has(spec.ship) ? spec.ship : undefined;
  const shipModel = shipHome ? await loadShipModel() : undefined;
  // En casa no corre el ciclo: ni eventos, ni absorciones, ni reloj doble.
  const looping = spec?.looping ?? true;
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
  // El cielo de los mundos con aire (Hogar): tapa las estrellas en el suelo y se apaga al subir.
  const atmosphere = createAtmosphereView(scene);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Los Ool (en casa): respiran, sus filamentos laten y se giran hacia ti. Y los tuyos brillan al leer.
  const ool = createOolView(
    [...runtimes.values()].flatMap((r) => r.world.markers.characters),
    reducedMotion,
  );
  const filaments = createFilaments();
  // El agujero negro: nace a las 13:30 en la Sala del Motor de Cicatriz y viaja con ella.
  const chronology = looping ? loadChronology(window.location.search) : quietChronology();
  // A pie, la nave posada es un obstáculo más del mundo donde está; `ui` llega después (avisos del Contrapeso).
  const game: { ui?: ReadingUi; flight?: ShipFlight } = {};
  // El Contrapeso espera en su Banco del Laboratorio; se coge, se lleva (su reloj va al tablero) y se instala en
  // la Sala del Motor de Cicatriz, en el núcleo de la máquina, donde nace el agujero negro.
  const counterweight = await createCounterweightRig({
    scene,
    runtimes,
    chronology,
    notify: (message) => {
      game.ui?.notify(message);
    },
  });
  const birthplace =
    counterweight?.core ??
    sources.get(BLACK_HOLE.world)?.interactables.find((i) => i.id === BLACK_HOLE.source)?.position;
  const blackHole = createBlackHoleView(
    systemScene.groupOf(BLACK_HOLE.world),
    birthplace,
    growthFor(chronology),
  );
  // La mira graduada (G): solo mide ángulos; con ella se corrige la imagen sin calcular nada.
  const sight = createSightScale(camera, canvas);
  // Las mareas: junto al Borde de Cicatriz, subiendo hacia la semilla del Nudo y sobre su cáscara, y la del
  // agujero en el mundo que se traga (en el palco no mata: desde ahí se ve el final).
  const edge = sources.get(EDGE_WORLD)?.interactables.find((i) => i.id === EDGE_SOURCE);
  const tides = createTideEffects(camera, {
    edge: edge ? { world: EDGE_WORLD, position: edge.position } : undefined,
    palco: BLACK_HOLE.palco,
  });
  let tideDeath: DeathCause | undefined;
  const hiddenWorld = spec?.bodies.find((body) => body.hidden)?.world;

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

  // Cada mundo, en su ventana, se estira hacia el agujero, suelta trozos y cae (solo lo que se ve).
  const absorption = spec
    ? createAbsorptionView(
        scene,
        [...runtimes.values()].map((r) => ({
          id: r.id,
          model: r.world.scene,
          radius: r.world.info.radius,
          window: absorptionWindow(chronology, r.id),
        })),
      )
    : undefined;
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
    looping,
    saved,
    // Cruzado el gusano, el sistema ajeno se carga de nuevo con la página, detrás del fundido a blanco.
    onCross: (wasSaved) => {
      // Sin dejar atrás en el historial la pantalla en blanco.
      markCrossing(sessionStore());
      window.location.replace(arrivalHref(window.location.href, wasSaved));
    },
    skyDirection: arrivalSkyDirection(player),
    counterweightClock: () => counterweight?.play.clock,
    // Cada ciclo empieza en el mundo de llegada, a pie, con la nave esperando (y sin tensión de marea).
    onRestart: () => {
      game.flight?.reset();
      enterWorld(startWorld);
      tides.reset();
      counterweight?.play.reset();
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
    actions: counterweight?.play.actions,
    readers: counterweight?.readers,
  });
  game.ui = ui;

  const flight =
    spec && shipModel && shipHome
      ? createShipFlight({
          spec,
          runtimes,
          model: shipModel,
          systemScene,
          player,
          homeWorld: shipHome,
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
    window.__juego.sky = () => ({ density: atmosphere.density });
    window.__juego.ool = () => ({ turns: ool.snapshot(), filaments: filaments.snapshot() });
    window.__juego.wormhole = () => ({
      active: wormholeView?.active ?? false,
      progress: wormholeView?.progress ?? 0,
    });
    window.__juego.guide = () => ({
      shown: guideView?.shown ?? null,
      done: [...(guide?.done ?? [])],
    });
    window.__juego.absorption = () => absorption?.snapshot() ?? null;
    window.__juego.counterweight = () => counterweight?.play.snapshot() ?? null;
    window.__juego.aimAt = (target) => {
      const where =
        target === 'agujero'
          ? blackHole.lens()?.position.clone()
          : systemScene.groupOf(target)?.getWorldPosition(new Vector3());
      if (!where || flight?.piloting) return false;
      // La dirección en el marco del cuerpo: el giro va sobre su vertical y el cabeceo, aparte.
      const local = where
        .sub(camera.position)
        .normalize()
        .applyQuaternion(player.state.body.clone().invert());
      const level = Math.hypot(local.x, local.z);
      player.look(Math.atan2(-local.x, -local.z), Math.atan2(local.y, level) - player.pitch);
      return true;
    };
    window.__juego.skipTo = (seconds) => {
      session.director.skip(seconds - session.director.clock.t);
      return session.director.clock.t;
    };
  }

  // Lo que solo se ve durante un evento (EVT_): el haz de la ranura del Archivo…
  const eventProps = [...runtimes.values()].flatMap((r) => r.world.markers.eventProps);
  // …y las piezas que giran (ANIM_): los brazos del Taller, siempre; la maqueta, solo en su evento.
  const animated = [...runtimes.values()].flatMap((r) =>
    r.world.markers.animated.map((part) => ({ part, world: r.id })),
  );
  /**
   * La luz ambiente es la del mundo donde estás (o la general en el espacio abierto); `light` es lo que queda
   * de ella y de las estrellas al final, cuando caes con tu mundo (1 = toda).
   */
  let litWorld: string | null = null;
  let ambientIntensity = AMBIENT_INTENSITY;
  function lightFor(world: string | undefined, light: number): void {
    if ((world ?? '') !== litWorld) {
      litWorld = world ?? '';
      const own = world ? runtimes.get(world)?.world.info.ambient : undefined;
      ambient.color.setHex(own?.color ?? AMBIENT_COLOR);
      ambientIntensity = own?.intensity ?? AMBIENT_INTENSITY;
    }
    ambient.intensity = ambientIntensity * light;
    dimStars(sky, light);
  }
  let shipDeath: DeathCause | undefined;
  // El final del prólogo: el gusano junto al fragmento de la Luna (solo en casa).
  const prologue = looping ? undefined : createPrologueGate();
  // La guía del prólogo: un aviso cada vez, hasta que se hace lo que pide.
  const guide = looping ? undefined : new Guide();
  const guideView = guide ? createGuideView(isTouchDevice()) : undefined;
  const guideFeet = new Vector3();
  const moonCenter = new Vector3();
  let walked = 0;
  let registryOpened = false;
  // El gusano junto al fragmento de la Luna: se abre, y al terminar llega el fundido a blanco de la Cámara.
  const wormholeView = looping ? undefined : createWormholeView();
  let crossingAsked = false;
  function openWormhole(): void {
    const fragment = sources
      .get(WORMHOLE.world)
      ?.interactables.find((i) => i.id === WORMHOLE.source);
    const moon = systemScene.groupOf(WORMHOLE.world);
    if (!wormholeView || !fragment || !moon) {
      wormhole = 'gusano'; // sin la escena, directamente al fundido
      return;
    }
    // Sobre el fragmento y un poco más allá, visto desde ti; cuelga de la Luna (su centro es su origen).
    moon.updateWorldMatrix(true, false);
    const eye = moon.worldToLocal(camera.position.clone());
    wormholeView.start(moon, wormholeCenter(fragment.position, new Vector3(), eye));
  }
  let wormhole: DeathCause | undefined;
  const physics = createFixedStep(
    { stepSeconds: PHYSICS_STEP, maxStepsPerFrame: MAX_PHYSICS_STEPS_PER_FRAME },
    (dt) => {
      const moving = overlay.playing && session.acceptsInput && !ui.blocking;
      if (flight?.piloting) {
        if (moving) shipDeath ??= flight.step(session.director.clock.t, input.flightKeys(), dt);
        else flight.hold();
      } else {
        const intent = tides.slow(input.intent());
        player.step(moving ? (counterweight?.play.limit(intent) ?? intent) : IDLE_INTENT, dt);
      }
    },
  );
  status.textContent = '';
  arrival?.clear();

  const feet = new Vector3();
  const airCenter = new Vector3();
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
      const opened = prologue?.update(
        {
          world: currentWorld.id,
          onFoot: !(flight?.piloting ?? false),
          running: timeRuns && session.acceptsInput,
          knowsFragment: reading.known.has(WORMHOLE.fact),
        },
        dt,
      );
      if (opened) openWormhole();
      if (wormholeView?.active) {
        wormholeView.update(timeRuns ? dt : 0, camera.position);
        if (wormholeView.progress >= 1 && !crossingAsked) {
          crossingAsked = true;
          wormhole = 'gusano';
        }
      }
      session.update(dt, timeRuns, wormhole ?? shipDeath ?? tideDeath);
      if (timeRuns) wormhole = shipDeath = tideDeath = undefined; // si el ciclo no corrió, espera
      for (const prop of eventProps) {
        prop.object.visible = session.activeEventIds.includes(prop.event);
      }
      if (timeRuns) {
        // Un mundo que el agujero se está tragando se ve casi quieto desde fuera.
        for (const { part, world } of animated) {
          if (!part.event || session.activeEventIds.includes(part.event)) {
            part.object.rotateY(part.spin * dt * (absorption?.rateOf(world) ?? 1));
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
          absorption: session.director.absorption,
          running: timeRuns && session.acceptsInput,
          piloting,
        },
        dt,
      );
      if (tideLethal && session.acceptsInput) tideDeath = 'marea';
      // Al abrirse el gusano la vista se estira (después de la marea, que fija la de cada fotograma).
      if (wormholeView && wormholeView.stretch > 0 && !reducedMotion) {
        camera.fov *= 1 + wormholeView.stretch;
        camera.updateProjectionMatrix();
      }
      if (flight?.piloting) {
        flight.view(alpha, camera);
      } else {
        player.interpolatedFeet(alpha, feet);
        player.interpolatedBody(alpha, body);
        cameraPose(body, player.pitch, feet, camera.position, camera.quaternion);
      }
      camera.position.add(session.shake);
      const t = session.director.clock.t;
      // Al final de la ventana de tu mundo caes con él: el agujero se acerca y la luz se apaga.
      const fallen = session.director.absorption;
      systemScene.update(t);
      lightFor(systemScene.referenceWorld, finalLight(fallen));
      const airWorld = systemScene.referenceWorld;
      const air = airWorld === undefined ? undefined : ATMOSPHERES[airWorld];
      const airGroup = airWorld === undefined ? undefined : systemScene.groupOf(airWorld);
      const airRadius =
        airWorld === undefined ? undefined : runtimes.get(airWorld)?.world.info.radius;
      atmosphere.update({
        eye: camera.position,
        world:
          air && airGroup && airRadius !== undefined
            ? { center: airGroup.getWorldPosition(airCenter), radius: airRadius, air }
            : undefined,
        star: sun.position,
      });
      // Con el Contrapeso instalado nace igual, pero no crece ni se traga nada.
      const { stable } = session.director;
      blackHole.update(t, camera, timeRuns ? dt : 0, finalApproach(fallen), stable);
      const hole = blackHole.lens();
      absorption?.update({
        t,
        hole: stable ? undefined : hole,
        reference: systemScene.referenceWorld,
        viewer: camera.position,
        dt: timeRuns ? dt : 0,
      });
      lens.update({
        camera: camera.position,
        nudo: hiddenWorld ? systemScene.groupOf(hiddenWorld) : undefined,
        brasa: sun.position,
        aligned: session.activeEventIds.includes(ALIGNMENT_EVENT),
        inObservatory: systemScene.referenceWorld === OBSERVATORY,
        time: performance.now() / 1000,
        hole: hole ?? wormholeView?.lens(),
      });
      soundtrack.update({
        worldId: spec ? systemScene.referenceWorld : currentWorld.id,
        rate: session.director.rate,
        events: wormholeView?.active
          ? [...session.activeEventIds, 'gusano']
          : session.activeEventIds,
        absorption: fallen,
        hole: blackHole.fill,
        phase: session.director.phase,
        fade: session.director.fade.amount,
        running: timeRuns,
        piloting: flight?.piloting ?? false,
        recording: ui.listening,
      });
      camera.updateMatrixWorld();
      counterweight?.update(
        camera,
        { t, carrierRate: session.director.rate, piloting },
        timeRuns ? dt : 0,
      );
      if (counterweight?.play.place === 'installed' && !stable) session.director.stabilize();
      flight?.update({ t, alpha, dt, camera, onFootWorld: currentWorld.id, active: canAct() });
      ui.update(performance.now() / 1000);
      ool.update(performance.now() / 1000, dt, piloting ? undefined : camera.position);
      filaments.update(reading.current !== null, reading.known.size);
      if (guide && guideView) {
        // Lo andado (a pie y sin saltos grandes, que serían teletransportes de depuración).
        if (!piloting) {
          const step = guideFeet.distanceTo(player.state.position);
          if (step < 1) walked += step;
          guideFeet.copy(player.state.position);
        }
        if (ui.blocking && reading.current === null) registryOpened = true;
        const moon = systemScene.groupOf(WORMHOLE.world);
        const moonRadius = runtimes.get(WORMHOLE.world)?.world.info.radius;
        guideView.update(
          guide.current({
            walked,
            hasMission: reading.known.has('casa.mision_luna'),
            knowsSomething: reading.known.size > 0,
            registryOpened,
            piloting,
            targetingMoon: flight?.snapshot().target === WORMHOLE.world,
            moonDistance:
              moon && moonRadius !== undefined
                ? moon.getWorldPosition(moonCenter).distanceTo(camera.position) - moonRadius
                : undefined,
            onMoon: !piloting && currentWorld.id === WORMHOLE.world,
            sawFragment: reading.known.has(WORMHOLE.fact),
          }),
          overlay.playing && !ui.blocking,
        );
      }
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
  // Que se lea el aviso, sin el blanco del gusano.
  endArrivingPaint();
  document.querySelector('.llegada')?.remove();
  const status = document.getElementById('status');
  if (status) status.textContent = 'No se pudo cargar el mundo. Revisa la consola.';
});
