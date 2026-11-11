// La parte pura del generador de sonidos (ElevenLabs): qué hay que generar, cuánto costará, cuánto queda del
// presupuesto y cómo se mezclan los sonidos generados con los de stock en el mismo `index.json`. El script
// (generate.ts) solo llama a la API, escribe archivos y guarda el libro de cuentas.

export interface GenerateSoundSpec {
  category: string;
  gain?: number;
  loop?: boolean;
  /** Segundos pedidos a la API (0,5–30); es lo que se paga. */
  duration: number;
  /** Cuántas versiones generar para elegir (se guardan todas; el juego usa una al azar). */
  variants: number;
  prompt: string;
  /** 0–1: cuánto se pega la API al texto (más alto, más literal). */
  promptInfluence?: number;
  /** Se pasa por ffmpeg para quitar agudos molestos (Hz). */
  lowpass?: number;
}

export interface GenerateManifest {
  model: string;
  sounds: Record<string, GenerateSoundSpec>;
}

export interface Job {
  id: string;
  variant: number;
  /** Archivo en bruto, tal como lo devolvió la API. */
  file: string;
  prompt: string;
  duration: number;
  loop: boolean;
  promptInfluence: number | undefined;
  credits: number;
}

export interface SpendEntry {
  id: string;
  file: string;
  credits: number;
  at: string;
}

export interface Ledger {
  budget: number;
  spent: number;
  entries: SpendEntry[];
  /** Créditos por segundo medidos en una generación real (sustituyen a la estimación por defecto). */
  creditsPerSecond?: number;
}

/** Lo que se estima antes de medir el coste real. */
export const DEFAULT_CREDITS_PER_SECOND = 40;

export function estimateCredits(duration: number, creditsPerSecond: number): number {
  return Math.max(1, Math.ceil(duration * creditsPerSecond));
}

/** `wormhole.cross` + 2 → `wormhole_cross_2.mp3`. */
export function rawName(id: string, variant: number): string {
  return `${id.replace(/[^a-zA-Z0-9]+/g, '_')}_${variant}.mp3`;
}

export interface PlanOptions {
  /** Solo estos sonidos. */
  only?: readonly string[];
  /** Como mucho este número de trabajos. */
  limit?: number;
}

/** Lo que falta por generar (sin repetir lo que ya existe) y su coste estimado. */
export function planJobs(
  manifest: GenerateManifest,
  existing: ReadonlySet<string>,
  creditsPerSecond: number,
  options: PlanOptions = {},
): { jobs: Job[]; estimate: number } {
  const jobs: Job[] = [];
  for (const [id, spec] of Object.entries(manifest.sounds)) {
    if (options.only && !options.only.includes(id)) continue;
    for (let variant = 1; variant <= spec.variants; variant++) {
      const file = rawName(id, variant);
      if (existing.has(file)) continue;
      jobs.push({
        id,
        variant,
        file,
        prompt: spec.prompt,
        duration: spec.duration,
        loop: spec.loop ?? false,
        promptInfluence: spec.promptInfluence,
        credits: estimateCredits(spec.duration, creditsPerSecond),
      });
    }
  }
  const chosen = options.limit === undefined ? jobs : jobs.slice(0, options.limit);
  return { jobs: chosen, estimate: chosen.reduce((sum, job) => sum + job.credits, 0) };
}

export function budgetLeft(ledger: Ledger): number {
  return Math.max(0, ledger.budget - ledger.spent);
}

/** Un libro de cuentas nuevo con ese gasto anotado; el anterior no se toca. */
export function recordSpend(ledger: Ledger, entry: SpendEntry): Ledger {
  return { ...ledger, spent: ledger.spent + entry.credits, entries: [...ledger.entries, entry] };
}

export interface IndexEntry {
  files: string[];
  category: string;
  gain: number;
  loop: boolean;
}

export interface SoundIndex {
  version: 1;
  sounds: Record<string, IndexEntry>;
}

/**
 * Junta lo que produce un script con el índice que ya hay: quita los sonidos que ese script ya había producido
 * (`ownedIds`) y pone los nuevos. Los de otros productores (stock o generados) no se tocan.
 */
export function mergeIndex(
  existing: SoundIndex | undefined,
  ownedIds: readonly string[],
  produced: Readonly<Record<string, IndexEntry>>,
): SoundIndex {
  const kept = Object.fromEntries(
    Object.entries(existing?.sounds ?? {}).filter(([id]) => !ownedIds.includes(id)),
  );
  return { version: 1, sounds: { ...kept, ...produced } };
}
