// Las escenas del final malo (F5, «Llegas tarde»; 🟡 todo borrador: planos, frases y ritmo). Aquí está el guion, puro:
// las dos llegadas a Hogar diez años después (por La Boca, a pie por la Puerta Mayor encendida; por una boca
// equivocada del Archivo, en el Albatros II sobre Hogar) y la escena del colapso (nace el agujero en la garganta de la
// Puerta Mayor, crece, se traga la Luna y Hogar; fundido). Lo reproduce game/homeLaterRig.ts con el director de
// cinemáticas (cinematic/), y los tiempos del colapso salen de data/colapso-hogar.json (game/homeCollapse.ts).
//
// Coordenadas: las del ancla `hogar_Motor_Garganta` (el centro del aro de la Puerta Mayor, con el marco del Motor):
// +Y hacia el Instituto, Z arriba; el suelo del Motor, a −8,4. Las llegadas acaban justo donde empieza el juego (la
// vista del jugador, o la de la cabina), para que el corte no se note.
import { Matrix4, Vector3 } from 'three';
import type { CameraKey, Vec3 } from '../cinematic/cameraTrack';
import type { Cinematic, Line, ScalarKey, Shot } from '../cinematic/timeline';
import { t } from '../i18n';
import { GREAT_RING, motorHeading } from '../worlds/procedural/hogarMotor';
import { hogarGround, hogarSurface, SEA_LEVEL, SITES } from '../worlds/procedural/hogarShape';
import { MEMORIAL } from '../worlds/procedural/hogarLaterShape';
import { direction, frameAt, type XYZ } from '../worlds/procedural/kit';
import type { CollapseData } from './homeCollapse';

/** Quien habla en el colapso: una Ool mayor del Instituto (❓ si es la Maestra: no se dice). */
export const ELDER = 'mayor';
/** Segundos en negro antes de cada llegada (la página acaba de cargar). */
export const ARRIVAL_PREROLL = 1;
/** La señal de la Puerta: algo la cruza (destella). */
export const GATE_FLASH_CUE = 'puerta.destello';
/** A cuánto de la garganta, del lado contrario a la Luna, se mira caer la Luna desde el espacio (m). */
const MOON_SHOT_BACK = 150;
/** La isla desde lo alto, del lado del mar (marco del ancla): la Puerta delante y la ciudad y el Instituto detrás. */
const SHIP_AERIAL = {
  from: [-40, -110, 95] as Vec3,
  to: [-31, -96, 82] as Vec3,
  look: [0, 24, -8] as Vec3,
} as const;
/** Lo que dura el parpadeo a negro antes de la cabina (s). */
const SHIP_BLINK = 0.9;
/** Cuánto más allá de la Luna empieza el plano que la ve caer (m). */
const BEYOND_MOON = 115;
/** A cuánto del agujero acaba la escena, con Hogar ya dentro (m). */
const HOLE_CLOSE = 300;
/** Dónde se supone la Luna si no está en el sistema (marco del ancla): baja, hacia el Instituto. */
const MOON_FALLBACK: Vec3 = [-417, 665, 34];

/** Dónde acaba una llegada: la vista con la que empieza el juego (marco del ancla). */
export interface CameraEnd {
  pos: Vec3;
  look: Vec3;
}

// ---- El marco del ancla ---------------------------------------------------------------------------------------

/** El ancla en el marco de Hogar (el de diseño, Z arriba): la del Motor, con el origen en el centro del aro. */
function anchorMatrix(): Matrix4 {
  const motor = frameAt(hogarSurface, SITES.motor.lat, SITES.motor.lon, {
    heading: motorHeading(),
  });
  return motor.base.clone().setPosition(motor.point(GREAT_RING.center));
}

const ANCHOR = anchorMatrix();
const FROM_HOGAR = ANCHOR.clone().invert();

/** Un punto del marco de Hogar en el del ancla. */
function toAnchor(p: XYZ): Vec3 {
  const v = new Vector3(p.x, p.y, p.z).applyMatrix4(FROM_HOGAR);
  return [v.x, v.y, v.z];
}

/** Un lugar de Hogar a `lift` m sobre su suelo, en el marco del ancla. */
function placeOf(lat: number, lon: number, lift = 0): Vec3 {
  const d = direction(lat, lon);
  return toAnchor(d.multiplyScalar(hogarGround(d) + lift));
}

/** Lo que se sabe del sitio sin el sistema: el centro de Hogar, el Instituto, la ciudad y el memorial. */
export const HOME_PLACES = {
  center: toAnchor(new Vector3()),
  instituto: placeOf(SITES.instituto.lat, SITES.instituto.lon),
  ciudad: placeOf(SITES.ciudad.lat, SITES.ciudad.lon),
  memorial: toAnchor(
    frameAt(hogarSurface, SITES.instituto.lat, SITES.instituto.lon).point(MEMORIAL.at),
  ),
} as const;

