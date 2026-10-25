// Fase 2: caminar en primera persona sobre un mundo.
// Cargar mundo → colisiones → aparición → bucle de paso fijo (entrada → física → cámara → render).
import './style.css';
import { Quaternion, Timer, Vector3 } from 'three';
import { createFixedStep } from './core/fixedStep';
import { IDLE_INTENT, InputController } from './core/inputController';
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
import { createPauseOverlay, isTouchDevice } from './ui/pauseOverlay';
import { createTouchControls, type TouchControls } from './ui/touchControls';
import { loadWorld } from './worlds/loadWorld';
import { WorldDataError } from './worlds/markers';
import { worldFromQuery, worldTitle } from './worlds/worldSelection';

const NEAR_PLANE = 0.05;

function requireElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Falta el elemento #${id}`);
  return element;
}

async function start(): Promise<void> {
  const canvas = requireElement('game', HTMLCanvasElement);
  const status = requireElement('status', HTMLParagraphElement);
  const { renderer, scene, camera } = createStage(canvas);
  camera.fov = FIELD_OF_VIEW;
  camera.near = NEAR_PLANE;
  camera.updateProjectionMatrix();

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); // permite que el navegador restaure el contexto
    status.textContent = 'Se perdió el contexto gráfico; intentando recuperarlo…';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    status.textContent = '';
  });

  const world = await loadWorld(worldFromQuery(window.location.search));
  scene.add(world.scene, createStarfield());

  const home = wellForWorld(world.info);
  const collision = createBvhWorld(world.markers.colliders);
  const spawnMarker = chooseSpawn(world.markers.spawns);
  if (!spawnMarker) throw new WorldDataError(`${world.info.id} no tiene ningún SPAWN_`);
  const spawn = spawnOnGround(spawnMarker[1], collision, home.center);
  const wells = [home];
  const player = new Player(spawn, { wells, world: collision }, home);

  const input = new InputController(canvas);
  let touch: TouchControls | undefined;
  const overlay = createPauseOverlay(canvas, worldTitle(world.info.id), () => {
    input.reset();
    touch?.setVisible(overlay.playing);
  });
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
  const debug = createDebugOverlay(world.info.id, home, wells, player, renderer);
  const physics = createFixedStep(
    { stepSeconds: PHYSICS_STEP, maxStepsPerFrame: MAX_PHYSICS_STEPS_PER_FRAME },
    (dt) => {
      player.step(overlay.playing ? input.intent() : IDLE_INTENT, dt);
    },
  );
  status.textContent = '';

  const feet = new Vector3();
  const body = new Quaternion();
  const timer = new Timer();
  timer.connect(document); // pausa el tiempo cuando la pestaña está oculta
  renderer.setAnimationLoop((time: number) => {
    timer.update(time);
    const look = input.consumeLook();
    if (overlay.playing) {
      player.look(-look.x * MOUSE_LOOK_SENSITIVITY, -look.y * MOUSE_LOOK_SENSITIVITY);
    }
    const dt = timer.getDelta();
    const alpha = physics.advance(dt);
    player.interpolatedFeet(alpha, feet);
    player.interpolatedBody(alpha, body);
    cameraPose(body, player.pitch, feet, camera.position, camera.quaternion);
    renderer.render(scene, camera);
    debug.update(dt, overlay.playing);
  });
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = 'No se pudo cargar el mundo. Revisa la consola.';
});
