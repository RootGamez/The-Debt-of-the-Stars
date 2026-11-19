// Curvas de ritmo de las cinemáticas (puro): cómo se reparte el movimiento de un plano en su tiempo.

export const EASES = ['linear', 'in', 'out', 'inOut', 'smooth'] as const;
/**
 * `linear` constante · `in` arranca despacio · `out` frena al final · `inOut` arranca y frena (smoothstep) ·
 * `smooth` como `inOut` pero con los extremos aún más quietos (smootherstep).
 */
export type Ease = (typeof EASES)[number];

export function clamp01(x: number): number {
  if (!(x > 0)) return 0;
  return x < 1 ? x : 1;
}

export function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

/** 0 antes de `from`, 1 después de `to` y una subida suave entre los dos. */
export function smoothstep(from: number, to: number, x: number): number {
  if (to <= from) return x < from ? 0 : 1;
  const u = clamp01((x - from) / (to - from));
  return u * u * (3 - 2 * u);
}

export function ease(kind: Ease, x: number): number {
  const u = clamp01(x);
  switch (kind) {
    case 'linear':
      return u;
    case 'in':
      return u * u;
    case 'out':
      return 1 - (1 - u) * (1 - u);
    case 'inOut':
      return u * u * (3 - 2 * u);
    case 'smooth':
      return u * u * u * (u * (u * 6 - 15) + 10);
  }
}
