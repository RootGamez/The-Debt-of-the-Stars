// Compilar antes de jugar los sombreadores de todo lo que hay en la escena (todos los mundos del sistema, la nave,
// el explorador): si no, cada material se compila la primera vez que se ve y el juego da un tirón al llegar a un
// mundo. Se hace bajo la pantalla de carga, por partes (los subárboles sin luces) para que la barra avance; con
// KHR_parallel_shader_compile no bloquea mientras tanto.
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import { nextFrame } from '../core/nextFrame';

/** Lo que se espera como mucho (ms): calentar es una ayuda, nunca debe dejar el juego sin empezar. */
const MAX_WAIT_MS = 30_000;

/** Cada cuánto (ms) se cede el paso al navegador entre parte y parte: que la barra se mueva sin perder tiempo. */
const YIELD_EVERY_MS = 50;

const hasLight = (root: Object3D): boolean => {
  let found = false;
  root.traverse((object) => {
    if ('isLight' in object && object.isLight === true) found = true;
  });
  return found;
};

/**
 * Las partes que se pueden compilar por separado: los subárboles sin luces. Una parte con luces dentro no: sola,
 * sus luces contarían dos veces y saldrían programas que luego no se usan; se baja a sus hijos y lo que quede
 * (la propia pieza, si tiene material) lo recoge la pasada final con la escena entera.
 */
function partsOf(root: Object3D): Object3D[] {
  return root.children.flatMap((child) => (hasLight(child) ? partsOf(child) : [child]));
}

async function compileAll(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const parts = partsOf(scene);
  const total = parts.length + 1;
  onProgress(0, total);
  let lastYield = performance.now();
  for (const [k, part] of parts.entries()) {
    // `compile` recorre todos los materiales, también los de lo que ahora está oculto (mundos lejanos, interiores);
    // las luces las toma de la escena entera, como al dibujar.
    await renderer.compileAsync(part, camera, scene);
    if (performance.now() - lastYield > YIELD_EVERY_MS) {
      onProgress(k + 1, total);
      await nextFrame();
      lastYield = performance.now();
    }
  }
  onProgress(parts.length, total);
  await renderer.compileAsync(scene, camera);
  onProgress(total, total);
}

export async function warmUpShaders(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  onProgress: (done: number, total: number) => void = () => undefined,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const giveUp = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, MAX_WAIT_MS);
  });
  try {
    await Promise.race([compileAll(renderer, scene, camera, onProgress), giveUp]);
  } catch (error: unknown) {
    console.warn('No se pudieron preparar los sombreadores antes de jugar.', error);
  } finally {
    clearTimeout(timer);
  }
}
