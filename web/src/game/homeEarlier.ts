// La llegada del final bueno (F4, «Hogar tres días después»; 🟡 todo el ritmo y el sitio de cada uno): el Albatros II
// llega al espacio de casa, baja recto al nido del Instituto, donde espera la Maestra, le das tu cuaderno y lo lee
// mientras habláis (game/endingTalk.ts). Aquí, lo puro: dónde está cada cosa en el marco del nido, la cronología de
// la escena por fases (con las réplicas puestas en el tiempo) y qué páginas de tu Registro enseña el cuaderno en cada
// momento. El guion de cámara es game/homeEarlierScene.ts; los actores, game/homeEarlierMotion.ts.
//
// Marco del nido: la marca PARK_Hangar (Z arriba, +X al este, +Y al norte). La nave se posa en su origen con la proa
// al norte, así que la escalerilla (a popa) baja hacia el sur. La Brasa sale baja por el este.
import type { Vec3 } from '../cinematic/cameraTrack';
import { CLEARANCE, LADDER_FOOT, LADDER_TOP } from '../ship/model/albatrosShape';
import { HATCH_OPEN_SECONDS } from '../ship/hatch';
import type { NotebookPage } from '../registry/notebookPages';
import { spreadOf } from '../registry/notebookPages';
import { TALK_TOPICS, type TalkLine, type TalkTopicId } from './endingTalk';

export type EarlierPhase =
  | 'llegada'
  | 'descenso'
  | 'aterrizaje'
  | 'encuentro'
  | 'lectura'
  | 'advertencia'
  | 'respuesta'
  | 'salida';

export const EARLIER_PHASES: readonly EarlierPhase[] = [
  'llegada',
  'descenso',
  'aterrizaje',
  'encuentro',
  'lectura',
  'advertencia',
  'respuesta',
  'salida',
];

/** De los ejes de la nave (+Y arriba, −Z la proa) al marco del nido, con la nave posada. */
export function shipToNest(p: { x: number; y: number; z: number }): Vec3 {
  return [p.x, -p.z, p.y + CLEARANCE];
}

/** El pie de la escalerilla bajada, sin el paso de más (ejes de la nave). */
const LADDER_BOTTOM = { x: LADDER_FOOT.x, y: LADDER_FOOT.y, z: LADDER_FOOT.z - 0.7 };

/** Dónde está cada uno (marco del nido, m). */
export const NEST = {
  /** El centro de la nave posada. */
  ship: [0, 0, CLEARANCE] as Vec3,
  /** La escalerilla: arriba (en el pozo de la escotilla), abajo y un paso más allá. */
  ladderTop: shipToNest(LADDER_TOP),
  ladderBottom: shipToNest(LADDER_BOTTOM),
  ladderFoot: shipToNest(LADDER_FOOT),
  /** La Maestra espera fuera de la plataforma, al suroeste de la escalerilla, entre la grúa y los toneles. */
  maestra: [-2.4, -6.6, 0] as Vec3,
  /** A qué distancia de ella te paras (m). */
  meetGap: 1.15,
  /** Los Ool que miran al cielo, en el borde este de la plaza (fuera del pasillo de aros del hangar). */
  watchers: [
    [-11.6, -2.6, 0],
    [-12.7, -1.3, 0],
    [-13.3, -3.5, 0],
    [-11.1, -4.3, 0],
  ] as readonly Vec3[],
} as const;

/** La dirección (rumbo en rad desde +Y hacia +X) para mirar de `from` a `to` por el suelo. */
export function headingTo(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}

/** Donde te paras, delante de ella. */
export function meetSpot(): Vec3 {
  const [mx, my] = NEST.maestra;
  const [fx, fy] = NEST.ladderFoot;
  const length = Math.hypot(fx - mx, fy - my);
  const k = NEST.meetGap / length;
  return [mx + (fx - mx) * k, my + (fy - my) * k, 0];
}

