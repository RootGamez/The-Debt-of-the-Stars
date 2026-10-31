// Quién dice cada frase de una charla (plan del HUD, C.1). La regla sale de los propios textos, sin tocar los
// JSON: lo que empieza por «…» lo dice el personaje de la fuente (su nombre en ámbar y su retrato); lo demás es
// narración, en cursiva y sin nombre. Y el tono de la voz de letras de cada uno.

export interface SpeechLine {
  text: string;
  /** Quien la dice; undefined = narración. */
  speaker: string | undefined;
}

export function speechLines(paragraphs: readonly string[], speaker: string): SpeechLine[] {
  return paragraphs.map((paragraph) => {
    const text = paragraph.trim();
    return { text, speaker: text.startsWith('«') ? speaker : undefined };
  });
}

/** Los retratos dibujados: la Directora (tres filamentos), la Maestra (gafas y bufanda) y cualquier otro Ool. */
export type PortraitKind = 'directora' | 'maestra' | 'ool';

export function portraitOf(sourceId: string): PortraitKind {
  if (sourceId.endsWith('.directora')) return 'directora';
  if (sourceId.endsWith('.maestra')) return 'maestra';
  return 'ool';
}

/** Tonos de la voz de letras (Hz): agradables, ni graves ni chillones. */
const LOW_PITCH = 190;
const PITCH_RANGE = 230;
/** La pluma del narrador y de lo que se lee. */
const NARRATOR_PITCH = 260;

/** El tono de cada personaje: siempre el mismo para el mismo nombre. */
export function voicePitch(speaker: string | undefined): number {
  if (speaker === undefined) return NARRATOR_PITCH;
  let hash = 2166136261;
  for (const char of speaker) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return LOW_PITCH + ((hash >>> 0) % PITCH_RANGE);
}
