// Los mundos, modelados por código (Fase 11, docs/plan-fase-11-modelado-por-codigo.md): sustituyen a los .glb que
// se exportaban de Blender, con la misma forma de escena.
import type { Group } from 'three';
import { buildArchivo } from './archivo';
import { buildCicatriz } from './cicatriz';
import { buildHogar } from './hogar';
import { buildPuertas } from './puertas';
import { buildLaboratorio } from './laboratorio';
import { buildLuna } from './luna';
import { buildObservatorio } from './observatorio';
import { buildTaller } from './taller';
import { buildUmbral } from './umbral';

const BUILDERS: ReadonlyMap<string, () => Group> = new Map([
  ['umbral', () => buildUmbral()],
  ['archivo', () => buildArchivo()],
  ['taller', () => buildTaller()],
  ['hogar', () => buildHogar()],
  ['cicatriz', () => buildCicatriz()],
  ['luna', () => buildLuna()],
  ['observatorio', () => buildObservatorio()],
  ['laboratorio', () => buildLaboratorio()],
  ['puertas', () => buildPuertas()],
]);

/** Si ese mundo se construye por código. */
export function isProceduralWorld(worldId: string): boolean {
  return BUILDERS.has(worldId);
}

/** La escena del mundo construida por código, o `undefined` si no hay ninguno con ese id. */
export function buildProceduralScene(worldId: string): Group | undefined {
  return BUILDERS.get(worldId)?.();
}
