// La dirección de la Brasa en el marco de un mundo con la rotación bloqueada (siempre la misma cara), como la
// tienen Umbral y el Archivo en sistema.json. Sirve para la luz de cielo de los materiales.
import { Vector3 } from 'three';
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
