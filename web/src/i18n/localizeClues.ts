// Los textos de las pistas viven en `src/data/pistas/*.json` en español. Para otro idioma se superponen los de
// `src/i18n/clues/*.en.json`, que repiten el `id` de cada pieza con sus textos traducidos: el grafo (ids, hilos,
// requisitos) es el mismo en todos los idiomas, y lo que falte se ve en español.
import anclajes from './clues/anclajes.en.json';
import archivo from './clues/archivo.en.json';
import cicatriz from './clues/cicatriz.en.json';
import conclusiones from './clues/conclusiones.en.json';
import hechos from './clues/hechos.en.json';
import hilos from './clues/hilos.en.json';
import hogar from './clues/hogar.en.json';
import laboratorio from './clues/laboratorio.en.json';
import luna from './clues/luna.en.json';
import observatorio from './clues/observatorio.en.json';
import puertas from './clues/puertas.en.json';
import taller from './clues/taller.en.json';
import umbral from './clues/umbral.en.json';
import type { Language } from './index';

export interface RawClues {
  hilos: readonly unknown[];
  hechos: readonly unknown[];
  conclusiones: readonly unknown[];
  fuentes: readonly unknown[];
}

/** Lo traducible de una fuente: su título y los párrafos de cada lectura. */
export interface SourceText {
  titulo?: string;
  superficial?: readonly string[];
  profunda?: readonly string[];
}

type Overlay<T> = Readonly<Record<string, T>>;

const SOURCES: Overlay<SourceText> = {
  ...hogar,
  ...luna,
  ...umbral,
  ...archivo,
  ...taller,
  ...cicatriz,
  ...observatorio,
  ...laboratorio,
  ...puertas,
  ...anclajes,
};

const OVERLAYS: Record<
  Exclude<Language, 'es'>,
  {
    fuentes: Overlay<SourceText>;
    hechos: Overlay<{ frase?: string; rumor?: string }>;
    hilos: Overlay<{ pregunta?: string; respuesta?: string }>;
    conclusiones: Overlay<{ titulo?: string }>;
  }
> = {
  en: { fuentes: SOURCES, hechos, hilos, conclusiones },
};

function idOf(entry: unknown): string | undefined {
  if (typeof entry !== 'object' || entry === null) return undefined;
  const id = (entry as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

/** Una copia de la lista con los campos traducidos de cada pieza (las piezas sin traducción quedan igual). */
function overlayList<T extends object>(
  list: readonly unknown[],
  translations: Overlay<T>,
  merge: (entry: Record<string, unknown>, translation: T) => Record<string, unknown>,
): unknown[] {
  return list.map((entry) => {
    const id = idOf(entry);
    const translation = id === undefined ? undefined : translations[id];
    return translation ? merge(entry as Record<string, unknown>, translation) : entry;
  });
}

/** Los textos aún sin escribir se marcan igual en todos los idiomas. */
const PLACEHOLDERS: Readonly<Record<Exclude<Language, 'es'>, { from: string; to: string }>> = {
  en: { from: '[texto pendiente]', to: '[text pending]' },
};

function withReading(
  entry: Record<string, unknown>,
  reading: 'superficial' | 'profunda',
  paragraphs: readonly string[] | undefined,
  language: Exclude<Language, 'es'>,
): Record<string, unknown> {
  const original = entry[reading] as { texto?: unknown } | null | undefined;
  if (typeof original !== 'object' || original === null) return entry;
  const placeholder = PLACEHOLDERS[language];
  const texto =
    paragraphs ??
    (Array.isArray(original.texto)
      ? (original.texto as unknown[]).map((p) => (p === placeholder.from ? placeholder.to : p))
      : original.texto);
  return { ...entry, [reading]: { ...original, texto } };
}

export function localizeClues(raw: RawClues, language: Exclude<Language, 'es'>): RawClues {
  const overlay = OVERLAYS[language];
  return {
    hilos: overlayList(raw.hilos, overlay.hilos, (e, t) => ({ ...e, ...t })),
    hechos: overlayList(raw.hechos, overlay.hechos, (e, t) => ({ ...e, ...t })),
    conclusiones: overlayList(raw.conclusiones, overlay.conclusiones, (e, t) => ({ ...e, ...t })),
    fuentes: raw.fuentes.map((entry) => {
      const id = idOf(entry);
      const t: SourceText = (id === undefined ? undefined : overlay.fuentes[id]) ?? {};
      const e = entry as Record<string, unknown>;
      const titled = t.titulo === undefined ? e : { ...e, titulo: t.titulo };
      const first = withReading(titled, 'superficial', t.superficial, language);
      return withReading(first, 'profunda', t.profunda, language);
    }),
  };
}
