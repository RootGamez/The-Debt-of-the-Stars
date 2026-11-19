// La escena del final bueno (F3; plan de finales §4.4): los dos Ausentes sentados en el banco de las dos tazas del
// Mirador del Ocaso de Umbral, frente a la Brasa en su ocaso que no termina, con el agujero estable en el cielo, un
// punto quieto. Aquí está el guion (puro): planos, frases, gestos, luz y música; lo reproduce game/miradorRig.ts con el
// director de cinemáticas (cinematic/). Se llega en negro tras la Maestra (`?mundo=umbral&escena=mirador`) y acaba en
// la tarjeta del final A.
//
// Coordenadas: las del ancla `umbral_Mirador` (worlds/procedural/umbral.ts): el centro de la cara de arriba del
// asiento, X a la derecha, +Y hacia la Brasa (que está unos 2° sobre el horizonte) y Z arriba; la plataforma, a
// −MIRADOR_SEAT_TOP. Ella se sienta a la izquierda (−X) y él a la derecha.
//
// 🟡 Todo es borrador (Claude, a la espera de Anthony): el guion, las frases y su ritmo. Tono de la biblia: el cariño
// va en las cosas (la taza, el contar, la tarde); ella no recuerda los ciclos y él sí.
import type { CameraKey, Vec3 } from '../cinematic/cameraTrack';
import {
  trackValue,
  type Cinematic,
  type Line,
  type ScalarKey,
  type Shot,
} from '../cinematic/timeline';
import { NEUTRAL_GESTURE, type SeatedGesture } from '../character/absentGestures';
import type { AbsentWho } from '../character/absentSkeleton';
import { t } from '../i18n';
import { DEFAULT_WORLD, MIRADOR_SCENE, SCENE_PARAM } from '../worlds/worldSelection';

export const MIRADOR_CINEMATIC_ID = 'mirador';
/** 🟡 El momento del sistema en la escena: Cicatriz, con el agujero dentro, alto sobre la Brasa. */
export const MIRADOR_SYSTEM_TIME = 705;
/** Segundos en negro antes de empezar (la página acaba de cargar). */
export const MIRADOR_PREROLL = 2;
/** La música: la pieza de Umbral (piano y cuerdas) y, en el último plano, el tema principal. */
export const MIRADOR_MUSIC = { scene: 'music.umbral', end: 'music.main' } as const;

/** Dónde se sienta cada uno (el origen del cuerpo, en la plataforma bajo las caderas). */
export const SEATS: Readonly<Record<AbsentWho, { x: number; y: number }>> = {
  cientifica: { x: -0.42, y: -0.12 },
  esceptico: { x: 0.52, y: -0.12 },
};
/** La taza de ella, olvidada en el banco a su izquierda (la de él la lleva él en las manos). */
export const HER_CUP: Vec3 = [-0.95, 0.06, 0];

/**
 * La escena solo se ve con `?mundo=umbral&escena=mirador` y el final A guardado (o con `?debug`, para probarla): la
 * dirección no basta para saltarse el juego.
 */
export function miradorRequested(
  search: string,
  endingsSeen: readonly string[],
  debug: boolean,
): boolean {
  const params = new URLSearchParams(search);
  if (params.get(SCENE_PARAM) !== MIRADOR_SCENE) return false;
  if (params.get('mundo')?.toLowerCase() !== DEFAULT_WORLD) return false;
  return debug || endingsSeen.includes('A');
}

// ---- El guion ------------------------------------------------------------------------------------------------

type GestureField = keyof SeatedGesture;

/** El nombre de la pista de un gesto: `cientifica.look`, `esceptico.hold`… */
export function gestureTrack(who: AbsentWho, field: GestureField): string {
  return `${who}.${field}`;
}

export const GESTURE_FIELDS = Object.keys(NEUTRAL_GESTURE) as readonly GestureField[];

const keys = (...pairs: (readonly [number, number])[]): ScalarKey[] =>
  pairs.map(([time, value]) => ({ t: time, v: value }));

const along = (from: Vec3, direction: Vec3, distance: number): Vec3 => [
  from[0] + direction[0] * distance,
  from[1] + direction[1] * distance,
  from[2] + direction[2] * distance,
];

/** Lejos en el horizonte, hacia la Brasa (a 30 m sube algo más de 1 m: está unos 2° alta). */
const toward = (x: number, z: number): Vec3 => [x, 30, z];

