// La dirección de la Brasa en el marco de un mundo con la rotación bloqueada (siempre la misma cara), como la
// tienen Umbral y el Archivo en sistema.json. Sirve para la luz de cielo de los materiales.
import { Vector3, type Object3D, type PointLight } from 'three';
import systemData from '../../data/sistema.json';
import { parseSystem } from '../../system/systemData';
import { WORLD_IDS } from '../worldSelection';

/** En el marco de Blender (Z arriba). */
export function sunInWorld(worldId: string): Vector3 {
  const body = parseSystem(systemData, WORLD_IDS).bodyOf(worldId);
  const c = body?.spinPhase ?? 0;
  // En glTF (Y arriba) la Brasa queda en (−cos c, 0, −sin c); en el marco de Blender, (−cos c, sin c, 0).
  return new Vector3(-Math.cos(c), Math.sin(c), 0);
}

const sunLight = new Vector3();

/**
 * Para los mundos que giran sobre sí mismos (el Taller): la Brasa no está quieta en su marco, así que antes de
 * dibujar `object` (que cuelga del marco del mundo, con su centro en el origen) se busca la luz de la Brasa en la
 * escena y se copia su dirección, en el marco de Blender, en cada vector de `targets` (los uniformes de luz).
 */
export function followSun(object: Object3D, targets: readonly Vector3[]): void {
  let light: PointLight | undefined;
  const before = object.onBeforeRender.bind(object);
  object.frustumCulled = false; // si no se dibuja, la luz del resto se quedaría atrás
  object.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    light ??= findPointLight(scene);
    if (light) {
      object.worldToLocal(sunLight.setFromMatrixPosition(light.matrixWorld));
      if (sunLight.lengthSq() > 0) {
        sunLight.normalize();
        for (const target of targets) target.copy(sunLight);
      }
    }
    before(renderer, scene, camera, geometry, material, group);
  };
}

function findPointLight(scene: Object3D): PointLight | undefined {
  let found: PointLight | undefined;
  scene.traverse((child) => {
    if (!found && (child as PointLight).isPointLight) found = child as PointLight;
  });
  return found;
}
