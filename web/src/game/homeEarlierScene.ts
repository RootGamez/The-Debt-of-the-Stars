// El guion de la llegada del final bueno (F4, «Hogar tres días después»; 🟡 planos, ritmo y luz: borrador de Claude a
// la espera de Anthony). La cronología y las réplicas son de game/homeEarlier.ts; los actores, de
// game/homeEarlierMotion.ts. Aquí, lo que ve la cámara (puro, con tests):
//  - la Luna con su mordida nueva y el Albatros II que pasa sobre ella camino de casa;
//  - los Ool de la plaza mirando al cielo; la Maestra esperando en el nido mientras la nave se posa;
//  - la escalerilla, el encuentro y el cuaderno que pasa de tus manos a las suyas;
//  - la lectura: planos desde sus ojos de las páginas de tu Registro (las mismas que tu cuaderno del juego), con su
//    cara al leer entre una y otra;
//  - la advertencia, «te creo» y, al final, ella mirando la Luna mordida; la cámara sube y se aparta.
// Lo reproduce game/homeEarlierRig.ts con el director (game/cinematicRunner.ts). Marco del nido (homeEarlier.ts):
// Z arriba, +X al este, +Y al norte.
import type { CameraKey, Vec3 } from '../cinematic/cameraTrack';
import type { Cinematic, Line, ScalarKey, Shot } from '../cinematic/timeline';
import { NOTEBOOK } from '../render/notebookModel';
import {
  headingTo,
  meetSpot,
  NEST,
  type EarlierPhase,
  type EarlierTimeline,
  type ReadingBeat,
  type TimedLine,
} from './homeEarlier';
import { shipAt, type ArrivalPath } from './homeEarlierMotion';

export const EARLIER_CINEMATIC_ID = 'nido';
/** Segundos en negro antes de empezar (la página acaba de cargar). */
export const EARLIER_PREROLL = 1.5;
/** La música: el tema principal (nada generado), desde que se ve la Luna. */
export const EARLIER_MUSIC = 'music.main';
export const MUSIC_CUE = 'music.scene';

/** Lo que el guion necesita saber del cielo (marco del nido, m): la Luna y su mordida. */
export interface EarlierSky {
  moon: Vec3;
  moonRadius: number;
  /** El centro de la esfera de la mordida y la vertical del suelo allí (unitaria). */
  bite: Vec3;
  biteUp: Vec3;
}

/**
 * Un cielo de respaldo (y para los tests), medido en el nido: la Luna, pequeña, al oeste-suroeste y alta, con la
 * mordida vuelta hacia Hogar. El montaje mide el de verdad al empezar.
 */
export const DEFAULT_SKY: EarlierSky = {
  moon: [-556, -291, 383],
  moonRadius: 34,
  bite: [-529, -272, 370],
  biteUp: [0.761, 0.535, -0.366],
};

// ---- Vectores ------------------------------------------------------------------------------------------------

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3, fallback: Vec3 = [0, 0, 1]): Vec3 => {
  const l = length(a);
  return l > 1e-9 ? scale(a, 1 / l) : fallback;
};
const lerp = (a: Vec3, b: Vec3, k: number): Vec3 => add(a, scale(sub(b, a), k));
const lerpTime = (a: number, b: number, k: number): number => a + (b - a) * k;
/** Sumas de vectores con peso: `along(p, [d, k], …)`. */
const along = (from: Vec3, ...steps: (readonly [Vec3, number])[]): Vec3 =>
  steps.reduce<Vec3>((p, [d, k]) => add(p, scale(d, k)), from);
const UP: Vec3 = [0, 0, 1];
/** Lejos en la dirección de `target`: las claves miran a una distancia fija, así el giro es parejo. */
const LOOK_DISTANCE = 60;
const aimAt = (pos: Vec3, target: Vec3): Vec3 =>
  add(pos, scale(unit(sub(target, pos)), LOOK_DISTANCE));
