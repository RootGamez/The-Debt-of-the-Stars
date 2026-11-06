// Lo que muestra el panel del Registro, calculado a partir de lo que se sabe. Pura: la interfaz
// (ui/registryPanel.ts) solo pinta este resultado. Un hecho sale una sola vez, bajo su primer hilo.
import type { Clues, Thread } from './clues';
import { relatedFacts, rumorsOf, unlockedConclusions, type KnownFacts } from './knowledge';
import { t } from '../i18n';

export interface FactView {
  id: string;
  line: string;
  /** Dibujo del cuaderno que acompaña al hecho. */
  sketch?: string;
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

/** Un trozo de una conclusión: lo que ya sé o, si falta, su pregunta y una orientación vaga. */
export interface DeductionPiece {
  met: boolean;
  line: string;
  lead?: string;
  /** El dibujo del hecho que ya se sabe. */
  sketch?: string;
}

/** La página de deducción de una conclusión empezada (plan de historia y puzzles, §5.1). */
export interface DeductionView {
  id: string;
  title: string;
  unlocked: boolean;
  /** Lo que ahora sé y qué puedo hacer: solo cuando está completa. */
  knowLine?: string;
  action?: string;
  pieces: DeductionPiece[];
}

export interface RegistryView {
  threads: ThreadView[];
  /** "Lo que sé": conclusiones desbloqueadas, en el orden de los datos. */
  conclusions: ConclusionView[];
  /** Las conclusiones de las que ya se sabe algo, completas o no, en el orden de los datos. */
  deductions: DeductionView[];
  totalFacts: number;
}

/** Lo que se ve de un trozo: el primer id del grupo que ya se sabe o, si ninguno, la pregunta del primero. */
function pieceOf(
  clues: Clues,
  group: readonly string[],
  known: KnownFacts,
  unlocked: ReadonlySet<string>,
): DeductionPiece {
  const metId = group.find((id) => known.has(id) || unlocked.has(id));
  if (metId !== undefined) {
    const fact = clues.facts.get(metId);
    const conclusion = clues.conclusionById.get(metId);
    const line = fact?.line ?? conclusion?.title ?? metId;
    return fact?.sketch === undefined
      ? { met: true, line }
      : { met: true, line, sketch: fact.sketch };
  }
  const first = group[0] ?? '';
  const fact = clues.facts.get(first);
  const conclusion = clues.conclusionById.get(first);
  const line = fact
    ? (fact.rumor ?? t('Algo que aún no sé…'))
    : (conclusion?.question ?? conclusion?.title ?? first);
  const lead = group.map((id) => clues.facts.get(id)?.lead).find((l) => l !== undefined);
  return lead === undefined ? { met: false, line } : { met: false, line, lead };
}

function deductionsOf(
  clues: Clues,
  known: KnownFacts,
  unlocked: ReadonlySet<string>,
): DeductionView[] {
  return clues.conclusions.flatMap((conclusion): DeductionView[] => {
    const pieces = conclusion.requires.map((group) => pieceOf(clues, group, known, unlocked));
    if (!pieces.some((piece) => piece.met)) return [];
    const done = unlocked.has(conclusion.id);
    return [
      {
        id: conclusion.id,
        title: conclusion.title,
        unlocked: done,
        ...(done && conclusion.knowLine !== undefined && { knowLine: conclusion.knowLine }),
        ...(done && conclusion.action !== undefined && { action: conclusion.action }),
        pieces,
      },
    ];
  });
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
          ...(f.sketch === undefined ? {} : { sketch: f.sketch }),
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
    deductions: deductionsOf(clues, known, unlocked),
    totalFacts: threads.reduce((sum, t) => sum + t.known, 0),
  };
}
