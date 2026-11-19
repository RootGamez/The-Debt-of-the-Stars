// Los mundos, modelados por código (Fase 11, docs/plan-fase-11-modelado-por-codigo.md): sustituyen a los .glb que
// se exportaban de Blender, con la misma forma de escena.
import type { Group } from 'three';
import { WorldDataError } from '../markers';
import { buildAnclaje } from './anclaje';
import { buildArchivo } from './archivo';
import { buildCicatriz } from './cicatriz';
import { buildHogar } from './hogar';
import { hogarEra } from './hogarLaterShape';
import { buildPuertas } from './puertas';
import { buildLaboratorio } from './laboratorio';
import { buildLuna } from './luna';
import { buildObservatorio } from './observatorio';
import { buildTaller } from './taller';
import { buildUmbral } from './umbral';

/** Un constructor recibe la variante pedida (solo Hogar tiene: la de diez años después, F5). */
type Builder = (variant: string | undefined) => Group;

/** Un mundo sin variantes: pedirle una es un error. */
function plain(build: () => Group, id: string): Builder {
  return (variant) => {
    if (variant !== undefined) throw new WorldDataError(`${id} no tiene la variante «${variant}»`);
    return build();
  };
}

const BUILDERS: ReadonlyMap<string, Builder> = new Map<string, Builder>([
  ['umbral', plain(() => buildUmbral(), 'umbral')],
  ['archivo', plain(() => buildArchivo(), 'archivo')],
  ['taller', plain(() => buildTaller(), 'taller')],
  ['hogar', (variant) => buildHogar({ era: hogarEra(variant) })],
  ['cicatriz', plain(() => buildCicatriz(), 'cicatriz')],
  ['luna', plain(() => buildLuna(), 'luna')],
  ['observatorio', plain(() => buildObservatorio(), 'observatorio')],
  ['laboratorio', plain(() => buildLaboratorio(), 'laboratorio')],
  ['puertas', plain(() => buildPuertas(), 'puertas')],
  ['anclaje_norte', plain(() => buildAnclaje('norte'), 'anclaje_norte')],
  ['anclaje_sur', plain(() => buildAnclaje('sur'), 'anclaje_sur')],
]);

/** Si ese mundo se construye por código. */
export function isProceduralWorld(worldId: string): boolean {
  return BUILDERS.has(worldId);
}

/** La escena del mundo construida por código (con su variante, si la tiene), o `undefined` si no hay ese id. */
export function buildProceduralScene(worldId: string, variant?: string): Group | undefined {
  return BUILDERS.get(worldId)?.(variant);
}