/** Mirar entre dos cosas: `k` 0 es `a`, 1 es `b` (mezcla direcciones, no puntos: valen a cualquier distancia). */
const aimBetween = (pos: Vec3, a: Vec3, b: Vec3, k: number): Vec3 =>
  aimAt(pos, add(pos, lerp(unit(sub(a, pos)), unit(sub(b, pos)), k)));

// ---- Dónde está cada uno ---------------------------------------------------------------------------------------

export interface Facing {
  at: Vec3;
  forward: Vec3;
  /** Su derecha. */
  right: Vec3;
}

/** La Maestra: de pie, vuelta hacia el pie de la escalerilla. */
export function maestraFacing(): Facing {
  const heading = headingTo(NEST.maestra, NEST.ladderFoot);
  return {
    at: NEST.maestra,
    forward: [Math.sin(heading), Math.cos(heading), 0],
    right: [Math.cos(heading), -Math.sin(heading), 0],
  };
}

/** Sus ojos y dónde sostiene el cuaderno para leer (m desde sus pies, hacia delante y hacia arriba). */
export const MAESTRA_EYE = { forward: 0.255, height: 1.07 } as const;
export const BOOK_HOLD = { forward: 0.47, height: 0.72 } as const;
/** Alturas para encuadrar: la cabeza de ella y el casco de él. */
const HER_HEAD = 1.0;
const YOUR_HEAD = 1.15;

export function maestraEye(): Vec3 {
  const { at, forward } = maestraFacing();
  return along(at, [forward, MAESTRA_EYE.forward], [UP, MAESTRA_EYE.height]);
}

/** El cuaderno abierto en sus manos: el lomo, y sus ejes (X hacia la página derecha, Y arriba del texto, Z a ella). */
export interface BookFrame {
  center: Vec3;
  x: Vec3;
  y: Vec3;
  z: Vec3;
}

export function bookInHands(): BookFrame {
  const { at, forward } = maestraFacing();
  const center = along(at, [forward, BOOK_HOLD.forward], [UP, BOOK_HOLD.height]);
  const z = unit(sub(maestraEye(), center));
  const y = unit(sub(forward, scale(z, dot(forward, z))));
  return { center, x: cross(y, z), y, z };
}

/** El centro de una página abierta. */
export function pageCenter(book: BookFrame, side: 'left' | 'right'): Vec3 {
  return along(book.center, [book.x, ((side === 'left' ? -1 : 1) * NOTEBOOK.pageWidth) / 2]);
}

/** Lo que sube la nave antes del último tramo, recto hacia abajo (m). */
const APPROACH_HEIGHT = 70;
/** A qué altura sobre la mordida empieza: la nave se asoma a ella antes de irse (m)… */
const SHIP_OVER_BITE = 10;
/** Y a un lado, para que la mordida se vea junto a ella (m). */
const SHIP_BESIDE_BITE = 16;

/**
 * Los ejes de la mordida: su vertical (que apunta casi a casa: la mordida mira a Hogar), un lado (horizontal para el
 * nido) y el tercero.
 */
function moonBasis(sky: EarlierSky): { up: Vec3; side: Vec3; ground: Vec3 } {
  const up = unit(sky.biteUp);
  const side = unit(cross(up, UP), unit(cross(up, [1, 0, 0])));
  return { up, side, ground: cross(side, up) };
}

/**
 * El camino de la nave: sale de encima de la mordida (algo antes, para pasar sobre ella), se aleja de la Luna y
 * cae hacia el nido; los últimos metros, en vertical.
 */
export function arrivalPath(sky: EarlierSky): ArrivalPath {
  const { up, side, ground } = moonBasis(sky);
  const from = along(sky.bite, [up, SHIP_OVER_BITE], [ground, SHIP_BESIDE_BITE]);
  const first = along(from, [up, 160], [side, 25]);
  const above = add(NEST.ship, [0, 0, APPROACH_HEIGHT]);
  return { from, via: [first, above] };
}

// ---- Los planos --------------------------------------------------------------------------------------------------

function shot(
  id: string,
  start: number,
  end: number,
  keys: readonly CameraKey[],
  extra: Partial<Shot> = {},
): Shot {
  return { id, start, end, keys, ...extra };
}

