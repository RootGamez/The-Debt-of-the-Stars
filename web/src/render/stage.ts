// Escenario básico: renderizador, cámara, luz de la Brasa y ajuste al tamaño de la ventana.
import {
  ACESFilmicToneMapping,
  Color,
  AmbientLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

/** La Brasa: enana naranja vieja, luz cálida y débil (CONTEXTO_PLANETAS.md). */
const BRASA_COLOR = 0xffb070;
const BRASA_INTENSITY = 2.2;
const SKY_COLOR = 0x07070c;
/**
 * Luz ambiente: en planetas esféricos no hay un "arriba" común (una luz hemisférica iluminaría según
 * el eje Y del mundo), así que es uniforme. Lo justo para que la cara de noche y lo que está a
 * contraluz se lean, sin quitarle protagonismo a la Brasa.
 */
export const AMBIENT_COLOR = 0x7a6a8c;
export const AMBIENT_INTENSITY = 1.0;
const MAX_PIXEL_RATIO = 1.5;

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** La Brasa: luz puntual sin caída con la distancia, para que cada mundo se ilumine desde donde está. */
  sun: PointLight;
  /** Luz ambiente: cada mundo puede tener la suya (ver `WorldInfo.ambient`). */
  ambient: AmbientLight;
  /** Deja de observar el tamaño y libera el contexto WebGL. */
  dispose(): void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  scene.background = new Color(SKY_COLOR);

  const camera = new PerspectiveCamera(50, 1, 0.1, 8000);

  // Sin caída (decay 0): todos los mundos reciben la misma luz y solo cambia la dirección. Si el mundo
  // no pertenece a un sistema, queda lejos y arriba, como una luz direccional.
  const sun = new PointLight(BRASA_COLOR, BRASA_INTENSITY, 0, 0);
  sun.position.set(3000, 1500, 2000);
  const ambient = new AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);
  scene.add(sun, ambient);

  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  // ResizeObserver también detecta cambios de tamaño por el layout, no solo de la ventana.
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const dispose = (): void => {
    observer.disconnect();
    renderer.setAnimationLoop(null);
    renderer.dispose();
  };

  return { renderer, scene, camera, sun, ambient, dispose };
}
