// La escena del cuaderno del final bueno (plan de los finales, F4; textos y quién cierra el final, 🟡: D14): la Maestra
// lee tu Registro mientras le cuentas lo que sabes. Cada tema aparece solo si has aprendido alguno de sus hechos; la
// advertencia y su respuesta salen siempre. Lógica pura: la escena la pinta homecomingRig.ts.
import { t } from '../i18n';

export interface TalkTopic {
  id: 'deuda' | 'silencio' | 'partida' | 'ellos' | 'energia';
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
      '«Aquí dices que la deuda no es de energía, sino de tiempo: cada paso por una Puerta separa un poco más sus dos relojes».',
    ),
  },
  {
    id: 'silencio',
    facts: ['silencio.investigadora', 'silencio.consejo_existe', 'silencio.censura'],
    line: t(
      '«Y esto: alguien esperaba a la científica que nunca volvió, y un Consejo que prefirió callarlo».',
    ),
  },
  {
    id: 'partida',
    facts: ['partida.cascada', 'partida.evacuacion'],
    line: t('«La Gran Partida. Huyeron todos a la vez, y su huida aceleró el colapso».'),
  },
  {
    id: 'ellos',
    facts: ['silencio.dos_investigadores', 'bucle.camara'],
    line: t(
      '«Dos de ellos se quedaron atrás. No son dos nombres en una piedra: eran dos personas, y siguen ahí».',
    ),
  },
  {
    id: 'energia',
    facts: ['deuda.garganta_maquina', 'deuda.coste_energia'],
    line: t(
      '«Y la energía. Su máquina la sacaba de una garganta, como pensamos sacarla nosotros del Motor».',
    ),
  },
];

const OPENING = t('«“Vuelve a contármelo todo”, te dije. Anda, dame el cuaderno».');
const WARNING = t(
  'Le adviertes: sacar energía de la garganta de una Puerta es pedir tiempo prestado, y esa deuda se paga con intereses.',
);
const REPLY = t('«Te creo. Iré contigo a ver a la Directora: la prueba mayor no se hará».');

/** Las frases de la escena según lo que sabes (`known`: los hechos del Registro). */
export function talkLines(known: ReadonlySet<string>): string[] {
  const topics = TALK_TOPICS.filter((topic) => topic.facts.some((fact) => known.has(fact)));
  return [OPENING, ...topics.map((topic) => topic.line), WARNING, REPLY];
}
