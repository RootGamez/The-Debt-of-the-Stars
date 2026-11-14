// Geometría del plano de perfil de los Ausentes vivos (plan de finales, E3; lógica pura): y hacia delante, z arriba.
// La usan las poses (absentPoses.ts) para poner los pies en el suelo y las manos en los muslos.

export interface Planar {
  readonly y: number;
  readonly z: number;
}

export const planar = (t: readonly [number, number, number]): Planar => ({ y: t[1], z: t[2] });
export const add = (a: Planar, b: Planar): Planar => ({ y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Planar, b: Planar): Planar => ({ y: a.y - b.y, z: a.z - b.z });
export const scaled = (a: Planar, k: number): Planar => ({ y: a.y * k, z: a.z * k });
export const length = (a: Planar): number => Math.hypot(a.y, a.z);

/** Gira en el plano de perfil como un giro de X: un ángulo > 0 lleva lo de abajo hacia delante. */
export function rotate(p: Planar, angle: number): Planar {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

/** Ángulo de una dirección medido desde «hacia abajo», > 0 hacia delante. */
export const angleOf = (v: Planar): number => Math.atan2(v.y, -v.z);

/** Un tramo de largo `size` en la dirección `angle` (medida desde «hacia abajo»). */
export const along = (angle: number, size: number): Planar => ({
  y: size * Math.sin(angle),
  z: -size * Math.cos(angle),
});

export const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
export const finite = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);

/**
 * Dos huesos de `root` a `target` (ángulos desde «hacia abajo» de cada uno). `bend` +1 deja la articulación de en
 * medio por delante de la línea (la rodilla); −1, por detrás (el codo). Si no llega, se estira hacia el objetivo.
 */
export function twoBone(
  root: Planar,
  target: Planar,
  first: number,
  second: number,
  bend: 1 | -1,
): [number, number] {
  const toTarget = sub(target, root);
  const reach = clamp(length(toTarget), Math.abs(first - second) + 1e-4, first + second - 1e-4);
  const cosine = (first * first + reach * reach - second * second) / (2 * first * reach);
  const a = angleOf(toTarget) + bend * Math.acos(clamp(cosine, -1, 1));
  return [a, angleOf(sub(target, add(root, along(a, first))))];
}
