// La parte pura de los efectos de sonido: qué variante suena, cuánto varía su tono y su volumen, y cuántas voces
// caben a la vez en cada categoría. Sin Web Audio, para poder probarla sin navegador.

/**
 * Elige una variante de `count` sin repetir la anterior (`last`), para que los pasos no suenen «de máquina».
 * Devuelve -1 si no hay ninguna. `random` devuelve un número en [0, 1].
 */
export function pickVariant(count: number, last: number | undefined, random: () => number): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const clamp = (index: number, max: number): number => Math.max(0, Math.min(max, index));
  if (last === undefined || last < 0 || last >= count)
    return clamp(Math.floor(random() * count), count - 1);
  // Se sortea entre las demás y se salta la anterior.
  const index = clamp(Math.floor(random() * (count - 1)), count - 2);
  return index >= last ? index + 1 : index;
}

/** `base` variado hasta ±`amount` (fracción): 1 con 0,1 queda entre 0,9 y 1,1. */
export function spread(base: number, amount: number, random: () => number): number {
  return base * (1 + amount * (random() * 2 - 1));
}

/** Una voz en marcha: `stop` la corta si hace falta sitio. */
export interface VoiceLimiter {
  /** Anota una voz de esa categoría; devuelve lo que hay que llamar cuando termine sola. */
  add(category: string, stop: () => void): () => void;
  count(category: string): number;
}

interface Slot {
  stop: () => void;
}

/**
 * Límite de voces simultáneas por categoría: al llenarse una, la voz más antigua se corta. Las categorías sin
 * límite propio usan `fallback`.
 */
export function createVoiceLimiter(
  limits: Readonly<Record<string, number>>,
  fallback: number,
): VoiceLimiter {
  const active = new Map<string, Slot[]>();
  return {
    add(category, stop) {
      const slots = active.get(category) ?? [];
      active.set(category, slots);
      const limit = limits[category] ?? fallback;
      while (slots.length >= limit) slots.shift()?.stop();
      const slot: Slot = { stop };
      slots.push(slot);
      return () => {
        const at = slots.indexOf(slot);
        if (at >= 0) slots.splice(at, 1);
      };
    },
    count(category) {
      return active.get(category)?.length ?? 0;
    },
  };
}
