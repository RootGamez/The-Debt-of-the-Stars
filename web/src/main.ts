// Arranque del juego: mundo → colisiones → jugador → controles → ciclo → bucle de render.
// Cada pieza vive en su módulo; aquí solo se conectan.
import './style.css';
import { Quaternion, Timer, Vector3, type PerspectiveCamera, type WebGLRenderer } from 'three';
import { createFixedStep } from './core/fixedStep';
import { IDLE_INTENT, InputController } from './core/inputController';
import { createLoopSession, type LoopSession } from './core/loopSession';
import { Player } from './core/player';
import {
  FIELD_OF_VIEW,
  MAX_PHYSICS_STEPS_PER_FRAME,
  MOUSE_LOOK_SENSITIVITY,
  PHYSICS_STEP,
} from './data/movement';
import { createBvhWorld } from './physics/bvhWorld';
import { wellForWorld } from './physics/gravity';
import { chooseSpawn, spawnOnGround } from './physics/spawn';
import { cameraPose } from './render/firstPersonCamera';
import { createStarfield } from './render/sky';
import { createStage } from './render/stage';
import { createDebugOverlay } from './ui/debugOverlay';
import { createPauseOverlay, isTouchDevice, type PauseOverlay } from './ui/pauseOverlay';
import { createTouchControls, type TouchControls } from './ui/touchControls';
import { loadWorld, type LoadedWorld } from './worlds/loadWorld';
import { WorldDataError } from './worlds/markers';
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

function createPlayer(world: LoadedWorld) {
  const home = wellForWorld(world.info);
  const collision = createBvhWorld(world.markers.colliders);
  const spawnMarker = chooseSpawn(world.markers.spawns);
  if (!spawnMarker) throw new WorldDataError(`${world.info.id} no tiene ningún SPAWN_`);
  const spawn = spawnOnGround(spawnMarker[1], collision, home.center);
  const wells = [home];
  return { home, wells, player: new Player(spawn, { wells, world: collision }, home) };
}

function createControls(
  canvas: HTMLCanvasElement,
  title: string,
  session: LoopSession,
): { input: InputController; overlay: PauseOverlay } {
  const input = new InputController(canvas);
  let touch: TouchControls | undefined;
  const overlay = createPauseOverlay(
    canvas,
    title,
    () => {
      input.reset();
      touch?.setVisible(overlay.playing);
    },
    {
      loops: () => session.director.loopsCompleted,
      onResetProgress: () => {
        session.resetProgress();
      },
    },
  );
  input.dragLookEnabled = () => overlay.dragLook;
  if (isTouchDevice()) {
    touch = createTouchControls(canvas, input, {
      isPlaying: () => overlay.playing,
      onPause: () => {
        overlay.pause();
      },
    });
    touch.setVisible(false);
  }
  return { input, overlay };
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

async function start(): Promise<void> {
  const canvas = requireElement('game', HTMLCanvasElement);
  const status = requireElement('status', HTMLParagraphElement);
  const { renderer, scene, camera, sun } = createStage(canvas);
  setupCamera(camera);
  watchGraphicsContext(canvas, status);

  const world = await loadWorld(worldFromQuery(window.location.search));
  scene.add(world.scene, createStarfield());
  const { home, wells, player } = createPlayer(world);

  const session = createLoopSession({
    scene,
    sun,
    worldId: world.info.id,
    baseRate: world.info.clockRate,
    triggers: world.markers.triggers,
    player,
    onRestart: () => {
      player.reset();
    },
  });
  const { input, overlay } = createControls(canvas, worldTitle(world.info.id), session);
  const debug = createDebugOverlay(world.info.id, home, wells, player, renderer, () =>
    session.snapshot(),
  );
  const physics = createFixedStep(
    { stepSeconds: PHYSICS_STEP, maxStepsPerFrame: MAX_PHYSICS_STEPS_PER_FRAME },
    (dt) => {
      const moving = overlay.playing && session.acceptsInput;
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
      if (overlay.playing && session.acceptsInput) {
        player.look(-look.x * MOUSE_LOOK_SENSITIVITY, -look.y * MOUSE_LOOK_SENSITIVITY);
      }
      session.update(dt, overlay.playing);
      // En pausa la física sigue (jugador quieto, se asienta en el suelo); el ciclo sí se detiene.
      const alpha = physics.advance(dt);
      player.interpolatedFeet(alpha, feet);
      player.interpolatedBody(alpha, body);
      cameraPose(body, player.pitch, feet, camera.position, camera.quaternion);
      camera.position.add(session.shake);
      debug.update(dt, overlay.playing);
    },
  );
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
