// Arranque del juego: mundos → sistema → nave → jugador → controles → ciclo → bucle de render.
// Cada pieza vive en su módulo; aquí solo se conectan.
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/latin-700.css';
import './style.css';
import './ui/theme.css';
import './ui/touch/touch.css';
import {
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Timer,
  Vector3,
  type PerspectiveCamera,
  type WebGLRenderer,
} from 'three';
import { loadChronology } from './core/chronology';
import { carrySoundOf } from './audio/carrySounds';
import { deathSoundOf } from './audio/deathSounds';
import { createEdgeTracker } from './audio/edges';
import { createLooseCarry, type LooseAim, type LooseCarrier } from './game/looseCarry';
import type { SourceActions } from './reading/readingUi';
import { createLoopFollower } from './audio/loopFollower';
import { createMusicDirector } from './audio/musicDirector';
import { createFoley, soundOf, surfaceOf } from './audio/foley';
import { createShipSound } from './audio/shipSound';
import { createSoundtrack, type Soundtrack } from './audio/soundtrack';
import { nextFrame } from './core/nextFrame';
import { warmUpShaders } from './render/warmUp';
import { createLoadingScreen, type LoadingScreen } from './ui/loadingScreen';
import { createVolumeSettings } from './audio/volumePreferences';
import { machineTime } from './game/counterweight';
import { createArchivoRig } from './game/archivoRig';
import { SKY_MOUTH, crossesMouth, createSkyMouth, skyMouthCenter } from './game/skyMouth';
import { endingFor, mouthById } from './game/epilogue';
import { createSkyMouthView } from './render/skyMouthView';
import { createBenchRig } from './game/benchRig';
import { DEPTHS } from './game/depthsPlay';
import { createDepthsRig } from './game/depthsRig';
import { createBellsRig } from './game/bellsRig';
import { createCounterweightRig } from './game/counterweightRig';
import { composeActions } from './reading/composeActions';
import type { Ending } from './game/epilogue';
import { createEpilogueRig } from './game/epilogueRig';
import { aimToward } from './game/aim';
import { followCrossing, replay, toArchive } from './game/crossings';
import { endingFromQuery, homeLook } from './game/homecoming';
import { createHomecomingRig } from './game/homecomingRig';
import { createFoldedPassage } from './game/foldedPassage';
import { createDiving } from './game/diving';
import { createTrackClock, TELEPORTER, teleporterOpen } from './game/teleporter';
import { createWaterPlay } from './game/waterPlay';
import { createWaterEffects } from './render/waterEffects';
import { createTideEffects } from './game/tideEffects';
import { insideCavity } from './physics/gravity';
import { lookAlong } from './physics/surfaceFrame';
import { createInteriorLights } from './render/interiorLight';
import { createNearDetail } from './render/nearDetail';
import { createLensView } from './render/lensView';
import { createAtmosphereView } from './render/atmosphereView';
import { createOolView } from './render/oolView';
import { createFilaments } from './ui/filaments';
import { trackClockBody } from './ui/trackClockBody';
import { createOcularSource } from './game/ocularSky';
import { ocularBody } from './ui/ocularBody';
import { ATMOSPHERES } from './data/atmospheres';
import { createBlackHoleView } from './render/blackHoleView';
import { growthFor } from './system/blackHole';
import { BLACK_HOLE } from './data/blackHole';
import { isSoftwareRenderer, qualityFromQuery, sunShadowSizeFromQuery } from './core/quality';
import { createSightScale } from './ui/sightScale';
import { createFixedStep } from './core/fixedStep';
import { IDLE_INTENT } from './core/inputController';
import type { DeathCause } from './core/loopDirector';
import { createLoopSession } from './core/loopSession';
import {
  browserStore,
  clearSave,
  loadSave,
  markEndingSeen,
  markTasksDone,
  type SaveData,
} from './core/save';
import { createMainMenu, type MainMenu } from './menu/mainMenu';
import { createPrologueGate, WORMHOLE } from './game/prologue';
import { isLoopTask, TaskTracker } from './game/tasks';
import { createTaskRig } from './game/taskRig';
import { cinematicCenter, cinematicShipPosition } from './game/wormholeCinematic';
import { awakeningPose } from './game/awakening';
import { spawnOnGround } from './physics/spawn';
import { createWarpDistortion } from './ui/warpDistortion';
import { gateSplit, gateStretch } from './game/gateWormhole';
import { createGateWormholes, type GateWormholeSample } from './render/gateWormholeView';
import { createWormholeView } from './render/wormholeView';
import { castShadowsFrom, createSunShadow } from './render/sunShadow';
import { renderWithWormholes } from './render/wormholeSphere';
import { Player } from './core/player';
import { absorptionWindow, quietChronology, triggersAsEvents } from './core/timeline';
import { createAbsorptionView } from './render/absorptionView';
import {
  EYE_HEIGHT,
  FIELD_OF_VIEW,
  MAX_PHYSICS_STEPS_PER_FRAME,
  MOUSE_LOOK_SENSITIVITY,
  PHYSICS_STEP,
} from './data/movement';
import { loadClues } from './data/pistas';
import { createControls, ON_FOOT } from './game/controls';
import { loadSystemStepwise } from './game/loadSystem';
import { approachPoint, createHorizon } from './game/horizon';
import { createShipFlight, type ShipAction, type ShipFlight } from './game/shipFlight';
import type { MotorEnvironment } from './physics/characterMotor';
import { withEventColliders } from './physics/eventColliders';
import { sunkInGas } from './physics/gas';
import { withMovingCollider } from './physics/movingCollider';
import { forwardOf, upOf } from './physics/surfaceFrame';
import { ReadingSession } from './reading/readingSession';
import { createReadingUi, type ReadingUi } from './reading/readingUi';
import { createWorldSources, type WorldSources } from './reading/worldSources';
import { cameraPose, chasePose } from './render/firstPersonCamera';
import { createExplorerView } from './render/explorerView';
import { THIRD_PERSON_DISTANCE, easeDistance, thirdPersonPose } from './render/thirdPersonCamera';
import { createBodyLightSwitch } from './game/bodyLightSwitch';
import { createHelmetRim } from './ui/helmetRim';
import { createStarfield, dimStars } from './render/sky';
import { finalApproach, finalLight } from './system/absorption';
import { AMBIENT_COLOR, AMBIENT_INTENSITY, createStage } from './render/stage';
import { createSystemScene } from './render/systemScene';
import { buildAlbatros } from './ship/model/albatros';
import { createShipMap } from './ui/shipMap';
import { createLocator, createStandaloneLocator, type WorldBody } from './system/locator';
import { bodyPose } from './system/orbits';
import { createDebugOverlay, type SystemSnapshot } from './ui/debugOverlay';
import { createOrbitMap } from './ui/orbitMap';
import { isTouchDevice } from './ui/pauseOverlay';
import { installLandscapeLock } from './ui/touch/orientationLock';
import { createRotateGuard } from './ui/touch/rotateGuard';
import { installTouchGuards } from './ui/touch/touchGuards';
import { createArrivalLayer, endArrivingPaint, sessionStore, takeCrossing } from './ui/arrival';
import { lockGameKeys } from './ui/endingCard';
import { createPlaceCard } from './ui/placeCard';
import { createWorldDiscovery } from './ui/worldDiscovery';
import type { Gate } from './worlds/gates';
import { createTextSettings } from './typewriter/textPreferences';
import { createAccessibilitySettings } from './accessibility/preferences';
import { getLanguage, saveLanguage, t, type Language } from './i18n';
import { voicePitch } from './typewriter/speech';
import {
  isNewWorld,
  officialName,
  withDiscovery,
  worldAbout,
  worldWhere,
  type WorldNames,
} from './worlds/worldLog';
import type { WorldRuntime } from './worlds/worldRuntime';
import { startWorld as firstWorld, worldTitle } from './worlds/worldSelection';

