// Escenario básico: renderizador, cámara, luz de la Brasa y ajuste al tamaño de la ventana.
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

/** La Brasa: enana naranja vieja, luz cálida y débil (CONTEXTO_PLANETAS.md). */
const BRASA_COLOR = 0xffb070;
const BRASA_INTENSITY = 2.2;
const SKY_COLOR = 0x07070c;
const MAX_PIXEL_RATIO = 1.5;

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  sun: DirectionalLight;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  scene.background = new Color(SKY_COLOR);

  const camera = new PerspectiveCamera(50, 1, 0.1, 5000);

  const sun = new DirectionalLight(BRASA_COLOR, BRASA_INTENSITY);
  sun.position.set(300, 150, 200);
  scene.add(sun, new HemisphereLight(0x8a7aa0, 0x1a1418, 0.35));

  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, sun };
}
