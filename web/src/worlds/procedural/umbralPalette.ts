// Los colores de Umbral (CONTEXTO_PLANETAS.md §3, «Atmósfera»): arenisca, ocre, pizarra, violeta, hielo y ámbar.

export const PALETTE = {
  sandstone: '#D8C49A',
  sandstoneLight: '#E6D7B2',
  sandstoneShade: '#B8A27A',
  deepSand: '#C2AA80',
  pathSand: '#B49A72',
  rock: '#7A6A5E',
  rockLight: '#968270',
  rockDark: '#5C4E46',
  ochre: '#B87A3A',
  ochreLight: '#C99B5E',
  amber: '#E0A040',
  slate: '#3A3A48',
  slateLight: '#4C4C5C',
  violet: '#3A2850',
  porcelain: '#E8E0D0',
  bread: '#C88A40',
  fruit: '#A04030',
  paper: '#EDE4CC',
  cloth: '#6A4A5A',
  ice: '#A8D0E8',
  iceLight: '#D4E9F3',
  tuft: '#B89650',
  tuftDry: '#9C7E48',
  light: '#FFC070',
  /** Remates de los edificios cerrados (plan de la llegada, hito D): cobre y su óxido verde. */
  copper: '#A8653A',
  verdigris: '#5E9A86',
  /** Pilotos de los aparatos en espera. */
  standby: '#FFB45A',
} as const;
/** Estratos de las mesas de roca, de abajo arriba. */
export const STRATA = ['#C9A57A', '#B48A62', '#D6BA8E', '#A47A56', '#C2966C', '#9A7458'] as const;