/** Lo alto que está un punto del marco del ancla sobre el suelo de Hogar o sobre el mar (m). */
export function heightAboveGround(p: Vec3): number {
  const v = new Vector3(...p).applyMatrix4(ANCHOR);
  return v.length() - Math.max(SEA_LEVEL, hogarGround(v.clone().normalize()));
}

// ---- Cuentas pequeñas -----------------------------------------------------------------------------------------

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.max(1e-9, length(a)));

const keys = (...pairs: (readonly [number, number])[]): ScalarKey[] =>
  pairs.map(([time, value]) => ({ t: time, v: value }));

function shot(
  id: string,
  start: number,
  end: number,
  frames: readonly CameraKey[],
  extra: Partial<Shot> = {},
): Shot {
  return { id, start, end, keys: frames, ...extra };
}

// ---- Las llegadas ---------------------------------------------------------------------------------------------

/**
 * Por La Boca: la Puerta Mayor encendida, de lejos, destella (algo la cruza); luego, desde el andén, se baja la
 * escalinata mirando al Instituto y la ciudad con luz, y se acaba en los ojos del jugador. `duration` sale de los datos.
 */
export function arrivalOnFoot(duration: number, end: CameraEnd): Cinematic {
  const cut = Math.min(6, duration * 0.4);
  const landing: Vec3 = [0, 3.3, -5.25];
  const steps: Vec3 = [0, 5.4, -6.3];
  return {
    id: 'llegada-boca',
    duration,
    fov: 42,
    shots: [
      shot(
        'puerta',
        0,
        cut,
        [
          // Desde la derecha de la escalinata: la Puerta, el cartel del Motor y su caseta con los cables.
          { t: 0, pos: [14, 33, -4.3], look: [-1, 0, -1.6], fov: 44 },
          { t: cut, pos: [12, 28.5, -4.7], look: [-1, 0, -1.9], fov: 44 },
        ],
        { ease: 'out' },
      ),
      shot(
        'escalinata',
        cut,
        duration,
        [
          { t: 0, pos: landing, look: [0, 40, -14], fov: 50 },
          { t: (duration - cut) * 0.55, pos: steps, look: [0, 50, -11], fov: 48 },
          { t: duration - cut, pos: end.pos, look: end.look, fov: 50 },
        ],
        { ease: 'smooth' },
      ),
    ],
    lines: [],
    cues: [{ at: Math.min(2.4, cut * 0.5), id: GATE_FLASH_CUE }],
    tracks: {
      fade: keys([0, 1], [2.6, 0]),
      bars: keys([0, 1], [duration - 2.5, 1], [duration, 0]),
    },
  };
}

/**
 * Por una boca equivocada del Archivo: el Albatros II quieto sobre Hogar (con el morro abajo), visto desde fuera con
 * la isla debajo; luego, desde lo alto y de lado, la Puerta Mayor terminada y encendida, el generador y los cables
 * hasta la ciudad y el Instituto. Un parpadeo a negro y se abre en la cabina (el paso por el casco queda a oscuras).
 * `ship`: dónde está la nave (marco del ancla).
 */
export function arrivalByShip(duration: number, ship: Vec3, end: CameraEnd): Cinematic {
  const cut = Math.min(6, duration * 0.45);
  const blink = Math.min(SHIP_BLINK, (duration - cut) * 0.3);
  const down = unit(sub(HOME_PLACES.center, ship));
  return {
    id: 'llegada-archivo',
    duration,
    fov: 46,
    shots: [
      shot(
        'nave',
        0,
        cut,
        [
          { t: 0, pos: add(ship, [11, -15, 27]), look: add(ship, scale(down, 14)), fov: 48 },
          { t: cut, pos: add(ship, [8.5, -11.5, 21.5]), look: add(ship, scale(down, 15)), fov: 46 },
        ],
        { ease: 'out' },
      ),
      shot(
        'puerta',
        cut,
        duration - blink,
        [
          { t: 0, pos: SHIP_AERIAL.from, look: SHIP_AERIAL.look, fov: 30 },
          { t: duration - blink - cut, pos: SHIP_AERIAL.to, look: SHIP_AERIAL.look, fov: 29 },
        ],
        { ease: 'smooth' },
      ),
      shot('cabina', duration - blink, duration, [
        { t: 0, pos: SHIP_AERIAL.to, look: SHIP_AERIAL.look, fov: 29 },
        { t: blink, pos: end.pos, look: end.look, fov: 50 },
      ]),
    ],
    lines: [],
    cues: [],
    tracks: {
      fade: keys(
        [0, 1],
        [2.6, 0],
        [duration - blink - 0.5, 0],
        [duration - blink, 1],
        [duration, 1],
      ),
      bars: keys([0, 1], [duration - blink, 1], [duration, 0]),
    },
  };
}