/** Segundos de cada cosa (🟡). */
export const SECONDS = {
  arrival: 9,
  descent: 13,
  /** Los últimos metros, ya dentro del nido, forman parte del aterrizaje. */
  settle: 3.5,
  hatchDelay: 1.2,
  ladder: 3.2,
  /** Andando (m/s): sin prisa. */
  walk: 1.05,
  /** Entre dos réplicas. */
  gap: 0.55,
  /** Lo que tarda en pasar una hoja (antes de leerla). */
  pageTurn: 0.9,
  /** Lo que mira «Lo que sé» antes del primer tema (sin temas, lo que hojea en silencio). */
  glance: 2.6,
  browse: 4.5,
  /** Del «dame el cuaderno» a tenerlo en las manos, y a abrirlo. */
  handOver: 0.4,
  open: 1.3,
  /** Al final: lo que se queda mirando y el fundido a negro. */
  hold: 2.2,
  fade: 3.5,
} as const;

/** Lo que dura una réplica en pantalla según su largo (s). */
export function lineSeconds(text: string): number {
  return Math.min(8, Math.max(2.6, 1.4 + Array.from(text).length * 0.062));
}

export interface PhaseSpan {
  phase: EarlierPhase;
  start: number;
  end: number;
}

export interface TimedLine extends TalkLine {
  start: number;
  end: number;
}

/** Una página del cuaderno a la vista mientras ella lee (índices de `notebookPages`). */
export interface ReadingBeat {
  start: number;
  end: number;
  page: number;
  /** La doble página que se ve y de qué lado está la página (las impares, a la izquierda). */
  spread: number;
  side: 'left' | 'right';
  topic?: TalkTopicId;
}

export interface EarlierTimeline {
  duration: number;
  phases: readonly PhaseSpan[];
  lines: readonly TimedLine[];
  beats: readonly ReadingBeat[];
  /** Los momentos de la escena (s). */
  marks: {
    touchdown: number;
    hatch: number;
    ladderStart: number;
    ladderEnd: number;
    walkEnd: number;
    handOver: number;
    bookOpen: number;
    bookClose: number;
    nod: number;
    lookUp: number;
    fadeStart: number;
  };
}

/** La primera página de «Lo que sé» (o la primera después de la guarda). */
export function knownPage(pages: readonly NotebookPage[]): number {
  const found = pages.findIndex((page) => page.kind === 'known');
  return found >= 0 ? found : Math.min(2, Math.max(0, pages.length - 1));
}

/** Dónde está escrito cada tema que conoces: la primera página de pregunta con uno de sus hechos. */
export function topicPage(
  pages: readonly NotebookPage[],
  facts: readonly string[],
  fallback: number,
): number {
  const found = pages.findIndex(
    (page) =>
      page.kind === 'thread' &&
      page.entries.some((entry) => entry.kind === 'fact' && facts.includes(entry.id)),
  );
  return found >= 0 ? found : fallback;
}

function beat(start: number, end: number, page: number, topic?: TalkTopicId): ReadingBeat {
  return {
    start,
    end,
    page,
    spread: spreadOf(page),
    side: page % 2 === 1 ? 'left' : 'right',
    ...(topic === undefined ? {} : { topic }),
  };
}

/** Pone las réplicas en el tiempo, una tras otra desde `from`; devuelve dónde acaba la última. */
function place(lines: readonly TalkLine[], from: number, out: TimedLine[]): number {
  let at = from;
  for (const line of lines) {
    const end = at + lineSeconds(line.text);
    out.push({ ...line, start: at, end });
    at = end + SECONDS.gap;
  }
  return at - SECONDS.gap;
}

/**
 * La cronología de la escena: las fases, las réplicas de `script` (game/endingTalk.ts) en su sitio, las páginas de tu
 * cuaderno que se ven mientras ella lee y los momentos de cada gesto. `pages` es tu cuaderno (registry/notebookPages);
 * `known`, lo que sabes.
 */
