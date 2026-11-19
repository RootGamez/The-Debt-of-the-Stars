// La escena del cuaderno del final bueno (plan de los finales, F4; textos y quién cierra el final, 🟡: D14): la Maestra
// te espera en el nido del Albatros II, te pide el cuaderno y lo lee mientras le cuentas lo que sabes. Cada tema sale
// solo si has aprendido alguno de sus hechos; el saludo, la advertencia y su respuesta salen siempre. Voces de
// docs/biblia-textos.md: ella, paciente, con humor, enseña con preguntas; tú, frases cortas, serio y tierno.
// Lógica pura: el guion de la cinemática (game/homeEarlierScene.ts) pone estas réplicas en el tiempo.
import { t } from '../i18n';

export type TalkTopicId = 'deuda' | 'silencio' | 'partida' | 'ellos' | 'energia';

export interface TalkTopic {
  id: TalkTopicId;
  /** Basta con saber uno de estos hechos para que ella lea ese tema. */
  facts: readonly string[];
  line: string;
}

/** Lo que enseña el cuaderno, en el orden en que ella lo va leyendo. */
export const TALK_TOPICS: readonly TalkTopic[] = [
  {
    id: 'deuda',
    facts: ['deuda.es_de_tiempo', 'deuda.relojes_se_separan'],
    line: t(
      'Aquí dices que la deuda no es de energía, sino de tiempo: cada paso por una Puerta separa un poco más sus dos relojes.',
    ),
  },
  {
    id: 'silencio',
    facts: ['silencio.investigadora', 'silencio.consejo_existe', 'silencio.censura'],
    line: t(
      'Y esto: alguien esperaba a la científica que no volvió, y un Consejo prefirió callarlo.',
    ),
  },
  {
    id: 'partida',
    facts: ['partida.cascada', 'partida.evacuacion'],
    line: t('La Gran Partida. Huyeron todos a la vez, y su huida aceleró el colapso.'),
  },
  {
    id: 'ellos',
    facts: ['silencio.dos_investigadores', 'bucle.camara'],
    line: t(
      'Dos se quedaron atrás. No son dos nombres en una piedra: son dos personas, y siguen allí.',
    ),
  },
  {
    id: 'energia',
    facts: ['deuda.garganta_maquina', 'deuda.coste_energia'],
    line: t(
      'Y la energía. Su máquina la sacaba de una garganta… como pensamos sacarla nosotros del Motor.',
    ),
  },
];

/** Quién dice cada réplica: la Maestra o tú (el explorador). */
export type TalkSpeaker = 'maestra' | 'explorador';

/** El tramo de la escena al que pertenece una réplica. */
export type TalkPart = 'saludo' | 'apertura' | 'tema' | 'advertencia' | 'respuesta' | 'cierre';

export interface TalkLine {
  speaker: TalkSpeaker;
  part: TalkPart;
  text: string;
  /** Solo en las réplicas de tema: cuál. */
  topic?: TalkTopicId;
}

const GREETING: readonly TalkLine[] = [
  {
    speaker: 'maestra',
    part: 'saludo',
    text: t('Tres días mirando al cielo. Toda la colina.'),
  },
  { speaker: 'explorador', part: 'saludo', text: t('Para mí han sido muchos más.') },
];
const OPENING: TalkLine = {
  speaker: 'maestra',
  part: 'apertura',
  text: t('«Vuelve a contármelo todo», te dije. Anda, dame el cuaderno.'),
};
const WARNING: readonly TalkLine[] = [
  {
    speaker: 'explorador',
    part: 'advertencia',
    text: t('Sacar energía de la garganta de una Puerta es pedir tiempo prestado.'),
  },
  {
    speaker: 'explorador',
    part: 'advertencia',
    text: t('Y esa deuda se cobra con intereses. Lo vi allí; no quiero verlo aquí.'),
  },
];
const REPLY: readonly TalkLine[] = [
  { speaker: 'maestra', part: 'respuesta', text: t('Te creo.') },
  {
    speaker: 'maestra',
    part: 'respuesta',
    text: t('Iré contigo a ver a la Directora. La prueba mayor no se hará.'),
  },
];
const CLOSING: TalkLine = {
  speaker: 'maestra',
  part: 'cierre',
  text: t('Y luego me lo cuentas otra vez. Despacio.'),
};

/** Los temas que ella encuentra en tu cuaderno (`known`: los hechos del Registro), en orden. */
export function knownTopics(known: ReadonlySet<string>): TalkTopic[] {
  return TALK_TOPICS.filter((topic) => topic.facts.some((fact) => known.has(fact)));
}

/** Las réplicas de la escena según lo que sabes, en orden. */
export function talkScript(known: ReadonlySet<string>): TalkLine[] {
  const topics = knownTopics(known).map((topic): TalkLine => ({
    speaker: 'maestra',
    part: 'tema',
    text: topic.line,
    topic: topic.id,
  }));
  return [...GREETING, OPENING, ...topics, ...WARNING, ...REPLY, CLOSING];
}
