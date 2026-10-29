// La calidad gráfica. Por defecto alta; `?calidad=baja` quita lo caro para equipos modestos (hoy, que las
// estrellas se doblen alrededor del Nudo y del agujero negro).

export type Quality = 'alta' | 'baja';

export function qualityFromQuery(search: string): Quality {
  const requested = new URLSearchParams(search).get('calidad')?.toLowerCase() ?? '';
  return requested === 'baja' ? 'baja' : 'alta';
}