function shot(
  id: string,
  start: number,
  end: number,
  frames: readonly CameraKey[],
  extra: Partial<Shot> = {},
): Shot {
  return { id, start, end, keys: frames, ...extra };
}

/** Los planos. `point` es la dirección del punto quieto (unitaria) vista desde el banco. */
function shots(point: Vec3): Shot[] {
  const skyFrom: Vec3 = [-2.6, -12.5, 4.0];
  const skyTo: Vec3 = [-1.4, -9.2, 2.6];
  const lowFrom: Vec3 = [-0.35, -2.9, 0.55];
  const lowTo: Vec3 = [-0.3, -2.4, 0.6];
  return [
    // A · El cielo: el punto quieto solo, de cerca (tele); la vista baja y se abre hasta la Brasa y el Mirador.
    shot(
      'cielo',
      0,
      17,
      [
        { t: 0, pos: skyFrom, look: along(skyFrom, point, 60), fov: 24 },
        { t: 17, pos: skyTo, look: toward(0.4, 2.2), fov: 40 },
      ],
      { ease: 'smooth' },
    ),
    // B · Por la espalda: las dos siluetas y la Brasa entre las dos cabezas.
    shot('espalda', 17, 34, [
      { t: 0, pos: [-0.12, -6.2, 0.95], look: toward(-0.12, 2.1), fov: 36 },
      { t: 17, pos: [-0.1, -3.5, 0.92], look: toward(-0.1, 2.05), fov: 34 },
    ]),
    // C · En tres cuartos desde el lado de ella: las dos caras con la luz de la Brasa y la noche detrás.
    shot('perfil', 34, 56, [
      { t: 0, pos: [-2.8, 2.65, 0.84], look: [0.05, -0.05, 0.96], fov: 34 },
      { t: 22, pos: [-2.55, 2.4, 0.86], look: [0.05, -0.05, 0.96], fov: 33 },
    ]),
    // D · Las manos de él y la taza, de cerca, con la luz baja en la porcelana.
    shot('manos', 56, 68, [
      { t: 0, pos: [1.12, 1.28, 0.95], look: [0.52, 0.36, 0.72], fov: 28 },
      { t: 12, pos: [1.0, 1.15, 0.91], look: [0.52, 0.36, 0.72], fov: 26 },
    ]),
    // E · Ella en tres cuartos, de cerca: mira arriba, al punto (detrás de la cámara), con la noche detrás.
    shot('ella', 68, 85, [
      { t: 0, pos: [-1.75, 1.85, 0.98], look: [-0.42, -0.1, 1.16], fov: 34 },
      { t: 17, pos: [-1.6, 1.68, 1.0], look: [-0.42, -0.1, 1.18], fov: 33 },
    ]),
    // F · Desde abajo, por detrás: las dos cabezas al pie del cuadro y el punto en el cielo.
    shot('arriba', 85, 96, [
      { t: 0, pos: lowFrom, look: along(lowFrom, point, 40), fov: 52 },
      { t: 11, pos: lowTo, look: along(lowTo, point, 40), fov: 50 },
    ]),
    // G · De frente, iluminados por la Brasa, con la noche detrás.
    shot('frente', 96, 112, [
      { t: 0, pos: [-0.02, 3.6, 0.95], look: [0.05, -0.1, 1.0], fov: 36 },
      { t: 16, pos: [-0.02, 3.25, 0.95], look: [0.05, -0.1, 1.0], fov: 35 },
    ]),
    // H · Final: la cámara se aparta y sube por detrás; los dos pequeños frente a la Brasa, el punto arriba.
    shot(
      'final',
      112,
      130,
      [
        { t: 0, pos: [0.3, -2.6, 1.25], look: toward(0.05, 2.3), fov: 40 },
        { t: 13, pos: [-0.9, -9.5, 2.9], look: toward(0.3, 5.0), fov: 49 },
        { t: 18, pos: [-1.0, -10.0, 3.0], look: toward(0.3, 5.1), fov: 50 },
      ],
      { ease: 'smooth' },
    ),
  ];
}

function lines(): Line[] {
  const her = 'cientifica';
  const him = 'esceptico';
  return [
    { start: 38, end: 42.5, speaker: him, text: t('Ya no cuento.') },
    {
      start: 46,
      end: 51.5,
      speaker: her,
      text: t('¿Y qué haces ahora con las manos, contador?'),
    },
    { start: 73, end: 76, speaker: her, text: t('No crece.') },
    { start: 79, end: 82.5, speaker: him, text: t('No. Se queda ahí.') },
    { start: 88, end: 91.5, speaker: her, text: t('Entonces hay tiempo.') },
    { start: 99, end: 102.5, speaker: him, text: t('Se te ha enfriado.') },
    {
      start: 104.5,
      end: 110.5,
      speaker: her,
      text: t('No hay prisa. Aquí la tarde no se acaba.'),
    },
  ];
}