// ---- El colapso -----------------------------------------------------------------------------------------------

function collapseLines(): Line[] {
  return [
    {
      start: 0.8,
      end: 3.8,
      speaker: ELDER,
      text: t('Diez años encendido. Nunca había sonado así.'),
    },
    {
      start: 10,
      end: 14,
      speaker: ELDER,
      text: t('Siempre dijimos que volverías por esa Puerta.'),
    },
    { start: 21.5, end: 25.5, speaker: ELDER, text: t('Mira la Luna. Se está yendo hacia él.') },
  ];
}

/**
 * Los planos del colapso (tiempos desde el principio de la escena, para 54 s; se estiran con la duración de los datos).
 * `moon`: dónde está la Luna (marco del ancla), o `undefined` si no está en el sistema.
 */
function collapseShots(duration: number, moon: Vec3 | undefined): Shot[] {
  const k = duration / 54;
  const at = (seconds: number): number => seconds * k;
  // Los planos del espacio van en el marco de la Luna: hacia ella (`sky`), de lado (`across`) y arriba (Z).
  const toMoon = moon ?? MOON_FALLBACK;
  const reach = length(toMoon);
  const sky = unit(toMoon);
  const flat: Vec3 = [-sky[1], sky[0], 0];
  const across = length(flat) > 0.5 ? unit(flat) : ([1, 0, 0] as Vec3);
  const up: Vec3 = [0, 0, 1];
  /** Un punto a `back` m del agujero del lado contrario a la Luna (negativo: hacia ella), de lado y arriba. */
  const orbit = (back: number, aside: number, high: number): Vec3 =>
    add(add(scale(sky, -back), scale(across, aside)), scale(up, high));
  /** Un punto a `ahead` m del agujero hacia la Luna, `low` m por debajo. */
  const watch = (ahead: number, low: number): Vec3 => add(scale(sky, ahead), scale(up, -low));
  // Detrás de la Luna: ella delante, estirándose hacia el agujero; Hogar y el agujero al fondo. Luego, solo el agujero.
  const behind = orbit(-(reach + BEYOND_MOON), 110, 60);
  const passing = orbit(-(reach - 105), 92, 48);
  const close = orbit(-HOLE_CLOSE, 55, 32);
  return [
    // Desde el lado del generador: la Puerta, el generador detrás y la caseta con sus cables delante.
    shot('garganta', 0, at(8), [
      { t: 0, pos: [-9, 27, -2.6], look: [0, 0, -1.2], fov: 46 },
      { t: at(8), pos: [-7.6, 22.8, -3.1], look: [0, 0, -0.6], fov: 48 },
    ]),
    shot(
      'ciudad',
      at(8),
      at(17),
      [
        { t: 0, pos: [-14, 66, 9], look: [0, 0, 3], fov: 46 },
        { t: at(9), pos: [-21, 80, 17], look: [0, 0, 6], fov: 50 },
      ],
      { ease: 'out' },
    ),
    shot('luna', at(17), at(26), [
      { t: 0, pos: orbit(MOON_SHOT_BACK + 20, 150, 76), look: watch(250, 20), fov: 50 },
      { t: at(9), pos: orbit(MOON_SHOT_BACK, 135, 68), look: watch(235, 24), fov: 50 },
    ]),
    shot(
      'espacio',
      at(26),
      at(40),
      [
        { t: 0, pos: behind, look: watch(0, 10), fov: 46 },
        { t: at(14), pos: passing, look: watch(0, 8), fov: 46 },
      ],
      { ease: 'linear' },
    ),
    shot(
      'final',
      at(40),
      at(48),
      [
        { t: 0, pos: passing, look: watch(0, 8), fov: 46 },
        { t: at(8), pos: close, look: [0, 0, 0], fov: 48 },
      ],
      { ease: 'in' },
    ),
    shot('negro', at(48), duration, [
      { t: 0, pos: close, look: [0, 0, 0], fov: 48 },
      { t: duration - at(48), pos: close, look: [0, 0, 0], fov: 48 },
    ]),
  ];
}

/** La escena del colapso con la cronología de los datos (`data`): dura `scene.duration` s y acaba en negro. */
export function collapseCinematic(data: CollapseData, moon: Vec3 | undefined): Cinematic {
  const { duration } = data.scene;
  const [fadeFrom, fadeTo] = data.fade;
  return {
    id: 'colapso',
    duration,
    fov: 46,
    shots: collapseShots(duration, moon),
    lines: collapseLines().filter((line) => line.end <= fadeFrom),
    cues: [],
    tracks: {
      fade: keys([0, 0], [fadeFrom, 0], [fadeTo, 1]),
      // Las franjas entran desde el juego (no hay negro al empezar: se corta del paseo a la escena).
      bars: keys([0, 0], [1.2, 1]),
    },
  };
}