/** Claves repartidas en el plano: `[fracción, pos, look, fov]`. */
function spread(
  start: number,
  end: number,
  frames: readonly (readonly [number, Vec3, Vec3, number])[],
): CameraKey[] {
  const span = end - start;
  return frames.map(([k, pos, look, fov]) => ({ t: span * k, pos, look, fov }));
}

function span(tl: EarlierTimeline, phase: EarlierPhase): { start: number; end: number } {
  const found = tl.phases.find((item) => item.phase === phase);
  return found ?? { start: 0, end: tl.duration };
}

const linesOf = (tl: EarlierTimeline, part: TimedLine['part']): TimedLine[] =>
  tl.lines.filter((line) => line.part === part);

/** Cuándo pasa la nave junto a la cámara del primer plano (s): ahí se corta a su rumbo. */
const PASS_AT = 4;
/** Lo que tarda en salir del negro (s). */
const FADE_IN = 1.8;

/** Los cortes de la escena (s). */
export interface EarlierCuts {
  rumbo: number;
  colina: number;
  corona: number;
  nido: number;
  escalerilla: number;
  llegas: number;
  paraMi: number;
  entrega: number;
  lectura: number;
  advertencia: number;
  creo: number;
  cielo: number;
  final: number;
}

export function earlierCuts(tl: EarlierTimeline): EarlierCuts {
  const { marks } = tl;
  const greeting = linesOf(tl, 'saludo');
  const reading = span(tl, 'lectura');
  const reply = span(tl, 'respuesta');
  const closing = span(tl, 'salida');
  const llegas = marks.ladderEnd + 0.7;
  const paraMi = Math.min(
    reading.start - 1,
    Math.max(llegas + 1.5, (greeting[0]?.end ?? llegas + 3) + 0.25),
  );
  return {
    rumbo: PASS_AT,
    colina: 8.5,
    corona: 14,
    nido: marks.touchdown - 5.5,
    escalerilla: marks.touchdown + 1.4,
    llegas,
    paraMi,
    entrega: reading.start,
    lectura: marks.bookOpen + 0.3,
    advertencia: reading.end,
    creo: reply.start,
    cielo: marks.lookUp - 0.1,
    final: closing.start,
  };
}

