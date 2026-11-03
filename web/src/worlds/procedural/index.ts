// Mundos que ya se modelan por código (Fase 11). Los demás siguen llegando como .glb exportado de Blender
// hasta que se migren (docs/plan-fase-11-modelado-por-codigo.md).
import type { Group } from 'three';
import { buildArchivo } from './archivo';
import { buildUmbral } from './umbral';

const BUILDERS: ReadonlyMap<string, () => Group> = new Map([
  ['umbral', () => buildUmbral()],
  ['archivo', () => buildArchivo()],
]);

/** Si ese mundo se construye por código. */
export function isProceduralWorld(worldId: string): boolean {
  return BUILDERS.has(worldId);
}

/** La escena del mundo construida por código (con la misma forma que la de un .glb), o `undefined`. */
export function buildProceduralScene(worldId: string): Group | undefined {
  return BUILDERS.get(worldId)?.();
}
