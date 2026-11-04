// Lo que muestra el panel del Registro, calculado a partir de lo que se sabe. Pura: la interfaz
// (ui/registryPanel.ts) solo pinta este resultado. Un hecho sale una sola vez, bajo su primer hilo.
import type { Clues, Thread } from './clues';
import { relatedFacts, rumorsOf, unlockedConclusions, type KnownFacts } from './knowledge';
import { t } from '../i18n';

export interface FactView {
  id: string;
  line: string;
  related: { id: string; line: string }[];
}

export interface RumorView {
  id: string;
  question: string;
}

export interface ThreadView {
  thread: Thread;
  facts: FactView[];
  rumors: RumorView[];
  /** Hechos conocidos y hechos que el hilo puede llegar a dar. */
  known: number;
  total: number;
}

export interface ConclusionView {
  id: string;
  title: string;
  thread: string;
}

export interface RegistryView {
  threads: ThreadView[];
  /** "Lo que sé": conclusiones desbloqueadas, en el orden de los datos. */
  conclusions: ConclusionView[];
  totalFacts: number;
}

export function buildRegistryView(clues: Clues, known: KnownFacts): RegistryView {
  const rumors = rumorsOf(clues, known);
  const unlocked = unlockedConclusions(clues, known);
  const lineOf = (id: string): string => clues.facts.get(id)?.line ?? id;
  const threads = clues.threads.map((thread): ThreadView => {
    const own = [...clues.facts.values()].filter((f) => f.threads[0] === thread.id);
    return {
      thread,
      facts: own
        .filter((f) => known.has(f.id))
        .map((f) => ({
          id: f.id,
          line: f.line,
          related: relatedFacts(clues, known, f.id).map((id) => ({ id, line: lineOf(id) })),
        })),
      rumors: rumors
        .filter((id) => clues.facts.get(id)?.threads[0] === thread.id)
        .map((id) => ({ id, question: clues.facts.get(id)?.rumor ?? t('Algo que aún no sé…') })),
      known: own.filter((f) => known.has(f.id)).length,
      total: own.length,
    };
  });
  return {
    threads,
    conclusions: clues.conclusions
      .filter((c) => unlocked.has(c.id))
      .map((c) => ({ id: c.id, title: c.title, thread: c.thread })),
    totalFacts: threads.reduce((sum, t) => sum + t.known, 0),
  };
}