function arrivalShots(tl: EarlierTimeline, sky: EarlierSky, path: ArrivalPath): Shot[] {
  const cuts = earlierCuts(tl);
  const ship = (t: number): Vec3 => shipAt(tl, t, path).position;
  const her = maestraFacing();

  // A · La Luna, pequeña y mordida, de frente: la nave sale de la mordida y viene hacia la cámara, que espera en su
  // camino, a un lado; se corta cuando pasa.
  const { up, side, ground } = moonBasis(sky);
  const pass = along(ship(PASS_AT + 0.35), [side, 9], [ground, 3]);
  const moonView = lerp(sky.bite, sky.moon, 0.12);
  const passFrom = along(pass, [up, -3]);
  // A' · Su rumbo: desde donde pasó, la nave se aleja hacia Hogar, que llena el fondo.
  const wakeFrom = along(pass, [up, 1]);
  const wakeTo = along(pass, [up, 6], [side, -2]);
  // B · La colina: bajo, detrás de los Ool que miran a la Luna; la nave baja de ella y sale del cuadro hacia el nido.
  const watchers = NEST.watchers.reduce<Vec3>(
    (sum, p) => add(sum, scale(p, 1 / NEST.watchers.length)),
    [0, 0, 0],
  );
  const toMoon = unit([sky.moon[0] - watchers[0], sky.moon[1] - watchers[1], 0]);
  const hillFrom = along(watchers, [toMoon, -4.6], [UP, 0.85]);
  const hillTo = along(watchers, [toMoon, -3.9], [UP, 0.8]);
  const hillSky = along(watchers, [toMoon, 9], [UP, 3]);
  const hillMid = lerp(hillFrom, hillTo, 0.55);
  // C · La corona del nido: desde dentro, entre las costillas, la nave baja hacia la cámara.
  const crownEye: Vec3 = [4.6, 1.2, 0.9];
  const crownEnd: Vec3 = [4.4, 1.5, 1.05];
  const crownMid = lerp(crownEye, crownEnd, 0.5);
  // D · El nido: detrás de ella y a su derecha (a su espalda está el taller); la nave baja hasta posarse.
  const nestEye = along(her.at, [her.forward, -2.6], [her.right, 2.3], [UP, 1.0]);
  const nestEnd = along(her.at, [her.forward, -2.2], [her.right, 1.5], [UP, 1.3]);
  const herHead = along(her.at, [UP, 1.0]);
  return [
    shot(
      'luna',
      0,
      cuts.rumbo,
      [
        { t: 0, pos: passFrom, look: aimAt(passFrom, moonView), fov: 44 },
        {
          t: cuts.rumbo,
          pos: pass,
          look: aimAt(pass, lerp(moonView, ship(cuts.rumbo), 0.35)),
          fov: 44,
        },
      ],
      { ease: 'linear' },
    ),
    shot(
      'rumbo',
      cuts.rumbo,
      cuts.colina,
      [
        { t: 0, pos: wakeFrom, look: aimAt(wakeFrom, ship(cuts.rumbo + 0.8)), fov: 52 },
        {
          t: 1.6,
          pos: lerp(wakeFrom, wakeTo, 0.4),
          look: aimAt(lerp(wakeFrom, wakeTo, 0.4), ship(cuts.rumbo + 1.6)),
          fov: 52,
        },
        {
          t: cuts.colina - cuts.rumbo,
          pos: wakeTo,
          look: aimAt(wakeTo, ship(cuts.colina)),
          fov: 50,
        },
      ],
      { ease: 'linear' },
    ),
    shot(
      'colina',
      cuts.colina,
      cuts.corona,
      spread(cuts.colina, cuts.corona, [
        [0, hillFrom, aimBetween(hillFrom, hillSky, sky.moon, 0.4), 64],
        [0.55, hillMid, aimBetween(hillMid, hillSky, sky.moon, 0.45), 62],
        [1, hillTo, aimBetween(hillTo, hillSky, sky.moon, 0.5), 60],
      ]),
      { ease: 'linear' },
    ),
    shot(
      'corona',
      cuts.corona,
      cuts.nido,
      spread(cuts.corona, cuts.nido, [
        [0, crownEye, aimAt(crownEye, ship(cuts.corona + 0.4)), 62],
        [0.5, crownMid, aimAt(crownMid, ship(lerpTime(cuts.corona, cuts.nido, 0.5))), 60],
        [1, crownEnd, aimAt(crownEnd, ship(cuts.nido)), 58],
      ]),
      { ease: 'linear' },
    ),
    shot(
      'nido',
      cuts.nido,
      cuts.escalerilla,
      spread(cuts.nido, cuts.escalerilla, [
        [0, nestEye, aimAt(nestEye, ship(cuts.nido + 0.3)), 58],
        [
          0.6,
          lerp(nestEye, nestEnd, 0.6),
          aimBetween(
            lerp(nestEye, nestEnd, 0.6),
            herHead,
            ship(lerpTime(cuts.nido, cuts.escalerilla, 0.6)),
            0.8,
          ),
          52,
        ],
        [1, nestEnd, aimBetween(nestEnd, herHead, NEST.ship, 0.7), 46],
      ]),
      { ease: 'linear' },
    ),
  ];
}

