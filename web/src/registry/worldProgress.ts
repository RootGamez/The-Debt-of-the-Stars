// Lo que queda por leer en cada mundo (plan de la llegada, hito C; D5 y D6 ✅ Anthony 2026-11-06): cuenta cada fuente
// del mundo abierta al menos una vez (también las de ambiente y los eventos presenciados). Lógica pura: el cuaderno
// solo pinta la nota a mano.
import { t } from '../i18n';
import type { Clues } from './clues';

export interface WorldProgress {
  opened: number;
  total: number;
}

/** Por mundo: cuántas de sus fuentes se han abierto y cuántas tiene. */
export function worldProgress(
  clues: Clues,
  opened: ReadonlySet<string>,
): ReadonlyMap<string, WorldProgress> {
  const progress = new Map<string, WorldProgress>();
  for (const source of clues.sources) {
    const now = progress.get(source.world) ?? { opened: 0, total: 0 };
    progress.set(source.world, {
      opened: now.opened + (opened.has(source.id) ? 1 : 0),
      total: now.total + 1,
    });
  }
  return progress;
}

/** La nota a mano de la página del mundo (nada si allí no hay nada que leer). */
export function progressNote(progress: WorldProgress | undefined): string | undefined {
  if (!progress || progress.total === 0) return undefined;
  return progress.opened >= progress.total
    ? t('Aquí ya lo he leído todo')
    : t('Aún queda algo por leer aquí');
}
