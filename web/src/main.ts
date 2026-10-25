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
import { gravityAt, wellForWorld } from './physics/gravity';
import { chooseSpawn, spawnOnGround } from './physics/spawn';
import { cameraPose } from './render/firstPersonCamera';
import { createStarfield } from './render/sky';
import { createStage } from './render/stage';
import { createDebugOverlay } from './ui/debugOverlay';
import { createPauseOverlay } from './ui/pauseOverlay';
import { loadWorld } from './worlds/loadWorld';
import { WorldDataError } from './worlds/markers';

const START_WORLD = 'umbral';
const NEAR_PLANE = 0.05;

/** "umbral" → "Umbral" (nombres provisionales de CONTEXTO_PLANETAS.md). */
function worldTitle(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

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

  const world = await loadWorld(START_WORLD);
  scene.add(world.scene, createStarfield());

  const home = wellForWorld(world.info);
  const collision = createBvhWorld(world.markers.colliders);
  const spawnMarker = chooseSpawn(world.markers.spawns);
  if (!spawnMarker) throw new WorldDataError(`${world.info.id} no tiene ningún SPAWN_`);
  const spawn = spawnOnGround(spawnMarker[1], collision, home.center);
  const player = new Player(spawn, { wells: [home], world: collision }, home);

  const input = new InputController(canvas);
  const overlay = createPauseOverlay(canvas, worldTitle(world.info.id), () => {
    input.reset();
  });
  input.dragLookEnabled = () => overlay.dragLook;
  const debug = createDebugOverlay(world.info.id, world.info.radius, player, renderer);
  const gravity = new Vector3();
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
    const g = gravityAt(player.state.position, [home], gravity).length();
    debug.update(dt, g, overlay.playing);
  });
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = 'No se pudo cargar el mundo. Revisa la consola.';
});