function meetingShots(tl: EarlierTimeline): Shot[] {
  const cuts = earlierCuts(tl);
  const her = maestraFacing();
  const you = meetSpot();
  const mid = lerp(her.at, you, 0.5);
  const stair = along(NEST.ladderBottom, [UP, 0.4]);
  const stairEye = along(her.at, [her.right, 1.25], [her.forward, -1.7], [UP, 1.3]);
  const twoEye = along(mid, [her.right, 3.3], [UP, 1.15]);
  const twoEnd = along(mid, [her.right, 2.85], [UP, 1.12]);
  const herShoulder = along(her.at, [her.forward, -1.4], [her.right, 0.95], [UP, 1.25]);
  const yourShoulder = along(you, [her.forward, 1.5], [her.right, 1.2], [UP, 1.3]);
  return [
    // E · La escalerilla, por encima del hombro de ella: se abre la escotilla y bajas hacia ella.
    shot(
      'escalerilla',
      cuts.escalerilla,
      cuts.llegas,
      spread(cuts.escalerilla, cuts.llegas, [
        [0, stairEye, along(NEST.ladderTop, [UP, 0.2]), 46],
        [0.55, stairEye, lerp(NEST.ladderTop, stair, 0.6), 45],
        [1, along(stairEye, [her.forward, -0.25], [UP, -0.05]), along(stair, [UP, 0.3]), 44],
      ]),
    ),
    // F · Los dos de perfil, con la nave detrás: llegas hasta ella.
    shot(
      'llegas',
      cuts.llegas,
      cuts.paraMi,
      spread(cuts.llegas, cuts.paraMi, [
        [0, twoEye, along(mid, [UP, 0.95]), 38],
        [1, twoEnd, along(mid, [UP, 0.98]), 36],
      ]),
    ),
    // G · Por encima de su hombro: tú.
    shot(
      'para-mi',
      cuts.paraMi,
      cuts.entrega,
      spread(cuts.paraMi, cuts.entrega, [
        [0, herShoulder, along(you, [UP, YOUR_HEAD - 0.05]), 40],
        [1, along(herShoulder, [her.forward, 0.15]), along(you, [UP, YOUR_HEAD - 0.05]), 37],
      ]),
    ),
    // H · Por encima del tuyo: ella pide el cuaderno, lo coge y lo abre.
    shot(
      'entrega',
      cuts.entrega,
      cuts.lectura,
      spread(cuts.entrega, cuts.lectura, [
        [0, yourShoulder, along(her.at, [UP, 0.92]), 42],
        [
          1,
          along(yourShoulder, [her.forward, -0.2]),
          along(her.at, [her.forward, 0.3], [UP, 0.82]),
          39,
        ],
      ]),
    ),
  ];
}

/** Desde sus ojos (algo detrás: la cabeza no se dibuja tan cerca), la doble página entera y luego la página. */
function insertShot(
  id: string,
  start: number,
  end: number,
  item: ReadingBeat,
  turning: boolean,
): Shot {
  const book = bookInHands();
  const her = maestraFacing();
  const eye = along(maestraEye(), [UP, 0.03], [her.forward, 0.08]);
  const page = pageCenter(book, item.side);
  // Sobre la página que lee (la cabeza se va con los ojos): mirando tan abajo, si no, el renglón saldría torcido.
  const over = along(eye, [book.x, (item.side === 'left' ? -1 : 1) * NOTEBOOK.pageWidth * 0.5]);
  const settle = Math.min(end - start, turning ? 1.4 : 0.9);
  const keys: CameraKey[] = [
    { t: 0, pos: eye, look: book.center, fov: 38 },
    { t: settle, pos: lerp(over, page, 0.08), look: page, fov: 29 },
  ];
  if (end - start > settle + 0.5)
    keys.push({ t: end - start, pos: lerp(over, page, 0.11), look: page, fov: 28 });
  return shot(id, start, end, keys);
}

/** Su cara mientras lee (de frente, desde su derecha) o los dos de perfil (siempre del mismo lado del eje). */
function reactionShot(id: string, start: number, end: number, kind: number): Shot {
  const her = maestraFacing();
  const you = meetSpot();
  if (kind % 2 === 0) {
    const pos = along(her.at, [her.forward, 0.8], [her.right, 1.15], [UP, 0.88]);
    const look = along(her.at, [her.forward, 0.22], [UP, 0.9]);
    return shot(
      id,
      start,
      end,
      spread(start, end, [
        [0, pos, look, 36],
        [1, along(pos, [her.forward, -0.08]), look, 34],
      ]),
    );
  }
  // Los dos de perfil, más cerca que al llegar: tú esperas mientras ella lee.
  const mid = lerp(her.at, you, 0.5);
  const pos = along(mid, [her.right, 2.3], [her.forward, -0.25], [UP, 1.1]);
  const look = along(mid, [her.forward, -0.1], [UP, 0.92]);
  return shot(
    id,
    start,
    end,
    spread(start, end, [
      [0, pos, look, 36],
      [1, along(pos, [her.right, -0.12]), look, 34],
    ]),
  );
}