export function earlierTimeline(
  script: readonly TalkLine[],
  pages: readonly NotebookPage[],
  known: ReadonlySet<string>,
): EarlierTimeline {
  const of = (part: TalkLine['part']): TalkLine[] => script.filter((line) => line.part === part);
  const lines: TimedLine[] = [];
  const descentStart = SECONDS.arrival;
  const landingStart = descentStart + SECONDS.descent;
  const touchdown = landingStart + SECONDS.settle;
  const hatch = touchdown + SECONDS.hatchDelay;
  const ladderStart = hatch + HATCH_OPEN_SECONDS + 0.2;
  const ladderEnd = ladderStart + SECONDS.ladder;
  const meet = meetSpot();
  const walk =
    Math.hypot(
      NEST.ladderFoot[0] - NEST.ladderBottom[0],
      NEST.ladderFoot[1] - NEST.ladderBottom[1],
    ) + Math.hypot(meet[0] - NEST.ladderFoot[0], meet[1] - NEST.ladderFoot[1]);
  const walkEnd = ladderEnd + walk / SECONDS.walk;

  // El encuentro: ella habla cuando aún llegas; tú, ya delante.
  const greetingEnd = place(of('saludo'), walkEnd - 0.9, lines);
  const readingStart = greetingEnd + SECONDS.gap;
  const openingEnd = place(of('apertura'), readingStart, lines);
  const handOver = openingEnd + SECONDS.handOver;
  const bookOpen = handOver + SECONDS.open;

  const first = knownPage(pages);
  const topics = script.filter((line) => line.part === 'tema');
  const beats: ReadingBeat[] = [];
  let at = bookOpen;
  const glance = topics.length > 0 ? SECONDS.glance : SECONDS.browse;
  beats.push(beat(handOver, at + glance, first));
  at += glance;
  for (const line of topics) {
    const facts = TALK_TOPICS.find((topic) => topic.id === line.topic)?.facts ?? [];
    const page = topicPage(
      pages,
      facts.filter((fact) => known.has(fact)),
      first,
    );
    const lineStart = at + SECONDS.pageTurn;
    const lineEnd = place([line], lineStart, lines);
    beats.push(beat(at, lineEnd + SECONDS.gap, page, line.topic));
    at = lineEnd + SECONDS.gap;
  }
  const readingEnd = at;

  const warningEnd = place(of('advertencia'), readingEnd + 0.3, lines);
  const replyStart = warningEnd + SECONDS.gap + 0.4;
  const replyEnd = place(of('respuesta'), replyStart, lines);
  const closingStart = replyEnd + SECONDS.gap;
  const closingEnd = place(of('cierre'), closingStart, lines);
  const fadeStart = closingEnd + SECONDS.hold;
  const duration = fadeStart + SECONDS.fade;
  const secondReply = lines.filter((line) => line.part === 'respuesta')[1];

  const bounds: [EarlierPhase, number][] = [
    ['llegada', 0],
    ['descenso', descentStart],
    ['aterrizaje', landingStart],
    ['encuentro', ladderEnd],
    ['lectura', readingStart],
    ['advertencia', readingEnd],
    ['respuesta', replyStart - 0.2],
    ['salida', closingStart - 0.2],
  ];
  const phases = bounds.map(([phase, start], i) => ({
    phase,
    start,
    end: bounds[i + 1]?.[1] ?? duration,
  }));
  return {
    duration,
    phases,
    lines,
    beats,
    marks: {
      touchdown,
      hatch,
      ladderStart,
      ladderEnd,
      walkEnd,
      handOver,
      bookOpen,
      bookClose: replyStart + 0.3,
      nod: replyStart + 0.2,
      lookUp: secondReply?.start ?? replyStart + 2,
      fadeStart,
    },
  };
}

/** La fase de la escena en el segundo `t`. */
export function phaseAt(timeline: EarlierTimeline, t: number): EarlierPhase {
  const found = timeline.phases.find((span) => t < span.end);
  return found?.phase ?? 'salida';
}

/** La página que se ve en el segundo `t` (y desde cuándo), o nada si el cuaderno aún no está abierto. */
export function beatAt(timeline: EarlierTimeline, t: number): ReadingBeat | undefined {
  if (t < timeline.marks.handOver) return undefined;
  let current: ReadingBeat | undefined;
  for (const item of timeline.beats) if (t >= item.start) current = item;
  return current;
}