/** La primera llegada al sistema ajeno: dónde se despierta y la nota que escribe al levantarse. */
const FIRST_ARRIVAL = {
  world: 'umbral',
  spawn: 'SPAWN_Despertar',
  note: 'umbral.llegada',
} as const;

const NEAR_PLANE = 0.05;
/** Lo que «pesa» para la lente del cielo una Puerta plegada pegada a ella (m): las estrellas se doblan a su alrededor. */
const GATE_LENS_RADIUS = 14;
/** A qué altura sobre Hogar se aparece, en la nave, tras cruzar una boca de casa (m). */
const HOME_ARRIVAL_ALTITUDE = 300;
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
    status.textContent = t('Se perdió el contexto gráfico; intentando recuperarlo…');
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

/** El idioma y la accesibilidad se fijan antes de dibujar nada: todo texto nace ya traducido y a su tamaño. */
function setUpDisplay() {
  const store = browserStore();
  const language = getLanguage(); // ya decidido al cargar src/i18n
  document.documentElement.lang = language;
  const accessibility = createAccessibilitySettings(store, document.documentElement.style, {
    touch: isTouchDevice(),
    height: Math.min(window.innerWidth, window.innerHeight),
  });
  const chooseLanguage = (next: Language): void => {
    if (next === language) return;
    saveLanguage(store, next);
    window.location.reload(); // el progreso ya está guardado; el texto se dibuja de nuevo en el idioma elegido
  };
  // Los volúmenes llegan al motor de sonido en cuanto existe (soundtrackRef se rellena al crearlo).
  const volumes = createVolumeSettings(store, (current) => {
    soundtrackRef?.setVolumes(current);
  });
  return { language, accessibility, chooseLanguage, volumes };
}

/** El sonido en marcha, para que Configuración le pase los volúmenes. */
let soundtrackRef: Soundtrack | undefined;

/** El menú principal está a la vista mientras carga el juego (para mostrar el fallo si lo hay). */
let activeMenu: MainMenu | undefined;

/** La pantalla de carga, mientras está puesta (para decir ahí si el juego no pudo cargarse). */
let activeLoading: LoadingScreen | undefined;

/** Con el menú detrás, la pantalla de carga se ve al menos esto (ms): sus fotos no deben ser un parpadeo. */
const LOADING_MIN_MS = 3500;
/** Cada cuánto se da al audio la mezcla de la carga (ms): sin mundo aún, solo la música. */
const LOADING_SOUND_MS = 100;
/** Sin menú, el tema principal se apaga al quitar la pantalla de carga (s) y luego manda el director. */
const LOADING_MUSIC_FADE = 3;

/** Sin menú al saltar a un mundo (pruebas, `?debug`), al volver de un final ni al cruzar el gusano. */
function wantsMenu(): boolean {
  const query = new URLSearchParams(window.location.search);
  if (['debug', 'mundo', 'final'].some((key) => query.has(key))) return false;
  try {
    return window.sessionStorage.getItem('bucle-tiempo:gusano') === null;
  } catch {
    return true;
  }
}

const hasProgress = (data: Readonly<SaveData>): boolean =>
  data.loopsCompleted > 0 || data.prologueDone || data.facts.length > 0;

/** Hasta dónde llega la mirada al buscar dónde dejar algo (m); más allá no se deja. */
const LOOSE_AIM_REACH = 3.5;

