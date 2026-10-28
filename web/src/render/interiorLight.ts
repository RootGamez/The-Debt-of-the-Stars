// La luz de dentro de un mundo hueco (el Nudo): mientras estás en la cavidad, la cáscara tapa la Brasa, así
// que su luz se apaga y luce la semilla del centro. Una sola luz por mundo hueco, colgada del propio mundo
// (se mueve con él) y encendida solo cuando estás dentro.
import { PointLight, type Light } from 'three';
import type { WorldRuntime } from '../worlds/worldRuntime';

export interface InteriorLights {
  /** Una vez por fotograma: en qué mundo estás y si estás dentro de su cavidad. */
  update(worldId: string, inside: boolean): void;
  dispose(): void;
}

export function createInteriorLights(
  runtimes: ReadonlyMap<string, WorldRuntime>,
  sun: Light,
): InteriorLights {
  const lights = new Map<string, PointLight>();
  for (const [id, runtime] of runtimes) {
    const glow = runtime.world.info.interiorLight;
    if (!glow) continue;
    // Sin caída con la distancia, como un cielo pequeño. Un poco apartada del centro: si estuviera justo en
    // él, todas las caras de la esfera la recibirían de frente y la cara interior se vería lisa.
    const light = new PointLight(glow.color, glow.intensity, 0, 0);
    light.position.set(0.3, 0.45, 0.2).multiplyScalar(runtime.world.info.innerRadius ?? 0);
    light.name = `${id}: luz de la semilla`;
    light.visible = false;
    runtime.world.scene.add(light);
    lights.set(id, light);
  }
  let wasInside = false;

  return {
    update(worldId, inside) {
      if (inside === wasInside && !inside) return; // fuera de todo: nada que tocar cada fotograma
      wasInside = inside;
      for (const [id, light] of lights) light.visible = inside && id === worldId;
      sun.visible = !inside;
    },
    dispose() {
      for (const light of lights.values()) light.removeFromParent();
      sun.visible = true;
    },
  };
}
