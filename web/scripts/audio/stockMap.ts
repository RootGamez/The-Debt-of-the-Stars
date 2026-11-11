// Del mapa de stock (qué sonido del juego sale de qué archivo de un paquete libre) al índice que lee el motor de
// samples y al registro de créditos. Lógica pura: la importación (importStock.ts) solo lista carpetas, llama a
// ffmpeg y escribe lo que sale de aquí.

export interface StockPack {
  name: string;
  url: string;
  author: string;
  license: string;
}

export interface StockSoundSpec {
  category: string;
  gain?: number;
  loop?: boolean;
  /** Recorta el sonido a estos segundos (con un fundido de salida corto). */
  trim?: number;
  /** Quita los agudos por encima de esta frecuencia (Hz): un sonido más sordo y suave. */
  lowpass?: number;
  /** `paquete:nombre` o `paquete:prefijo*`; el nombre va sin extensión. */
  from: string[];
}

export interface StockMap {
  version: 1;
  packs: Record<string, StockPack>;
  sounds: Record<string, StockSoundSpec>;
}

export interface ResolvedFile {
  pack: string;
  source: string;
  out: string;
}

export interface ResolvedSound {
  category: string;
  gain: number;
  loop: boolean;
  trim?: number;
  lowpass?: number;
  files: ResolvedFile[];
}

export interface ResolvedMap {
  sounds: Record<string, ResolvedSound>;
  problems: string[];
}

export interface IndexEntry {
  files: string[];
  category: string;
  gain: number;
  loop: boolean;
}

export interface CreditLine {
  file: string;
  sound: string;
  pack: string;
  source: string;
  author: string;
  license: string;
  url: string;
}

/** Los nombres de `names` que casan con el patrón (exacto o con `*` al final), en orden alfabético. */
export function matchPattern(pattern: string, names: readonly string[]): string[] {
  const sorted = [...names].sort();
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return sorted.filter((name) => name.startsWith(prefix));
  }
  return sorted.filter((name) => name === pattern);
}

/** `step.rock` + 2 → `step_rock_2.mp3`. */
function outName(id: string, position: number): string {
  return `${id.replace(/[^a-zA-Z0-9]+/g, '_')}_${position}.mp3`;
}

/** Busca cada patrón en los archivos disponibles; los sonidos que no se pueden completar se descartan y se avisa. */
export function resolveStockMap(
  map: StockMap,
  available: Readonly<Record<string, readonly string[]>>,
): ResolvedMap {
  const sounds: Record<string, ResolvedSound> = {};
  const problems: string[] = [];

  for (const [id, spec] of Object.entries(map.sounds)) {
    const sources: { pack: string; source: string }[] = [];
    let failed = false;
    for (const entry of spec.from) {
      const split = entry.indexOf(':');
      if (split <= 0 || split === entry.length - 1) {
        problems.push(`${id}: «${entry}» debe escribirse paquete:nombre`);
        failed = true;
        continue;
      }
      const pack = entry.slice(0, split);
      const files = available[pack];
      if (!files || !(pack in map.packs)) {
        problems.push(`${id}: no hay paquete «${pack}»`);
        failed = true;
        continue;
      }
      const matches = matchPattern(entry.slice(split + 1), files);
      if (matches.length === 0) {
        problems.push(`${id}: «${entry}» no encuentra ningún archivo`);
        failed = true;
        continue;
      }
      for (const source of matches) {
        if (!sources.some((s) => s.pack === pack && s.source === source))
          sources.push({ pack, source });
      }
    }
    if (failed) continue;
    sounds[id] = {
      category: spec.category,
      gain: spec.gain ?? 1,
      loop: spec.loop ?? false,
      ...(spec.trim === undefined ? {} : { trim: spec.trim }),
      ...(spec.lowpass === undefined ? {} : { lowpass: spec.lowpass }),
      files: sources.map((s, i) => ({ ...s, out: outName(id, i + 1) })),
    };
  }
  return { sounds, problems };
}

/** El `index.json` que lee `audio/sampleBank.ts`. */
export function buildIndex(sounds: Readonly<Record<string, ResolvedSound>>): {
  version: 1;
  sounds: Record<string, IndexEntry>;
} {
  const entries: Record<string, IndexEntry> = {};
  for (const [id, sound] of Object.entries(sounds)) {
    entries[id] = {
      files: sound.files.map((f) => f.out),
      category: sound.category,
      gain: sound.gain,
      loop: sound.loop,
    };
  }
  return { version: 1, sounds: entries };
}

/** De dónde sale cada archivo que se publica, con autor y licencia. */
export function buildCredits(
  sounds: Readonly<Record<string, ResolvedSound>>,
  packs: Readonly<Record<string, StockPack>>,
): CreditLine[] {
  const lines: CreditLine[] = [];
  for (const [id, sound] of Object.entries(sounds)) {
    for (const file of sound.files) {
      const pack = packs[file.pack];
      if (!pack) continue;
      lines.push({
        file: file.out,
        sound: id,
        pack: pack.name,
        source: file.source,
        author: pack.author,
        license: pack.license,
        url: pack.url,
      });
    }
  }
  return lines;
}