/** Los gestos: mirar al otro, alzar la vista al punto, la taza que gira entre las manos de él. */
function gestures(): Record<string, ScalarKey[]> {
  const her = (field: GestureField): string => gestureTrack('cientifica', field);
  const him = (field: GestureField): string => gestureTrack('esceptico', field);
  return {
    [her('look')]: keys(
      [0, 0],
      [45, 0],
      [46.5, -0.32],
      [52, -0.3],
      [55, 0],
      [99.5, 0],
      [101, -0.3],
    ),
    [her('lift')]: keys([0, 0], [70, 0], [72, 0.42], [83, 0.4], [85, 0.32], [95, 0.3], [98, 0]),
    [her('tilt')]: keys([0, 0], [104, 0], [107, -0.17], [130, -0.17]),
    [her('lean')]: keys([0, 0], [104, 0], [108, -0.05], [130, -0.05]),
    [her('glow')]: keys([0, 0], [87.5, 0], [89.5, 0.7], [96, 0.4], [112, 0.6]),
    [him('look')]: keys(
      [0, 0],
      [86, 0],
      [88, 0.28],
      [95, 0.25],
      [98.5, 0.2],
      [99.5, 0.42],
      [103, 0.4],
      [106, 0.12],
    ),
    [him('lift')]: keys(
      [0, 0],
      [39.5, 0],
      [41.5, -0.25],
      [46, -0.2],
      [52, -0.32],
      [76, -0.3],
      [78.5, 0.28],
      [84, 0.25],
      [86, 0],
      [99.5, -0.18],
      [103, -0.15],
      [106, 0.05],
    ),
    [him('hold')]: keys([0, 1]),
    [him('turn')]: keys([0, 0], [52, 1.5], [56, 2.0], [68, 4.6], [130, 9]),
    [him('glow')]: keys([0, 0], [104, 0], [108, 0.5], [130, 0.5]),
  };
}

/**
 * La cinemática del Mirador. `point`: dirección unitaria (coordenadas del ancla) del punto quieto: la calcula quien la
 * reproduce desde la posición de Cicatriz en MIRADOR_SYSTEM_TIME.
 */
export function miradorCinematic(point: Vec3): Cinematic {
  return {
    id: MIRADOR_CINEMATIC_ID,
    duration: 130,
    fov: 40,
    shots: shots(point),
    lines: lines(),
    cues: [
      { at: 5, id: 'music.scene', persistent: true },
      { at: 108, id: 'music.end', persistent: true },
    ],
    tracks: {
      ...gestures(),
      /** Negro encima (1) o nada (0): se abre al empezar. */
      fade: keys([0, 1], [5, 0]),
      /** Las franjas de cine: se recogen al final, antes de la tarjeta. */
      bars: keys([0, 1], [125, 1], [129, 0]),
      /** El rebote cálido de la Brasa en la piedra (desde delante y abajo). */
      warm: keys([0, 0.6], [56, 0.6], [57, 1], [68, 1], [69, 0.7], [96, 0.8], [112, 0.6]),
      /** El contraluz frío de la noche (desde detrás y arriba): separa las siluetas del cielo. */
      cool: keys([0, 0.5], [96, 0.5], [97, 1], [112, 1], [113, 0.5]),
      /** Bruma de cerca (profundidad de campo fingida): en los planos cortos el fondo se aleja. */
      haze: keys(
        [0, 0],
        [55.5, 0],
        [56.5, 1],
        [84.5, 1],
        [85.5, 0],
        [95.5, 0],
        [96.5, 0.5],
        [111.5, 0.5],
        [112.5, 0],
      ),
    },
  };
}

/** El gesto de `who` en el instante `time` de la escena (las pistas de sus gestos). */
export function gestureAt(scene: Cinematic, who: AbsentWho, time: number): SeatedGesture {
  const gesture: Record<GestureField, number> = { ...NEUTRAL_GESTURE };
  for (const field of GESTURE_FIELDS) {
    gesture[field] = trackValue(scene, gestureTrack(who, field), time, NEUTRAL_GESTURE[field]);
  }
  return gesture;
}