function readingShots(tl: EarlierTimeline): Shot[] {
  const cuts = earlierCuts(tl);
  const topics = linesOf(tl, 'tema');
  const shots: Shot[] = [];
  let cursor = cuts.lectura;
  tl.beats.forEach((item, i) => {
    const end = item.end;
    if (end <= cursor + 1e-6) return;
    const line = topics.find(
      (candidate) => candidate.topic !== undefined && candidate.topic === item.topic,
    );
    const previous = tl.beats[i - 1];
    const turning = previous !== undefined && previous.spread !== item.spread;
    if (!line) {
      shots.push(insertShot(`pagina-${i}`, cursor, end, item, turning));
      cursor = end;
      return;
    }
    const split = Math.min(
      end - 1.2,
      Math.max(cursor + 1.6, line.start + 0.6 * (line.end - line.start)),
    );
    if (split <= cursor + 1e-6 || split >= end - 1e-6) {
      shots.push(insertShot(`pagina-${i}`, cursor, end, item, turning));
    } else {
      shots.push(insertShot(`pagina-${i}`, cursor, split, item, turning));
      shots.push(reactionShot(`lee-${i}`, split, end, i));
    }
    cursor = end;
  });
  return shots;
}

function closingShots(tl: EarlierTimeline, sky: EarlierSky): Shot[] {
  const cuts = earlierCuts(tl);
  const her = maestraFacing();
  const you = meetSpot();
  const mid = lerp(her.at, you, 0.5);
  const warnEye = along(her.at, [her.forward, -1.25], [her.right, 0.8], [UP, 1.25]);
  const listenEye = along(you, [her.right, 1.0], [her.forward, 1.3], [UP, 1.22]);
  const believeEye = along(you, [her.right, 0.9], [her.forward, 0.8], [UP, 1.2]);
  // A media advertencia, su cara escuchándote.
  const listen = lerpTime(cuts.advertencia, cuts.creo, 0.55);
  // Hacia la Luna por el suelo: la cámara se pone detrás de los dos, de espaldas a ella.
  const toMoon = unit([sky.moon[0] - mid[0], sky.moon[1] - mid[1], 0], [-0.7, -0.7, 0]);
  const lowEye = along(mid, [toMoon, -2.6], [UP, 0.55]);
  const lowEnd = along(mid, [toMoon, -2.3], [UP, 0.5]);
  const lowLook = (pos: Vec3): Vec3 =>
    add(
      pos,
      scale(
        unit(
          add(
            scale(unit(sub(sky.moon, pos)), 0.62),
            scale(unit(sub(along(mid, [UP, 1]), pos)), 0.38),
          ),
        ),
        LOOK_DISTANCE,
      ),
    );
  const craneFrom = along(mid, [toMoon, -3.2], [UP, 0.9]);
  const craneTo = along(mid, [toMoon, -8], [her.right, 3], [UP, 9]);
  // De los dos a la Luna: al final, casi solo ella.
  const craneLook = (pos: Vec3, toSky: number): Vec3 => aimBetween(pos, mid, sky.moon, toSky);
  return [
    // I · Tú se lo adviertes: por encima de su hombro, más cerca.
    shot(
      'advertencia',
      cuts.advertencia,
      listen,
      spread(cuts.advertencia, listen, [
        [0, warnEye, along(you, [UP, YOUR_HEAD]), 34],
        [1, along(warnEye, [her.forward, 0.2]), along(you, [UP, YOUR_HEAD]), 31],
      ]),
    ),
    // I' · Ella te escucha: por encima de tu hombro.
    shot(
      'escucha',
      listen,
      cuts.creo,
      spread(listen, cuts.creo, [
        [0, listenEye, along(her.at, [UP, HER_HEAD]), 32],
        [1, along(listenEye, [her.forward, -0.15]), along(her.at, [UP, HER_HEAD]), 30],
      ]),
    ),
    // J · «Te creo.»: ella, de cerca, desde tu lado.
    shot(
      'te-creo',
      cuts.creo,
      cuts.cielo,
      spread(cuts.creo, cuts.cielo, [
        [0, believeEye, along(her.at, [UP, HER_HEAD]), 28],
        [1, along(believeEye, [her.forward, -0.1]), along(her.at, [UP, HER_HEAD + 0.02]), 26],
      ]),
    ),
    // K · Ella alza la vista a la Luna mordida: desde abajo, detrás de los dos.
    shot(
      'cielo',
      cuts.cielo,
      cuts.final,
      spread(cuts.cielo, cuts.final, [
        [0, lowEye, lowLook(lowEye), 50],
        [1, lowEnd, lowLook(lowEnd), 48],
      ]),
    ),
    // L · La cámara sube y se aparta: los dos pequeños en el nido, la nave, la Luna arriba.
    shot(
      'final',
      cuts.final,
      tl.duration,
      spread(cuts.final, tl.duration, [
        [0, craneFrom, craneLook(craneFrom, 0.45), 48],
        [1, craneTo, craneLook(craneTo, 0.85), 52],
      ]),
      { ease: 'smooth' },
    ),
  ];
}

