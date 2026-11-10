// La calidad gráfica. Por defecto alta; `?calidad=baja` quita lo caro para equipos modestos (hoy, que las
// estrellas se doblen alrededor del Nudo y del agujero negro).

export type Quality = 'alta' | 'baja';

export function qualityFromQuery(search: string): Quality {
  const requested = new URLSearchParams(search).get('calidad')?.toLowerCase() ?? '';
  return requested === 'baja' ? 'baja' : 'alta';
}

const SHADOW_SIZES: readonly number[] = [512, 1024, 2048, 4096];

/**
 * Tamaño del mapa de la sombra de la estrella (0 = sin sombra). Por defecto 2048 en calidad alta y ninguna en
 * baja; `?sombra=1024` (512, 1024, 2048, 4096) lo elige y `?sombra=no` la apaga.
 */
export function sunShadowSizeFromQuery(search: string, quality: Quality): number {
  const requested = new URLSearchParams(search).get('sombra')?.toLowerCase() ?? '';
  if (requested === 'no') return 0;
  const size = Number(requested);
  if (SHADOW_SIZES.includes(size)) return size;
  return quality === 'alta' ? 2048 : 0;
}
