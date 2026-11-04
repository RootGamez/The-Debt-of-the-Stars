// El desfile de mundos del menú principal: cada plano es un paseo lento de la cámara alrededor de un mundo (de lejos,
// entero, o rozando su superficie) y entre plano y plano la imagen se funde a negro. Aquí solo hay lógica pura.

export interface Shot {
  /** El mundo que se ve (debe construirse por código: `worlds/procedural`). */
  world: string;
  /** Distancia de la cámara al centro, en radios del mundo. */
  distance: number;
  /** Rumbo (radianes) de la cámara alrededor del mundo, al empezar y al acabar el plano. */
  azimuth: readonly [number, number];
  /** Altura sobre el ecuador (radianes), al empezar y al acabar. */
  elevation: readonly [number, number];
  /** 0: mira al centro del mundo; 1: mira a un punto de su superficie, al lado de donde está la cámara. */
  aim: number;
  seconds: number;
}

/** Lo que se tarda en fundir a negro (y en volver) en cada corte. */
export const FADE_SECONDS = 1.1;

/** Intercalados para que dos planos seguidos nunca sean del mismo mundo. */
export const SHOTS: readonly Shot[] = [
  {
    world: 'hogar',
    distance: 3.2,
    azimuth: [0.2, 1.3],
    elevation: [0.25, 0.45],
    aim: 0,
    seconds: 9,
  },
  {
    world: 'umbral',
    distance: 1.3,
    azimuth: [2.0, 2.8],
    elevation: [0.55, 0.38],
    aim: 1,
    seconds: 8,
  },
  {
    world: 'archivo',
    distance: 3.0,
    azimuth: [4.0, 5.0],
    elevation: [0.12, 0.3],
    aim: 0,
    seconds: 9,
  },
  {
    world: 'taller',
    distance: 1.9,
    azimuth: [1.0, 1.9],
    elevation: [0.3, 0.15],
    aim: 0.6,
    seconds: 8,
  },
  {
    world: 'hogar',
    distance: 1.3,
    azimuth: [3.0, 3.8],
    elevation: [0.5, 0.36],
    aim: 1,
    seconds: 8,
  },
  {
    world: 'archivo',
    distance: 1.22,
    azimuth: [0.5, 1.2],
    elevation: [0.4, 0.28],
    aim: 1,
    seconds: 8,
  },
  {
    world: 'taller',
    distance: 3.3,
    azimuth: [5.2, 6.3],
    elevation: [0.1, 0.35],
    aim: 0,
    seconds: 9,
  },
  {
    world: 'umbral',
    distance: 3.4,
    azimuth: [3.4, 4.5],
    elevation: [0.5, 0.2],
    aim: 0,
    seconds: 9,
  },
];

export interface ShowcaseState {
  index: number;
  shot: Shot;
  /** 0 al empezar el plano y 1 al acabar. */
  progress: number;
  /** Cuánto negro cubre la imagen (1 en el corte, 0 en medio del plano). */
  fade: number;
}

export function totalSeconds(shots: readonly Shot[]): number {
  return shots.reduce((sum, shot) => sum + shot.seconds, 0);
}

/** Qué plano se ve en el segundo `time` (el desfile se repite sin fin). */
export function showcaseState(time: number, shots: readonly Shot[] = SHOTS): ShowcaseState {
  const first = shots[0];
  if (!first) throw new Error('El desfile no tiene planos');
  let local = ((time % totalSeconds(shots)) + totalSeconds(shots)) % totalSeconds(shots);
  for (const [index, shot] of shots.entries()) {
    if (local < shot.seconds) {
      const fade = Math.max(1 - local / FADE_SECONDS, 1 - (shot.seconds - local) / FADE_SECONDS, 0);
      return { index, shot, progress: local / shot.seconds, fade };
    }
    local -= shot.seconds;
  }
  return { index: 0, shot: first, progress: 0, fade: 1 };
}

const lerp = (pair: readonly [number, number], t: number): number =>
  pair[0] + (pair[1] - pair[0]) * t;

export interface CameraPose {
  /** Posición de la cámara respecto al centro del mundo. */
  position: [number, number, number];
  /** A dónde mira, respecto al centro del mundo. */
  target: [number, number, number];
}

/** Dirección unitaria a partir de rumbo y altura. */
function direction(azimuth: number, elevation: number): [number, number, number] {
  const flat = Math.cos(elevation);
  return [flat * Math.cos(azimuth), Math.sin(elevation), flat * Math.sin(azimuth)];
}

/** La cámara de un plano en un momento dado, para un mundo de ese radio. */
export function poseAt(shot: Shot, progress: number, radius: number): CameraPose {
  const azimuth = lerp(shot.azimuth, progress);
  const elevation = lerp(shot.elevation, progress);
  const [x, y, z] = direction(azimuth, elevation);
  const distance = shot.distance * radius;
  // Se mira un poco hacia delante del rumbo, y más abajo, para ver la superficie pasar.
  const [tx, ty, tz] = direction(azimuth + 0.3, elevation - 0.15);
  const aimed = shot.aim * radius;
  return {
    position: [x * distance, y * distance, z * distance],
    target: [tx * aimed, ty * aimed, tz * aimed],
  };
}
