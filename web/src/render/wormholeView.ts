// La apertura del gusano junto al fragmento de la Luna (Fase 9E, 🟡): una esfera de agujero de gusano (la misma de
// todos los portales del juego: render/wormholeSphere.ts) que se abre sobre el fragmento y crece hasta cubrir la
// nave. Cuelga de la Luna, así que sigue en su sitio aunque cambie el marco de la escena. Da a la lente del cielo un
// "peso" que crece (las estrellas se doblan alrededor) y cuánto se estira la vista. Los tiempos y tamaños, en
// game/wormhole.ts.
import { Vector3, type Object3D } from 'three';
import { lensRadius, ringRadius, viewStretch, wormholeProgress } from '../game/wormhole';
import { createWormholeSphere } from './wormholeSphere';

export interface WormholeView {
  /** Abre el gusano colgado de `parent` (el mundo), en `center` (en su marco). */
  start(parent: Object3D, center: Vector3): void;
  /** `dt`: segundos de juego (0 en pausa); `eye`: dónde está quien mira (en la escena). */
  update(dt: number, eye: Vector3): void;
  /** Ya se ha abierto (y sigue abierto hasta que el fundido se lleva al jugador). */
  readonly active: boolean;
  /** Avance de la apertura (0–1); a 1 ha terminado. */
  readonly progress: number;
  /** Cuánto se ensancha la vista ahora (fracción). */
  readonly stretch: number;
  /** Lo que la lente del cielo debe doblar (en la escena), si está abierto. */
  lens(): { position: Vector3; radius: number } | undefined;
  dispose(): void;
}

export function createWormholeView(): WormholeView {
  const sphere = createWormholeSphere(0xffe2b0);
  const root = sphere.root;
  root.name = 'Gusano';
  root.visible = false;
  sphere.open.value = 0;
  const lensOut = { position: new Vector3(), radius: 0 };
  let elapsed = 0;
  let active = false;
  let progress = 0;

  return {
    start(parent, center) {
      if (active) return;
      active = true;
      elapsed = 0;
      root.position.copy(center);
      root.visible = true;
      parent.add(root);
    },
    update(dt) {
      if (!active) return;
      elapsed += dt;
      sphere.time.value += dt;
      progress = wormholeProgress(elapsed);
      root.scale.setScalar(Math.max(1e-3, ringRadius(progress)));
      sphere.open.value = Math.min(1, progress * 4);
    },
    get active() {
      return active;
    },
    get progress() {
      return progress;
    },
    get stretch() {
      return active ? viewStretch(progress) : 0;
    },
    lens() {
      if (!active) return undefined;
      root.getWorldPosition(lensOut.position);
      lensOut.radius = lensRadius(progress);
      return lensOut.radius > 0 ? lensOut : undefined;
    },
    dispose() {
      sphere.dispose();
    },
  };
}