const keys = (...pairs: (readonly [number, number])[]): ScalarKey[] =>
  pairs.map(([t, v]) => ({ t, v }));

/** La viñeta se cierra en los planos desde sus ojos (las páginas, de cerca). */
function hazeTrack(shots: readonly Shot[]): ScalarKey[] {
  const out: ScalarKey[] = [{ t: 0, v: 0 }];
  let last: ScalarKey = { t: 0, v: 0 };
  for (const item of shots) {
    const value = item.id.startsWith('pagina-') ? 0.75 : 0;
    if (last.v === value) continue;
    const at = Math.max(item.start, last.t + 0.01);
    last = { t: at + 0.01, v: value };
    out.push({ t: at, v: out[out.length - 1]?.v ?? 0 }, last);
  }
  return out;
}

/**
 * La cinemática del nido. `tl` es la cronología (con tu cuaderno y lo que sabes); `sky`, dónde está la Luna con la
 * mordida vista desde el nido; `path`, el camino de la nave (por defecto, el que sale de `sky`).
 */
export function earlierCinematic(
  tl: EarlierTimeline,
  sky: EarlierSky = DEFAULT_SKY,
  path: ArrivalPath = arrivalPath(sky),
): Cinematic {
  const shots = [
    ...arrivalShots(tl, sky, path),
    ...meetingShots(tl),
    ...readingShots(tl),
    ...closingShots(tl, sky),
  ];
  const lines: Line[] = tl.lines.map((line) => ({
    start: line.start,
    end: line.end,
    speaker: line.speaker,
    text: line.text,
  }));
  const { fadeStart } = tl.marks;
  const cuts = earlierCuts(tl);
  return {
    id: EARLIER_CINEMATIC_ID,
    duration: tl.duration,
    fov: 40,
    shots,
    lines,
    cues: [{ at: 0.8, id: MUSIC_CUE, persistent: true }],
    tracks: {
      fade: keys([0, 1], [FADE_IN, 0], [fadeStart, 0], [tl.duration, 1]),
      bars: keys([0, 1], [tl.duration, 1]),
      haze: hazeTrack(shots),
      /** Las luces de relleno del nido (fuera, en el espacio, no hacen falta). */
      fill: keys([0, 0], [cuts.nido - 0.5, 0], [cuts.nido, 1], [tl.duration, 1]),
    },
  };
}

/** Si en el segundo `time` la cámara está en los ojos de ella (los planos de las páginas). */
export function insertAt(scene: Cinematic, time: number): boolean {
  const current = scene.shots.find((item) => time >= item.start && time < item.end);
  return current?.id.startsWith('pagina-') ?? false;
}
