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
export function sunShadowSizeFromQuery(
  search: string,
  quality: Quality,
  softwareRenderer = false,
  preferred = 2048,
): number {
  const requested = new URLSearchParams(search).get('sombra')?.toLowerCase() ?? '';
  if (requested === 'no') return 0;
  const size = Number(requested);
  if (SHADOW_SIZES.includes(size)) return size;
  // Una GPU por software (o la de un portátil sin tarjeta) no aguanta los mapas: sin sombra salvo que se pida.
  // `preferred` es lo que el jugador eligió en Configuración (por defecto, el tamaño de la calidad alta).
  return quality === 'alta' && !softwareRenderer ? preferred : 0;
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** ¿El nombre del renderizador de WebGL es de una GPU por software? */
export function isSoftwareRenderer(name: string): boolean {
  return SOFTWARE_RENDERERS.test(name);
}
