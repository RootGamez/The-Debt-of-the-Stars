// Fase 1: escena mínima. Carga Umbral y lo muestra con cámara orbital.
import './style.css';
import { Timer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createStage } from './render/stage';
import { loadWorld } from './worlds/loadWorld';

const START_WORLD = 'umbral';
const WORLD_SPIN = 0.03; // rad/s, solo para la vista previa

function requireElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Falta el elemento #${id}`);
  return element;
}

async function start(): Promise<void> {
  const canvas = requireElement('game', HTMLCanvasElement);
  const status = requireElement('status', HTMLParagraphElement);
  const { renderer, scene, camera } = createStage(canvas);

  const world = await loadWorld(START_WORLD);
  scene.add(world.scene);

  const distance = world.info.radius * 3.2;
  camera.position.set(distance * 0.6, distance * 0.35, distance);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = world.info.radius * 1.3;
  controls.maxDistance = world.info.radius * 8;

  status.textContent =
    `${world.info.id} · radio ${world.info.radius} m · reloj ${world.info.clockRate.toFixed(2)}` +
    ` · ${world.markers.interactions.length} lecturas`;

  const timer = new Timer();
  timer.connect(document); // pausa el tiempo cuando la pestaña está oculta
  renderer.setAnimationLoop((time: number) => {
    timer.update(time);
    world.scene.rotation.y += WORLD_SPIN * timer.getDelta();
    controls.update();
    renderer.render(scene, camera);
  });
}

start().catch((error: unknown) => {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = 'No se pudo cargar el mundo. Revisa la consola.';
});
