// La Boca de Umbral contestando la llamada (plan de los finales, F2): a las 10:00, en el anillo, una esfera de agujero de
// gusano (render/wormholeSphere.ts, como todo portal del juego) con el cielo azul de Hogar en el centro. Cuándo está
// abierta y cuándo se cruza, en game/bocaCall.ts.
import { Vector3, type Object3D } from 'three';
import { createWormholeSphere } from './wormholeSphere';

/** El azul del cielo de Hogar (el color del otro lado). */
const HOME_SKY = 0x6fb4ff;
/** Radio de la esfera (m): llena el anillo de La Boca (el hueco mide unos 3 m). */
const RADIUS = 2.4;
/** Segundos que tarda en abrirse o cerrarse del todo. */
const FADE = 1.5;

export interface BocaCallView {
  /** Una vez por fotograma: si debe estar abierta, segundos reales y segundos que pasaron desde el anterior. */
  update(open: boolean, time: number, dt: number): void;
  /** Dónde está su centro (en la escena). */
  worldCenter(target: Vector3): Vector3;
  dispose(): void;
}

/** La esfera de La Boca colgada de `world`, en `center` (marco del mundo), cerrada hasta que haga falta. */
export function createBocaCallView(world: Object3D, center: Vector3): BocaCallView {
  const sphere = createWormholeSphere(HOME_SKY);
  sphere.root.name = 'LaBoca_Llamada';
  sphere.root.scale.setScalar(RADIUS);
  sphere.root.position.copy(center);
  sphere.root.visible = false;
  sphere.open.value = 0;
  world.add(sphere.root);
  return {
    update(open, time, dt) {
      sphere.time.value = time;
      const step = dt / FADE;
      const next = sphere.open.value + (open ? step : -step);
      sphere.open.value = Math.min(1, Math.max(0, next));
      sphere.root.visible = sphere.open.value > 0;
    },
    worldCenter(target) {
      return sphere.root.getWorldPosition(target);
    },
    dispose() {
      sphere.dispose();
    },
  };
}