async function start(): Promise<void> {
  const display = setUpDisplay();
  if (isTouchDevice()) {
    // Mantener pulsado no selecciona ni abre menús; el pellizco de iOS solo se bloquea sobre el juego y sus botones.
    installTouchGuards(document, {
      blocksGesture: (target) =>
        target instanceof Element && (target.id === 'game' || target.closest('.touch') !== null),
    });
    // Solo se juega en horizontal: se pide el bloqueo de pantalla (ayuda) y, en vertical, «Gira el teléfono» cubre todo.
    installLandscapeLock(document, window.screen);
  }
  const rotateGuard = createRotateGuard({ touch: isTouchDevice() });
  if (wantsMenu()) {
    activeMenu = createMainMenu({
      hasProgress: hasProgress(loadSave(browserStore()).data),
      display,
      onNewGame: () => {
        clearSave(browserStore());
        window.location.reload();
      },
    });
  }
  document.getElementById('game')?.setAttribute('aria-label', t('Vista del juego'));
  document.title = t('La deuda de las estrellas');
  const canvas = requireElement('game', HTMLCanvasElement);
  const status = requireElement('status', HTMLParagraphElement);
  status.textContent = '';
  // Si se viene del gusano, la pantalla sigue en blanco hasta que esté el mundo.
  const arrivedBy = takeCrossing(sessionStore());
  const arrival = arrivedBy ? createArrivalLayer(arrivedBy) : undefined;
  // El sonido arranca ya: el tema principal acompaña la carga y el menú (suena tras el primer gesto, que la
  // pantalla de carga invita a hacer) y se apaga al pulsar Jugar. Llegando por el gusano no hay pantalla ni tema.
  const soundtrack = createSoundtrack();
  soundtrackRef = soundtrack;
  soundtrack.setVolumes(display.volumes.current);
  if (!arrivedBy) soundtrack.playMusic('music.main', { fade: 4 });
  const loading = createLoadingScreen({
    minDisplayMs: activeMenu ? LOADING_MIN_MS : 0,
    passthrough: !activeMenu,
    audioRunning: () => soundtrack.snapshot().running,
  });
  activeLoading = loading;
  const loadingSound = window.setInterval(() => {
    soundtrack.updateLoading();
  }, LOADING_SOUND_MS);
  const { renderer, scene, camera, sun, ambient } = createStage(canvas);
  setupCamera(camera);
  watchGraphicsContext(canvas, status);

  // Una partida nueva empieza en casa (el prólogo); tras cruzar el gusano, en Umbral. `?mundo=` manda.
  const saved = loadSave(browserStore());
  if (saved.warning) console.warn(saved.warning);
  // La velocidad del texto y el sonido de letras (Configuración, en la pausa); y, con `?calidad=baja`, sin brillos.
  const textSettings = createTextSettings(browserStore());
  const quality = qualityFromQuery(window.location.search);
  document.documentElement.classList.toggle('calidad-baja', quality === 'baja');
  // Saltar a un mundo con `?mundo=` es para probar: no sale la carta de mundo nuevo al llegar.
  const exploring = !new URLSearchParams(window.location.search).has('mundo');
  // De vuelta a casa por una boca del Archivo (`?final=`): con A y B, el Hogar de antes, sin lo que aún no ha llegado.
  const homecomingEnding = endingFromQuery(window.location.search);
  const home = homecomingEnding ? homeLook(homecomingEnding) : undefined;
  // Una partida de una versión más nueva (que no se toca) ya pasó por casa: se empieza en Umbral.
  // Todos los mundos del sistema se construyen ahora, uno a uno y con la barra de carga avanzando: así no hay
  // tirones al llegar a ellos.
  const { spec, startWorld, runtimes } = await loadSystemStepwise(
    firstWorld(window.location.search, saved.data.prologueDone || saved.readOnly),
    home?.without,
    {
      onWorld: (built, total) => {
        loading.show({ kind: 'worlds', built, total });
      },
      pause: nextFrame,
    },
  );
  // La nave espera donde diga su sistema: junto a La Boca o en el hangar del Instituto.
  const shipHome = spec?.ship !== undefined && runtimes.has(spec.ship) ? spec.ship : undefined;
  const shipModel = shipHome ? buildAlbatros() : undefined;
  // En casa no corre el ciclo: ni eventos, ni absorciones, ni reloj doble.
  const looping = spec?.looping ?? true;
  const clues = loadClues();
  // Las fuentes salen de las marcas del modelo: se crean antes de colgar los mundos de la escena.
  const sources = new Map<string, WorldSources>(
    [...runtimes].map(([id, runtime]) => [id, createWorldSources(runtime, clues)]),
  );
  const sky = createStarfield(spec?.star.kind);
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
  const nearDetail = createNearDetail(runtimes);
  const passage = createFoldedPassage();
  // …y por fuera: su imagen en el cielo, girada hacia la Brasa, y las estrellas que dobla a su paso.
  // (el agujero negro dobla también las estrellas; con `?calidad=baja` no se dobla nada).
  const lens = createLensView(scene, sky, quality === 'alta');
  // El cielo de los mundos con aire (Hogar): tapa las estrellas en el suelo y se apaga al subir.
  const atmosphere = createAtmosphereView(scene);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Los Ool (en casa): respiran, sus filamentos laten y se giran hacia ti. Y los tuyos brillan al leer.
  const characters = [...runtimes.values()].flatMap((r) => r.world.markers.characters);
  for (const { object } of characters) object.scale.multiplyScalar(home?.oolScale ?? 1);
  const ool = createOolView(characters, reducedMotion);
  const filaments = createFilaments();
  // Tú: el explorador (un Ool con su traje), que anda con el jugador; al mirar abajo se ve su cuerpo.
  const childrenBeforeExplorer = scene.children.length;
  const explorer = createExplorerView(scene);
  const foley = createFoley();
  const explorerRoots = scene.children.slice(childrenBeforeExplorer);
  const helmetRim = createHelmetRim();
  // Con `?debug`, F6 pone la cámara fuera, detrás del explorador, para verlo andar; F7 la gira a su alrededor.
  let outside = false;
  let around = 0;
  // V a pie alterna la tercera persona (cámara detrás del hombro, que no atraviesa paredes).
  let thirdPerson = false;
  let thirdDistance = THIRD_PERSON_DISTANCE;
  // El agujero negro: nace a las 13:30 en la Sala del Motor de Cicatriz y viaja con ella.
  const chronology = looping ? loadChronology(window.location.search) : quietChronology();
  // A pie, la nave posada es un obstáculo más del mundo donde está; `ui` llega después (avisos del Contrapeso).
  const game: { ui?: ReadingUi; flight?: ShipFlight } = {};
  // El Contrapeso espera en su Banco del Laboratorio; se coge, se lleva (su reloj va al tablero) y se instala en
  // la Sala del Motor de Cicatriz, en el núcleo de la máquina, donde nace el agujero negro.
  const counterweight = createCounterweightRig({
    scene,
    runtimes,
    chronology,
    notify: (message) => {
      game.ui?.notify(message);
    },
    stowage: shipModel?.parts.cargo,
  });
  // El reloj de la Pista del Taller: con él en hora, el anillo lleva a la Sala del Centro durante las 7:00.
  const taller = runtimes.get(TELEPORTER.world);
  const track =
    taller &&
    createTrackClock(() =>
      machineTime(
        session.director.clock.t,
        taller.world.info.clockRate,
        chronology.clocks[TELEPORTER.world],
      ),
    );
  const portal = taller?.world.scene.getObjectByName(TELEPORTER.portal);
  const gateOpen = (gate: Gate): boolean =>
    gate.lock === undefined ||
    (gate.lock === DEPTHS.lock && depths?.play.hatchOpen === true) ||
    (track !== undefined && teleporterOpen(gate.lock, session.activeEventIds, track));
  const birthplace =
    counterweight?.core ??
    sources.get(BLACK_HOLE.world)?.interactables.find((i) => i.id === BLACK_HOLE.source)?.position;
  const blackHole = createBlackHoleView(
    systemScene.groupOf(BLACK_HOLE.world),
    birthplace,
    growthFor(chronology),
  );
  // Con el Contrapeso, el horizonte estable: se nota al acercarse, tira de la nave y cruzarlo lleva al epílogo.
  const horizon = createHorizon({
    world: BLACK_HOLE.world,
    center: birthplace,
    growth: growthFor(chronology),
  });
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
  // El aire bajo el mar del Archivo.
  const diving = createDiving();
  // Salpicaduras, ondas y burbujas al tocar el agua (a pie o con la nave).
  const waterEffects = createWaterEffects();
  scene.add(waterEffects.object);
  const waterPlay = createWaterPlay(waterEffects);
  const splashUp = new Vector3();
  let drowned: DeathCause | undefined;
  // Hundirse en las nubes del Taller (a pie; con la nave lo dice shipFlight).
  let gassed: DeathCause | undefined;
  // Los eventos que ocurren ahora (los puentes de luz del Taller solo se pisan durante el suyo).
  let liveEvents: readonly string[] = [];
  let horizonCross: DeathCause | undefined;
  // Por una boca de casa del Archivo, con el final que sale de ella y de los planos.
  let mouthCross: DeathCause | undefined;
  let ending: Ending | undefined;
  const hiddenWorld = spec?.bodies.find((body) => body.hidden)?.world;

  const walking = new Map<string, MotorEnvironment>(
    [...runtimes].map(([id, runtime]) => [
      id,
      {
        wells: [runtime.well],
        world: withMovingCollider(
          withEventColliders(runtime.collision, runtime.eventCollision, () => liveEvents),
          () => game.flight?.colliderIn(id),
        ),
        water: runtime.water,
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
  /** Dónde está quien mira: la nave si se pilota (en su marco), si no el jugador en su mundo. */
  function viewer(): { frame: string | undefined; position: Vector3 } {
    const { flight } = game;
    if (flight?.piloting) return { frame: flight.frame, position: flight.position };
    return { frame: currentWorld.id, position: player.state.position };
  }

  const session = createLoopSession({
    scene,
    sun,
    chronology,
    locate: (t) => {
      if (!systemLocator) return standalone(t);
      const { frame, position } = viewer();
      systemScene.toSystem(position, t, systemPosition);
      const here = systemLocator.locate(t, frame, systemPosition);
      // Junto al horizonte estable el tiempo de fuera corre aún más deprisa.
      const near = horizon.rate(frame, position);
      return near === 1 ? here : { ...here, rate: here.rate * near };
    },
    extraEvents: [...runtimes.values()].flatMap((r) =>
      triggersAsEvents(r.world.markers.triggers, r.id),
    ),
    player,
    looping,
    saved,
    // Cruzado el gusano, el sistema ajeno se carga de nuevo con la página, detrás del fundido a blanco; cruzado el
    // horizonte estable, el Archivo de las Puertas, detrás del negro; cruzada una boca de casa, Hogar.
    onCross: (wasSaved) => {
      followCrossing(session.director.deathCause, ending, wasSaved);
    },
    skyDirection: arrivalSkyDirection(player),
    counterweightClock: () => counterweight?.play.clock,
    // Cada ciclo empieza en el mundo de llegada, a pie, con la nave esperando (y sin tensión de marea).
    onRestart: () => {
      soundtrack.play('loop.reset');
      game.flight?.reset();
      shipSound.reset();
      enterWorld(startWorld);
      tides.reset();
      diving.reset();
      waterPlay.reset();
      counterweight?.play.reset();
      bells?.play.reset();
      archivoPuzzles?.play.reset();
      depths?.play.reset();
      bench?.play.reset();
      track?.reset();
      arrive(startWorld);
    },
  });
  const reading = new ReadingSession(clues, session.savedFacts, (facts) =>
    session.saveFacts(facts),
  );
  // Lo abierto en otras partidas: el cuaderno dice en cada mundo si queda algo por leer (plan de la llegada, C).
  reading.restoreOpened(session.savedOpened, (opened) => {
    session.saveOpened(opened);
  });
  // En el Archivo de las Puertas: los planos del Contrapeso y las bocas de casa. Elegir una abre un agujero de gusano
  // en el cielo (T11); cruzarlo con la nave decide el final.
  const skyMouth = createSkyMouth();
  const puertas = runtimes.get(SKY_MOUTH.world);
  const skyView = puertas ? createSkyMouthView(puertas.world.scene) : undefined;
  const skyWorld = new Vector3();
  const epilogue = createEpilogueRig({
    runtimes,
    knows: (conclusion) => reading.conclusions().has(conclusion),
    onChoose: (id) => {
      if (!puertas || !skyView) return;
      skyMouth.open(id);
      soundtrack.play('wormhole.open');
      skyView.open(skyMouthCenter(puertas.spawn.feet, puertas.world.info.radius));
      game.ui?.closeReading();
      game.ui?.notify(t('Se abre una boca en el cielo. Solo se llega a ella con la nave.'));
    },
  });
  const shipSound = createShipSound(soundtrack);
  const edges = createEdgeTracker();
  const wormholeHum = createLoopFollower(soundtrack, 'wormhole.idle');
  const holeRumble = createLoopFollower(soundtrack, 'blackhole.rumble');
  const cabinHum = createLoopFollower(soundtrack, 'cabin.hum');
  const underwater = createLoopFollower(soundtrack, 'underwater');
  const musicDirector = createMusicDirector();
  let lastMusic: string | undefined;
  let lastCrossing: string | undefined;
  let lastTarget: string | undefined;
  let stabilizerOn = true;
  // Cada botón de menús y paneles hace clic (los botones táctiles del juego, no: son los mandos). En captura,
  // porque los botones de los paneles detienen la propagación del clic.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('button') && !target.closest('.touch')) {
        soundtrack.play('ui.click');
      }
    },
    true,
  );
  // El Planetario y el prisma del Archivo (T6): esferas, rieles y soporte.
  const archivoPuzzles = createArchivoRig({ scene, runtimes });
  // La cisterna del Fondo y los péndulos de la Sala Cerrada (T7).
  const depths = createDepthsRig({ scene, runtimes });
  // La Balanza del Contrapeso del Taller y la placa que canta de Cicatriz (T8).
  const bench = createBenchRig({ scene, runtimes });
  // Las campanas del Anfiteatro de Umbral (P1): coger, poner en el canal y oír a la bola pasar.
  const bells = createBellsRig({
    scene,
    runtimes,
    chime: (frequency) => {
      soundtrack.chime(frequency);
    },
  });
  // La bitácora de mundos: los que ya se encontraron (se guardan con la partida).
  let worldNames: WorldNames = session.savedWorlds;
  const discovery = createWorldDiscovery(
    () => document.querySelector<HTMLElement>('.hud-book') ?? undefined,
  );
  const place = createPlaceCard();
  /** Al despertar o aterrizar: el cartel con su nombre, o, la primera vez, la carta del mundo nuevo. */
  function arrive(id: string): void {
    const name = officialName(id);
    if (exploring && isNewWorld(worldNames, id)) {
      overlay.releasePointer();
      discovery.open(id, name, worldAbout(id), () => {
        worldNames = withDiscovery(worldNames, id, session.director.loopsCompleted);
        session.saveWorld(id, name);
        overlay.recapturePointer();
        game.ui?.notify(t('Pegado en la bitácora: {name}', { name }));
        place.show(name, worldWhere(id));
      });
      return;
    }
    place.show(name, worldWhere(id));
  }
  const { input, overlay, touch } = createControls(
    canvas,
    worldTitle(startWorld),
    session,
    () => {
      game.ui?.openRegistry();
    },
    {
      settings: textSettings,
      display,
      onLetterSample: () => {
        soundtrack.blip(voicePitch(undefined));
      },
    },
    {
      context: () => ({
        // Con una lectura, un panel, una escena o la pausa abiertos solo queda la pausa.
        playing: overlay.playing && free() && !ui.blocking,
        swimming: player.state.swimming,
        ...(game.flight?.touchState ?? ON_FOOT),
      }),
      onShipAction: (action) => {
        // En el prólogo el botón Objetivo abre las tareas (la nave ya apunta sola a lo que toca).
        if (action === 'target' && inPrologue) ui.openTasks();
        else shipAction(action);
      },
    },
  );
  // En vertical el juego se pausa y se sueltan dedos y teclas; al volver a horizontal queda en la pausa normal.
  const holdForRotation = (): void => {
    overlay.pause();
    touch?.reset();
    input.reset();
  };
  rotateGuard.subscribe((active) => {
    if (active) holdForRotation();
    else overlay.focus(); // el foco vuelve a la pausa que se había quedado detrás del aviso
  });
  if (rotateGuard.active) holdForRotation(); // la página se abrió ya en vertical
  // La luz del explorador: la L enciende los puntos de su cuerpo, que alumbran de azul celeste en todas direcciones.
  const bodyLight = createBodyLightSwitch(() => overlay.playing);
  // De vuelta en casa: la Directora cierra el viaje con la tarjeta del final.
  const homecoming = homecomingEnding
    ? createHomecomingRig({
        ending: homecomingEnding,
        freeze: () => {
          game.ui?.closeReading();
          game.ui?.setEnabled(false);
          overlay.releasePointer();
          overlay.setInert(true);
          lockGameKeys();
        },
        stepOutside: () => {
          enterWorld(startWorld);
          createArrivalLayer('negro').clear();
        },
        turnToMoon: (share) => {
          const moon = systemScene.groupOf(WORMHOLE.world)?.getWorldPosition(new Vector3());
          if (moon) aimToward(player, camera, moon, share);
        },
        reducedMotion,
        markSeen: (seen) => {
          const store = browserStore();
          return markEndingSeen(store, loadSave(store), seen);
        },
        replay: () => {
          replay(loadSave(browserStore()).data.prologueDone);
        },
        backToArchive: toArchive,
      })
    : undefined;
  const startSources = sources.get(startWorld);
  if (!startSources) throw new Error(`Faltan las fuentes de ${startWorld}`);
  // El ocular del telescopio del Observatorio (🟡): mira el cielo en vivo desde donde está el jugador.
  const ocularSource = createOcularSource({
    eye: camera,
    star: sun,
    groupOf: (world) => systemScene.groupOf(world),
    radiusOf: (world) => runtimes.get(world)?.world.info.radius,
    worlds: [...runtimes.keys()],
    hidden: hiddenWorld,
    reference: () => systemScene.referenceWorld,
    alignedNow: () => session.activeEventIds.includes(ALIGNMENT_EVENT),
    observatory: OBSERVATORY,
  });
  // El prólogo (casa, antes del primer ciclo): tareas, indicador y un cuaderno sin lo que aún no se sabe.
  const inPrologue = !looping && runtimes.has(WORMHOLE.world) && !homecoming;
  // En el sistema de los Ausentes, las tareas del bucle (plan de la llegada, hito B), con lo ya hecho guardado.
  const loopTasks = looping && exploring && !homecoming;
  const taskTracker = inPrologue
    ? new TaskTracker()
    : new TaskTracker('bucle', saved.data.tasks.filter(isLoopTask));
  const touchUi = isTouchDevice();
  // Dejar lo que se lleva en el suelo o en una mesa, y volver a cogerlo mirándolo (E, sin apuntar a una fuente).
  const looseCarry = createLooseCarry(
    [bells?.carrier, archivoPuzzles?.carrier, bench?.carrier].filter(
      (carrier): carrier is LooseCarrier => carrier !== undefined,
    ),
  );
  const aimUp = new Vector3();
  const aimEye = new Vector3();
  const aimDirection = new Vector3();
  /** Adónde mira el jugador: desde sus ojos (también en tercera persona) hacia donde apunta la cámara. */
  function looseAim(): LooseAim {
    upOf(player.state.body, aimUp);
    aimEye.copy(player.state.position).addScaledVector(aimUp, EYE_HEIGHT);
    camera.getWorldDirection(aimDirection);
    const hit = currentWorld.collision.raycastHit(aimEye, aimDirection, LOOSE_AIM_REACH);
    return {
      world: currentWorld.id,
      origin: aimEye,
      direction: aimDirection,
      hit: hit ? { point: hit.point, normal: hit.normal, distance: hit.distance } : undefined,
      up: aimUp,
    };
  }
  const looseActions: SourceActions = {
    gone: () => false,
    verb: () => undefined,
    run: () => undefined,
    ambient: {
      verb: () => (looseCarry.active() ? looseCarry.verb(looseAim()) : undefined),
      run: () => {
        if (!looseCarry.active()) return;
        const aim = looseAim();
        const verb = looseCarry.verb(aim);
        looseCarry.run(aim);
        const sound = verb && carrySoundOf(verb);
        if (sound) soundtrack.play(sound);
      },
    },
  };
  const ui = createReadingUi({
    camera,
    sources: startSources,
    clues,
    reading,
    loop: session,
    overlay,
    player,
    touch: isTouchDevice(),
    promptParent: touch?.contextSlot,
    actions: composeActions(
      [
        counterweight?.play.actions,
        bells?.play.actions,
        archivoPuzzles?.play.actions,
        depths?.play.actions,
        bench?.play.actions,
        epilogue?.play.actions,
        homecoming?.play.actions,
        looseActions,
      ],
      (verb) => {
        const sound = carrySoundOf(verb);
        if (sound) soundtrack.play(sound);
      },
    ),
    readers: {
      ...counterweight?.readers,
      ...bells?.readers,
      ...archivoPuzzles?.readers,
      ...depths?.readers,
      ...bench?.readers,
      ...epilogue?.readers,
      ...(track && { pista: (status, _solved, solve) => trackClockBody(track, status, solve) }),
      ocular: (status, solved, solve) => ocularBody(ocularSource, status, solved, solve),
    },
    settings: textSettings,
    reducedMotion,
    worldNames: () => worldNames,
    prologue: inPrologue ? { tasks: () => taskTracker.items(touchUi) } : undefined,
    onLetters: (pitch) => {
      soundtrack.blip(pitch);
    },
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
          walkInto: (world) => {
            enterWorld(world);
            arrive(world);
          },
          nameOf: (world) => officialName(world),
          pull: (frame, position, target) => {
            horizon.pull(frame, position, target);
          },
          setReadingEnabled: (enabled) => {
            ui.setEnabled(enabled);
          },
          openRegistry: () => {
            ui.openRegistry();
          },
          openMap: () => {
            shipMap?.open();
          },
          clock: () => session.director.clock,
          touch: isTouchDevice(),
          autoTarget: inPrologue,
        })
      : undefined;
  game.flight = flight;
  // La cinemática del gusano del prólogo: mientras dura, la nave se pilota sola y no se controla nada.
  const cinematic: {
    active: boolean;
    elapsed: number;
    center: Vector3 | undefined;
    start: Vector3 | undefined;
  } = {
    active: false,
    elapsed: 0,
    center: undefined,
    start: undefined,
  };
  // La primera llegada tras el gusano (✅ Anthony, 2026-11-06): tumbado lejos de la nave, se incorpora y escribe
  // su primera nota; hasta entonces no se controla nada. Solo esa vez: luego se aparece frente a La Boca.
  let awakening: { elapsed: number; noted: boolean } | undefined =
    arrivedBy === 'blanco' && !inPrologue && currentWorld.id === FIRST_ARRIVAL.world
      ? { elapsed: 0, noted: false }
      : undefined;
  // Leyendo, muriendo o cerrado ya el viaje (la vuelta a casa), no se hace nada.
  const free = (): boolean =>
    !cinematic.active &&
    awakening === undefined &&
    session.acceptsInput &&
    !ui.blocking &&
    !discovery.isOpen &&
    !(shipMap?.isOpen ?? false) &&
    !(homecoming?.blocking ?? false);
  // El menú principal cubre la pantalla de pausa hasta que el jugador pulsa Jugar o Continuar.
  // Jugar se activa al quitar la pantalla de carga (antes, la tecla que despierta la música lo pulsaría).
  const menu = activeMenu;
  if (menu) overlay.setInert(true);
  const enableMenu = (): void => {
    menu?.ready(() => {
      soundtrack.stopMusic(3);
      menu.dispose();
      activeMenu = undefined;
      overlay.setInert(false);
      overlay.begin();
    });
  };
  const canAct = (): boolean => overlay.playing && free();
  function shipAction(action: ShipAction): void {
    // En el prólogo, T son las tareas (las abre la lectura): la nave ya apunta sola a lo que toca.
    if (action === 'target' && inPrologue) return;
    if (action === 'camera' && !flight?.piloting) {
      if (canAct()) thirdPerson = !thirdPerson;
      return;
    }
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
  // La mesa del mapa de la nave (Fase 11): el mapa de órbitas del juego.
  const shipMap =
    spec && flight
      ? createShipMap({
          spec,
          read: systemSnapshot,
          nameOf: (world) => officialName(world),
          shipWorld: () => flight.frame,
          onOpen: () => {
            overlay.releasePointer();
          },
          onClose: () => {
            overlay.recapturePointer();
          },
        })
      : undefined;
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
    window.__juego.skyMouth = () => ({
      chosen: skyMouth.chosen ?? null,
      open: skyView?.isOpen ?? false,
    });
    window.__juego.flyIntoMouth = () => {
      if (!skyView?.isOpen || !flight) return false;
      return flight.startPiloting(
        SKY_MOUTH.world,
        skyView.center.clone().addScaledVector(skyView.center.clone().normalize(), 6),
        skyView.center,
        session.director.clock.t,
      );
    };
    window.__juego.landHome = () => {
      if (!flight?.piloting) return false;
      flight.reset();
      shipSound.reset();
      enterWorld(startWorld);
      return true;
    };
    window.__juego.toGate = (name, distance = 5) => {
      const gate = currentWorld.gates.find((g) => g.name === name);
      if (!gate || flight?.piloting) return false;
      const feet = gate.position.clone().addScaledVector(gate.forward, -distance);
      player.moveTo(feet, lookAlong(gate.up, gate.forward));
      passage.reset(player.state.position);
      return true;
    };
    window.__juego.gates = () => currentWorld.gates.map((g) => g.name);
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
    window.__juego.toShip = (station = 'asiento') =>
      flight?.standAt(currentWorld.id, station) ?? false;
    window.__juego.toLadder = () => flight?.standAtLadder(currentWorld.id) ?? false;
    window.__juego.audio = () => soundtrack.snapshot();
    window.__juego.sfx = async (id, options) => {
      await soundtrack.preload([id]);
      return soundtrack.play(id, options);
    };
    window.__juego.lens = () => lens.snapshot();
    window.__juego.tide = () => tides.snapshot();
    window.__juego.dive = () => ({ ...diving.snapshot(), effects: waterEffects.snapshot() });
    window.__juego.blackHole = () => blackHole.snapshot();
    window.__juego.sky = () => ({ density: atmosphere.density });
    window.__juego.ool = () => ({ turns: ool.snapshot(), filaments: filaments.snapshot() });
    window.__juego.explorer = () => ({ ...explorer.snapshot(), outside, lightOn: bodyLight.on });
    window.__juego.pitch = (angle) => {
      player.look(0, angle - player.pitch);
      return player.pitch;
    };
    window.__juego.outside = (on, angle) => {
      outside = on;
      if (angle !== undefined) around = angle;
      return outside;
    };
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'F6' && event.code !== 'F7') return;
      event.preventDefault();
      if (event.code === 'F6') outside = !outside;
      else around += Math.PI / 4;
    });
    window.__juego.wormhole = () => ({
      active: wormholeView?.active ?? false,
      progress: wormholeView?.progress ?? 0,
    });
    window.__juego.tasks = () => taskRig?.snapshot() ?? null;
    window.__juego.absorption = () => absorption?.snapshot() ?? null;
    window.__juego.counterweight = () => counterweight?.play.snapshot() ?? null;
    window.__juego.bells = () => bells?.play.snapshot() ?? null;
    window.__juego.bench = () => bench?.play.snapshot() ?? null;
    window.__juego.benchNotch = (notch) => {
      bench?.forceNotch(notch);
    };
    window.__juego.benchHole = (hole) => {
      bench?.forceHole(hole);
    };
    window.__juego.depths = () => depths?.play.snapshot() ?? null;
    window.__juego.depthsPendulum = (pendulum) => {
      depths?.forcePendulum(pendulum);
    };
    window.__juego.archivo = () => archivoPuzzles?.play.snapshot() ?? null;
    window.__juego.archivoRail = (rail) => {
      archivoPuzzles?.forceRail(rail);
    };
    window.__juego.bellsMark = (mark) => {
      bells?.forceMark(mark);
    };
    window.__juego.horizon = () => {
      const { frame, position } = viewer();
      return { radius: horizon.radius, closeness: horizon.closeness(frame, position) };
    };
    // Delante de la máquina (la marca de la Sala del Motor), a la altura del núcleo: sin cruzar el anillo.
    window.__juego.nearHorizon = (radii) => {
      // Por el acceso de la nave si el mundo lo marca (en Cicatriz, la banda de la máquina tapa los demás lados).
      const scene = runtimes.get(BLACK_HOLE.world)?.world.scene;
      const access = scene?.getObjectByName(BLACK_HOLE.approach);
      const front =
        scene && access
          ? scene.worldToLocal(access.getWorldPosition(new Vector3()))
          : sources.get(BLACK_HOLE.world)?.interactables.find((i) => i.id === BLACK_HOLE.source)
              ?.position;
      if (!flight || !birthplace || !front || horizon.radius <= 0) return false;
      const at = approachPoint(birthplace, front, radii * horizon.radius);
      return flight.placeAt(BLACK_HOLE.world, at, birthplace);
    };
    window.__juego.epilogue = () =>
      epilogue ? { carryingPlans: epilogue.play.carryingPlans } : null;
    window.__juego.aimAt = (target) => {
      const where =
        target === 'agujero'
          ? blackHole.lens()?.position.clone()
          : target === 'estrella'
            ? sun.position.clone()
            : systemScene.groupOf(target)?.getWorldPosition(new Vector3());
      if (!where || flight?.piloting) return false;
      aimToward(player, camera, where);
      return true;
    };
    window.__juego.homecoming = () =>
      homecomingEnding && homecoming
        ? { ending: homecomingEnding, phase: homecoming.phase, without: home?.without ?? [] }
        : null;
    window.__juego.teleporter = () =>
      track ? { matched: track.matched, open: portal?.visible ?? false } : null;
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
  // (solo el prólogo: el Archivo de las Puertas tampoco tiene ciclo, pero no es casa)
  const prologue = inPrologue ? createPrologueGate() : undefined;
  // Las tareas del prólogo: la lista de la izquierda, el aviso de arriba y el indicador hacia lo que toca.
  const taskRig =
    (inPrologue || loopTasks) && flight
      ? createTaskRig({
          tracker: taskTracker,
          reading,
          touch: touchUi,
          camera,
          systemScene,
          sources,
          radiusOf: (world) => runtimes.get(world)?.world.info.radius,
          moonWorld: WORMHOLE.world,
          setShipTarget: (world) => {
            if (inPrologue) flight.setTarget(world);
          },
          shipPlace: () => flight.shipPlace,
          visited: () => new Set(Object.keys(worldNames)),
          explorable: spec?.bodies.filter((body) => !body.hidden).map((body) => body.world),
          conclusions: () => reading.conclusions(),
          counterweight: () => {
            const play = counterweight?.play;
            return play
              ? { place: play.place, motorOut: play.motorOut, matched: play.wheels.read().matched }
              : undefined;
          },
          onDone: (done) => {
            if (!inPrologue) markTasksDone(browserStore(), loadSave(browserStore()), done);
          },
        })
      : undefined;
  // El gusano junto al fragmento de la Luna: se abre, y al terminar llega el fundido a blanco de la Cámara.
  const wormholeView = inPrologue ? createWormholeView() : undefined;
  // Mientras arrastra la nave, la imagen se separa en colores y crece un destello.
  const warpDistortion = inPrologue ? createWarpDistortion(renderer.domElement) : undefined;
  // Las Puertas plegadas son agujeros de gusano estables (T11): su velo, y la imagen que se deforma al acercarse.
  const gateWormholes = createGateWormholes(runtimes.values(), gateOpen);
  const gateWarp = createWarpDistortion(renderer.domElement);
  let gateSample: GateWormholeSample | undefined;
  let crossingAsked = false;
  function openWormhole(): void {
    const moon = systemScene.groupOf(WORMHOLE.world);
    // Desde aquí no se controla nada (ni levantarse, ni pilotar, ni el cuaderno): solo se mira.
    cinematic.active = true;
    cinematic.elapsed = 0;
    ui.setLocked(true);
    if (!wormholeView || !moon) {
      wormhole = 'gusano'; // sin la escena, directamente al fundido
      return;
    }
    // Delante de la nave y por encima, según hacia dónde miras; cuelga de la Luna (su centro es su origen).
    moon.updateWorldMatrix(true, false);
    const eye = moon.worldToLocal(camera.position.clone());
    const ahead = moon.worldToLocal(
      camera.position.clone().add(camera.getWorldDirection(new Vector3())),
    );
    cinematic.center = cinematicCenter(eye, ahead.sub(eye), new Vector3());
    // La nave sale de donde está (si estás en la Luna); si no, de tu vista.
    cinematic.start = flight?.frame === WORMHOLE.world ? flight.position.clone() : eye;
    wormholeView.start(moon, cinematic.center);
  }
  let wormhole: DeathCause | undefined;
  const physics = createFixedStep(
    { stepSeconds: PHYSICS_STEP, maxStepsPerFrame: MAX_PHYSICS_STEPS_PER_FRAME },
    (dt) => {
      const moving = overlay.playing && free();
      if (cinematic.active && flight?.piloting) {
        // La nave sigue el recorrido de la cinemática (en cada fotograma): aquí no vuela ni choca.
        flight.hold();
      } else if (flight?.piloting) {
        if (moving) shipDeath ??= flight.step(session.director.clock.t, input.flightKeys(), dt);
        else flight.hold();
      } else {
        const intent = tides.slow(input.intent());
        player.step(moving ? (counterweight?.play.limit(intent) ?? intent) : IDLE_INTENT, dt);
      }
    },
  );
  status.textContent = '';
  if (awakening) {
    const mark = currentWorld.world.markers.spawns.get(FIRST_ARRIVAL.spawn);
    if (mark) {
      player.switchWorld(
        spawnOnGround(mark, currentWorld.collision, currentWorld.well),
        envOf(currentWorld.id),
        currentWorld.well,
      );
      passage.reset(player.state.position);
    }
    flight?.parkAtCrash();
    ui.setLocked(true);
  }
  arrival?.clear();

  // La sombra de la estrella (plan de soles y luz, S3): los materiales de los mundos reciben la sombra, y lo que ya lleva
  // `castShadow` la proyecta. Con `?calidad=baja` no hay sombra (y los materiales ni se tocan).
  const gl = renderer.getContext();
  const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = rendererInfo ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)) : '';
  const shadowSize = sunShadowSizeFromQuery(
    window.location.search,
    quality,
    isSoftwareRenderer(gpuName),
  );
  const sunShadow = shadowSize > 0 ? createSunShadow(shadowSize) : undefined;
  const cameraWorld = new Vector3();
  if (sunShadow) {
    scene.traverse((object) => {
      if (!(object instanceof Mesh) && !(object instanceof InstancedMesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials)
        if (material instanceof MeshStandardMaterial) sunShadow.receive(material);
    });
    // Lo que no tenía `castShadow` (tú, la nave) también proyecta sombra.
    for (const root of [...explorerRoots, shipModel?.object]) if (root) castShadowsFrom(root);
    sunShadow.register(scene);
  }

  // Los sombreadores de todos los mundos se compilan aún bajo la pantalla de carga, no al llegar a cada uno.
  await warmUpShaders(renderer, scene, camera, (done, total) => {
    loading.show({ kind: 'light', done, total });
  });
  // Desde aquí la mezcla la pone cada fotograma (con el mundo ya puesto).
  window.clearInterval(loadingSound);

  let awoke = false;
  const feet = new Vector3();
  const airCenter = new Vector3();
  const diveUp = new Vector3();
  const body = new Quaternion();
  runFrameLoop(
    renderer,
    () => {
      // Dentro del Nudo la estrella no ilumina (su luz está apagada): sin sombra.
      sunShadow?.setEnabled(sun.visible);
      sunShadow?.update(renderer, scene, sun.position, camera.getWorldPosition(cameraWorld), {
        starRadius: spec?.star.radius ?? 0,
      });
      renderWithWormholes(renderer, scene, camera);
    },
    (dt) => {
      const look = input.consumeLook();
      // Leer, abrir el Registro o la carta de un mundo nuevo detiene el ciclo.
      const timeRuns =
        overlay.playing && !ui.blocking && !discovery.isOpen && !(shipMap?.isOpen ?? false);
      // El primer despertar de la partida: el cartel del mundo (o su carta de mundo nuevo).
      if (awakening) {
        if (overlay.playing) awakening.elapsed += dt;
        if (!awakening.noted && awakeningPose(awakening.elapsed).done) {
          // De pie, saca el cuaderno y escribe lo que cree que le ha pasado.
          awakening.noted = true;
          ui.setLocked(false);
          ui.readSource(FIRST_ARRIVAL.note);
        } else if (awakening.noted && !ui.blocking) awakening = undefined;
      }
      if (overlay.playing && !awoke && !awakening) {
        awoke = true;
        // Tras cruzar una boca de casa se aparece en el espacio, sentado en la nave, sobre Hogar (T11).
        const homeWorld = homecomingEnding ? runtimes.get(startWorld) : undefined;
        if (homeWorld && flight) {
          const up = homeWorld.spawn.feet.clone().normalize();
          const arrival = up.multiplyScalar(homeWorld.world.info.radius + HOME_ARRIVAL_ALTITUDE);
          flight.startPiloting(startWorld, arrival, homeWorld.spawn.feet, session.director.clock.t);
        }
        arrive(currentWorld.id);
      }
      if (timeRuns && free()) {
        if (flight?.piloting) flight.addLook(look.x, look.y);
        else player.look(-look.x * MOUSE_LOOK_SENSITIVITY, -look.y * MOUSE_LOOK_SENSITIVITY);
      }
      const opened = prologue?.update(
        {
          world: flight?.piloting ? flight.frame : currentWorld.id,
          seated: flight?.piloting ?? false,
          running: timeRuns && session.acceptsInput,
          knowsFragment: reading.known.has(WORMHOLE.fact),
        },
        dt,
      );
      if (opened) openWormhole();
      if (wormholeView?.active) {
        wormholeView.update(timeRuns ? dt : 0, camera.position);
        warpDistortion?.update(wormholeView.progress);
        // La nave despega sola y el gusano la arrastra entera hasta su centro.
        if (cinematic.active && cinematic.start && cinematic.center && flight?.piloting) {
          if (timeRuns) cinematic.elapsed += dt;
          flight.placeAt(
            WORMHOLE.world,
            cinematicShipPosition(
              cinematic.start,
              cinematic.center,
              new Vector3(),
              cinematic.elapsed,
              wormholeView.progress,
            ),
            cinematic.center,
          );
        }
        if (wormholeView.progress >= 1 && !crossingAsked) {
          crossingAsked = true;
          wormhole = 'gusano';
        }
      }
      session.update(
        dt,
        timeRuns,
        mouthCross ?? horizonCross ?? wormhole ?? shipDeath ?? tideDeath ?? drowned ?? gassed,
      );
      // si el ciclo no corrió, espera; la boca elegida no se olvida (cruzar no tiene vuelta y la página se recarga)
      if (timeRuns) {
        wormhole = shipDeath = tideDeath = drowned = gassed = horizonCross = undefined;
      }
      liveEvents = session.activeEventIds;
      for (const prop of eventProps) {
        prop.object.visible = liveEvents.includes(prop.event);
      }
      if (portal) {
        portal.visible = track !== undefined && teleporterOpen(TELEPORTER.lock, liveEvents, track);
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
      if (!piloting && canAct()) passage.update(currentWorld, player, gateOpen);
      const { gas } = currentWorld.world.info;
      if (
        !piloting &&
        session.acceptsInput &&
        sunkInGas(player.state.position, currentWorld.well.center, gas)
      ) {
        gassed = 'gas';
      }
      interior.update(
        currentWorld.id,
        !piloting && insideCavity(player.state.position, currentWorld.well),
      );
      const here = viewer();
      nearDetail.update(here.frame, camera.position);
      const tideLethal = tides.update(
        {
          world: here.frame === undefined ? undefined : runtimes.get(here.frame),
          position: here.position,
          loopTime: session.director.clock.t,
          absorption: session.director.absorption,
          horizon: horizon.closeness(here.frame, here.position),
          stableHole: horizon.radius > 0,
          running: timeRuns && session.acceptsInput,
          piloting,
        },
        dt,
      );
      if (tideLethal && session.acceptsInput) tideDeath = 'marea';
      const outOfAir = diving.update(
        {
          water: piloting ? undefined : currentWorld.water,
          feet: player.state.position,
          up: upOf(player.state.body, diveUp),
          running: timeRuns && session.acceptsInput,
        },
        dt,
      );
      if (outOfAir) drowned = 'ahogado';
      {
        // El agua solo se pinta en el mundo de referencia (el que está en el origen de la escena).
        const flying = flight?.piloting === true;
        const waterWorld = flying ? flight.frame : currentWorld.id;
        const water =
          waterWorld !== undefined && waterWorld === systemScene.referenceWorld
            ? runtimes.get(waterWorld)?.water
            : undefined;
        const at = flying ? flight.position : player.state.position;
        if (flying && water) splashUp.subVectors(at, water.center).normalize();
        else upOf(player.state.body, splashUp);
        waterPlay.update(water, { position: at, up: splashUp, ship: flying }, dt);
        waterEffects.update(dt, water);
      }
      if (horizon.crossed(here.frame, here.position) && session.acceptsInput) {
        horizonCross = 'horizonte';
      }
      // La nave entra en la boca del cielo: el final sale de la boca elegida y de los planos.
      if (
        skyView?.isOpen &&
        flight?.piloting &&
        crossesMouth(camera.position, skyView.worldCenter(skyWorld)) &&
        session.acceptsInput
      ) {
        const id = skyMouth.cross();
        const mouth = id ? mouthById(id) : undefined;
        const chosen = mouth ? endingFor(mouth, epilogue?.play.carryingPlans ?? false) : undefined;
        if (chosen) {
          ending = chosen;
          mouthCross = 'boca';
        }
      }
      // Al abrirse el gusano la vista se estira (después de la marea, que fija la de cada fotograma).
      gateSample = gateWormholes.update(camera.position, performance.now() / 1000);
      const skyNear = skyView?.update(camera.position, performance.now() / 1000) ?? 0;
      const near = Math.max(gateSample.proximity, skyNear);
      gateWarp.update(gateSplit(near));
      if (near > 0 && !reducedMotion) {
        camera.fov *= 1 + gateStretch(near);
        camera.updateProjectionMatrix();
      }
      if (wormholeView && wormholeView.stretch > 0 && !reducedMotion) {
        camera.fov *= 1 + wormholeView.stretch;
        camera.updateProjectionMatrix();
      }
      if (flight?.piloting) {
        flight.view(alpha, camera);
      } else {
        player.interpolatedFeet(alpha, feet);
        player.interpolatedBody(alpha, body);
        if (outside) chasePose(body, feet, camera.position, camera.quaternion, around);
        else if (thirdPerson && !awakening) {
          const clear = thirdPersonPose(
            body,
            player.pitch,
            feet,
            thirdDistance,
            currentWorld.collision,
            camera.position,
            camera.quaternion,
          );
          thirdDistance = easeDistance(Math.min(thirdDistance, clear), clear, dt);
        } else cameraPose(body, player.pitch, feet, camera.position, camera.quaternion);
        if (awakening && !outside) {
          // Tumbado: la vista baja hacia el suelo y mira al cielo; poco a poco se incorpora.
          const pose = awakeningPose(awakening.elapsed);
          camera.position.addScaledVector(
            feet.clone().sub(currentWorld.well.center).normalize(),
            -pose.drop,
          );
          camera.rotateX(pose.pitch);
        }
      }
      explorer.update({
        feet,
        body,
        pitch: player.pitch,
        velocity: player.state.velocity,
        grounded: player.state.grounded,
        swimming: player.state.swimming,
        landings: player.state.landings,
        landingSpeed: player.state.lastLandingSpeed,
        dt,
        visible: !piloting && !(awakening && !awakening.noted),
        firstPerson: !outside && !(thirdPerson && !awakening),
        reading: reading.current !== null,
        lightOn: bodyLight.on,
      });
      // Pasos, salto y aterrizaje: se siguen siempre (el contador de aterrizajes no debe perder uno) y suenan solo
      // cuando el cuerpo se ve y el tiempo corre.
      const bodyEvents = foley.update({
        dt,
        speed: explorer.speed,
        grounded: player.state.grounded,
        swimming: player.state.swimming,
        verticalSpeed: explorer.verticalSpeed,
        landings: player.state.landings,
        landingSpeed: player.state.lastLandingSpeed,
        surface: surfaceOf(currentWorld.id),
      });
      if (timeRuns && !piloting && !(awakening && !awakening.noted)) {
        for (const event of bodyEvents) {
          const { id, options } = soundOf(event);
          soundtrack.play(id, options);
        }
      }
      helmetRim.update(!piloting && !outside && !thirdPerson && overlay.playing);
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
      horizon.update(t, stable);
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
        hole:
          hole ??
          wormholeView?.lens() ??
          (gateSample.position && gateSample.proximity > 0.05
            ? { position: gateSample.position, radius: GATE_LENS_RADIUS * gateSample.proximity }
            : undefined),
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
      bells?.update(camera, t, timeRuns ? dt : 0);
      depths?.update(camera, t);
      bench?.update(camera);
      archivoPuzzles?.update(
        camera,
        timeRuns ? dt : 0,
        session.activeEventIds.includes('ranura_luz'),
      );
      if (counterweight?.play.place === 'installed' && !stable) session.director.stabilize();
      epilogue?.update();
      homecoming?.update(dt);
      flight?.update({ t, alpha, dt, camera, onFootWorld: currentWorld.id, active: canAct() });
      if (flight) {
        // Con el tiempo parado (pausa, lectura, Registro) los rugidos callan en vez de quedarse con el último empuje.
        const shipFrame = flight.audioFrame(dt);
        shipFrame.paused = !timeRuns;
        shipSound.update(shipFrame);
      }
      // Un sonido por cada vez que se enciende o se apaga algo: la luz del cuerpo, una lectura, el Registro, el
      // gusano de la Luna o el agujero negro. (Sin sonido de apagado = cadena vacía.)
      const holeEvent = session.activeEventIds.includes('agujero_negro');
      const edgeSounds: [string, boolean, string, string][] = [
        ['light', bodyLight.on, 'bodylight.on', 'bodylight.off'],
        ['reading', reading.current !== null, 'read.open', 'read.close'],
        ['registry', ui.blocking && reading.current === null, 'registro.open', 'registro.close'],
        ['wormhole', wormholeView?.active ?? false, 'wormhole.open', ''],
        ['blackhole', holeEvent, 'blackhole.birth', ''],
      ];
      for (const [name, state, onSound, offSound] of edgeSounds) {
        const edge = edges.update(name, state);
        const sound = edge === 'on' ? onSound : edge === 'off' ? offSound : '';
        if (sound) soundtrack.play(sound);
      }
      // Pilotando: el estabilizador (Z) y fijar un objetivo (T) suenan; fuera de la nave se olvidan sin sonar.
      if (flight?.piloting) {
        const stabilizer = flight.touchState.stabilize;
        if (stabilizer !== stabilizerOn) soundtrack.play('ship.stabilizer');
        stabilizerOn = stabilizer;
        const target = flight.targetId;
        if (target !== lastTarget && target !== undefined) soundtrack.play('ship.hud.lock');
        lastTarget = target;
      } else {
        stabilizerOn = flight?.touchState.stabilize ?? true;
        lastTarget = flight?.targetId;
      }
      // Cruzar un gusano o un horizonte: un sonido por cruce, al fijarse la causa.
      const crossing = session.director.deathCause;
      if (crossing !== lastCrossing) {
        lastCrossing = crossing;
        if (crossing === 'gusano' || crossing === 'boca') soundtrack.play('wormhole.cross');
        else if (crossing === 'horizonte') soundtrack.play('horizon.cross');
        else {
          const death = deathSoundOf(crossing);
          if (death) soundtrack.play(death);
        }
      }
      // El zumbido de un portal crece al acercarte; el rumor del agujero negro, con lo que ocupa en el cielo.
      const portalNear = Math.max(gateSample.proximity, skyNear, wormholeView?.active ? 1 : 0);
      // La música: con el menú abierto manda el tema principal; después, el director (silencios y tensión).
      if (!activeMenu) {
        const music = musicDirector.update({
          dt,
          worldId: spec ? systemScene.referenceWorld : currentWorld.id,
          events: session.activeEventIds,
          phase: session.director.phase,
          playing: timeRuns,
        });
        if (music.id !== lastMusic) {
          lastMusic = music.id;
          if (music.id) soundtrack.playMusic(music.id, { fade: music.fade });
          else soundtrack.stopMusic(music.fade);
        }
      }
      wormholeHum.follow(portalNear * 0.9);
      cabinHum.follow(piloting ? 0.7 : 0);
      underwater.follow(player.state.swimming ? 0.8 : 0);
      holeRumble.follow(holeEvent ? Math.sqrt(Math.min(1, Math.max(0, blackHole.fill))) : 0);
      ui.update(performance.now() / 1000);
      ool.update(performance.now() / 1000, dt, piloting ? undefined : camera.position);
      filaments.update(reading.current !== null, reading.known.size);
      taskRig?.update({
        dt: timeRuns ? dt : 0,
        visible: overlay.playing && !ui.blocking && awakening === undefined && !cinematic.active,
        piloting,
        world: currentWorld.id,
        position: player.state.position,
        registryOpen: ui.blocking && reading.current === null,
      });
      sight.update();
      touch?.update();
      debug.update(dt, overlay.playing);
      orbitMap?.update(dt);
    },
  );
  // Los primeros fotogramas (sombras, gusanos) también se dibujan aún tapados; luego se quita la pantalla.
  await nextFrame();
  await nextFrame();
  // Sin menú detrás manda ya el director de música (con sus silencios): el tema principal se apaga.
  if (!menu) soundtrack.stopMusic(LOADING_MUSIC_FADE);
  await loading.finish();
  activeLoading = undefined;
  enableMenu();
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
  const message = t('No se pudo cargar el mundo. Revisa la consola.');
  if (status) status.textContent = message;
  activeLoading?.fail(message);
  activeMenu?.fail(message);
});
