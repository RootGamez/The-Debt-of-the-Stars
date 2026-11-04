// El fondo del menú principal: la cámara pasea alrededor de los mundos (de lejos y rozando su superficie) con un
// fundido a negro entre plano y plano (`shots.ts`). Tiene su propio lienzo y su propio renderizador, que se libera al
// empezar a jugar. Los mundos se construyen uno a uno, en el corte, cuando la imagen está en negro.
import { Vector3, type Group } from 'three';
import { disposeWorld, buildWorld, type LoadedWorld } from '../worlds/loadWorld';
import { createStage, AMBIENT_COLOR, AMBIENT_INTENSITY } from '../render/stage';
import { createStarfield } from '../render/sky';
import { SHOTS, poseAt, showcaseState } from './shots';

export interface Showcase {
  dispose(): void;
}

/** Un fotograma largo (pestaña en segundo plano, mundo construyéndose) no debe saltarse medio plano. */
const MAX_FRAME_SECONDS = 0.1;
/** A dónde queda la luz respecto a la cámara: de lado y algo alta, para que se vea el relieve. */
const SUN_TURN = 0.5;
const SUN_LIFT = 0.35;
const SUN_DISTANCE = 3000;
/** En el menú todo se ve algo más claro que en el juego: la cara de noche también debe lucir. */
const AMBIENT_BOOST = 1.8;
/** Cuánto se corre la imagen a la derecha en pantallas apaisadas (fracción del ancho). */
const VIEW_SHIFT = 0.16;
/** Con «reducir movimiento» la cámara se queda quieta en mitad del plano. */
const STILL_PROGRESS = 0.5;

export function createShowcase(canvas: HTMLCanvasElement, cover: HTMLElement): Showcase {
  const stage = createStage(canvas);
  const stars = createStarfield();
  stage.scene.add(stars);
  const worlds = new Map<string, LoadedWorld | null>();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown: Group | undefined;
  let shownIndex = -1;
  let time = 0;
  let last = performance.now();

  /** El mundo de un plano, construido la primera vez; `null` si no se pudo (ese plano se queda en negro). */
  const worldFor = (id: string): LoadedWorld | null => {
    if (!worlds.has(id)) {
      try {
        worlds.set(id, buildWorld(id) ?? null);
      } catch {
        worlds.set(id, null);
      }
    }
    return worlds.get(id) ?? null;
  };

  const show = (world: LoadedWorld | null): void => {
    if (shown) stage.scene.remove(shown);
    shown = world?.scene;
    if (shown) stage.scene.add(shown);
    const ambient = world?.info.ambient;
    stage.ambient.color.setHex(ambient?.color ?? AMBIENT_COLOR);
    stage.ambient.intensity = (ambient?.intensity ?? AMBIENT_INTENSITY) * AMBIENT_BOOST;
  };

  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
    last = now;
    time += dt;
    const state = showcaseState(time);
    cover.style.opacity = String(state.fade);
    if (state.index !== shownIndex) {
      shownIndex = state.index;
      show(worldFor(state.shot.world));
    }
    const world = worlds.get(state.shot.world);
    if (world) {
      const pose = poseAt(
        state.shot,
        reduceMotion ? STILL_PROGRESS : state.progress,
        world.info.radius,
      );
      stage.camera.position.set(...pose.position);
      stage.camera.lookAt(new Vector3(...pose.target));
      // La luz gira con la cámara: siempre hay cara iluminada y sombra a la vista.
      const toSun = stage.camera.position
        .clone()
        .normalize()
        .applyAxisAngle(new Vector3(0, 1, 0), SUN_TURN);
      toSun.y += SUN_LIFT;
      stage.sun.position.copy(toSun.normalize().multiplyScalar(SUN_DISTANCE));
    }
    // El mundo se ve algo a la derecha, para que el título y los botones no lo tapen.
    const { clientWidth: width, clientHeight: height } = canvas;
    if (width > 0 && width > height) {
      stage.camera.setViewOffset(width, height, -width * VIEW_SHIFT, 0, width, height);
    } else stage.camera.clearViewOffset();
    stars.position.copy(stage.camera.position);
    stage.renderer.render(stage.scene, stage.camera);
  };

  stage.renderer.setAnimationLoop(frame);

  return {
    dispose() {
      stage.renderer.setAnimationLoop(null);
      for (const world of worlds.values()) if (world) disposeWorld(world.scene);
      stars.geometry.dispose();
      stage.dispose();
      stage.renderer.forceContextLoss();
    },
  };
}

/** Los mundos distintos que aparecen en el desfile (para precargar o para pruebas). */
export const SHOWCASE_WORLDS: readonly string[] = [...new Set(SHOTS.map((shot) => shot.world))];
