// Sesión de lectura: abre una fuente, apunta lo aprendido y lo guarda. Mientras hay una lectura abierta
// el tiempo del ciclo está detenido (decisión de Anthony, CONTEXTO_PISTAS.md §10). Sin DOM: la
// interfaz (ui/readingPanel.ts) solo muestra lo que esta clase devuelve.
import type { Clues, PuzzleReader, Source } from '../registry/clues';
import {
  readSource,
  rumorsOf,
  understoodFacts,
  unlockedConclusions,
  type KnownFacts,
  type ReadingView,
} from '../registry/knowledge';

/** Lo que hace falta para reproducir una grabación (reading/recording.ts). */
export interface OpenRecording {
  /** Ritmo del reloj con que se grabó. */
  rate: number;
  /** Lo que se dice, frase a frase (la lectura profunda de los datos). */
  lines: readonly string[];
  /** Ya se entendió en otro ciclo: la rueda puede empezar en la velocidad buena. */
  understoodBefore: boolean;
}

export interface OpenReading {
  source: Source;
  title: string;
  level: ReadingView['level'];
  text: readonly string[];
  /** La fuente tiene una lectura profunda que todavía no se puede leer. */
  deepPending: boolean;
  /** Hechos que esta lectura acaba de añadir al Registro. */
  newFacts: string[];
  /** Texto provisional que Anthony reescribirá. */
  draft: boolean;
  /** Solo las grabaciones: `text` es lo que se oye al pulsarla y esto, lo que hay que entender. */
  recording?: OpenRecording;
  /** Solo los lectores de puzle: cuál, y si ya se resolvió en otro ciclo. */
  puzzle?: { reader: PuzzleReader; solvedBefore: boolean };
}

type Listener = (facts: string[]) => void;

export class ReadingSession {
  private facts: ReadonlySet<string>;
  private open_: OpenReading | null = null;
  private failed = false;
  private readonly listeners = new Set<Listener>();

  /**
   * @param initialFacts hechos guardados; se ignoran los que ya no existen en los datos.
   * @param persist guarda todos los hechos; devuelve false si no se pudo (se sigue jugando).
   */
  constructor(
    private readonly clues: Clues,
    initialFacts: Iterable<string>,
    private readonly persist: (facts: string[]) => boolean,
  ) {
    this.facts = new Set([...initialFacts].filter((id) => clues.facts.has(id)));
  }

  get known(): KnownFacts {
    return this.facts;
  }

  get current(): OpenReading | null {
    return this.open_;
  }

  /** El tiempo del ciclo debe detenerse (hay una lectura abierta). */
  get frozen(): boolean {
    return this.open_ !== null;
  }

  /** El último guardado falló: lo aprendido no sobrevivirá a cerrar la página. */
  get saveFailed(): boolean {
    return this.failed;
  }

  /** ¿Se puede leer ahora? (existe, y si solo se lee durante un evento, ese evento está activo) */
  isAvailable(sourceId: string, activeEvents: readonly string[]): boolean {
    const source = this.clues.sourceById.get(sourceId);
    if (!source) return false;
    if (source.when !== undefined && !activeEvents.includes(source.when)) return false;
    return (
      source.kind !== 'evento' ||
      (source.eventName !== undefined && activeEvents.includes(source.eventName))
    );
  }

  /** Abre una fuente que no es un evento. Devuelve null si no existe o no está disponible. */
  open(sourceId: string, activeEvents: readonly string[]): OpenReading | null {
    const source = this.clues.sourceById.get(sourceId);
    if (!source || source.kind === 'evento' || !this.isAvailable(sourceId, activeEvents))
      return null;
    if (source.reader) this.open_ = this.puzzle(source, source.reader);
    else this.open_ = source.recordedRate === undefined ? this.read(source) : this.listen(source);
    return this.open_;
  }

  /** Un lector de puzle no anota nada al abrirlo: lo que da se anota al resolverlo (`understand`). */
  private puzzle(source: Source, reader: PuzzleReader): OpenReading {
    return {
      source,
      title: source.title,
      level: 'surface',
      text: source.surface.text,
      deepPending: false,
      newFacts: [],
      draft: source.draft,
      puzzle: { reader, solvedBefore: understoodFacts(source, this.facts).length === 0 },
    };
  }

  private read(source: Source): OpenReading {
    const result = readSource(source, this.facts);
    this.learn(result.newFacts);
    return {
      source,
      title: source.title,
      level: result.level,
      text: result.reading.text,
      deepPending: result.deepPending,
      newFacts: result.newFacts,
      draft: source.draft,
    };
  }

  /** Una grabación da al abrirla solo lo que se oye; lo profundo, al entenderla (`understand`). */
  private listen(source: Source): OpenReading {
    const newFacts = source.surface.facts.filter((id) => !this.facts.has(id));
    this.learn(newFacts);
    return {
      source,
      title: source.title,
      level: 'surface',
      text: source.surface.text,
      deepPending: false,
      newFacts,
      draft: source.draft,
      recording: {
        rate: source.recordedRate ?? 1,
        lines: source.deep?.text ?? source.surface.text,
        understoodBefore: understoodFacts(source, this.facts).length === 0,
      },
    };
  }

  /**
   * La grabación abierta se ha entendido entera, o el puzle abierto se ha resuelto: devuelve los hechos
   * nuevos (vacío si no hay ninguno).
   */
  understand(): string[] {
    const source = this.open_?.source;
    if (!source || !(this.open_?.recording ?? this.open_?.puzzle)) return [];
    const newFacts = understoodFacts(source, this.facts);
    this.learn(newFacts);
    return newFacts;
  }

  close(): void {
    this.open_ = null;
  }

  /** Presencia un evento (sin panel): devuelve los hechos nuevos. */
  witness(sourceId: string, activeEvents: readonly string[]): string[] {
    const source = this.clues.sourceById.get(sourceId);
    if (source?.kind !== 'evento' || !this.isAvailable(sourceId, activeEvents)) return [];
    const { newFacts } = readSource(source, this.facts);
    this.learn(newFacts);
    return newFacts;
  }

  rumors(): string[] {
    return rumorsOf(this.clues, this.facts);
  }

  conclusions(): Set<string> {
    return unlockedConclusions(this.clues, this.facts);
  }

  /** Avisa cuando se aprenden hechos nuevos; devuelve la función para dejar de escuchar. */
  onLearn(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private learn(newFacts: string[]): void {
    if (newFacts.length === 0) return;
    this.facts = new Set([...this.facts, ...newFacts]);
    this.failed = !this.persist([...this.facts]);
    this.listeners.forEach((listener) => {
      listener(newFacts);
    });
  }
}
