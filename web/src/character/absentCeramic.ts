// Las placas de cerámica de los Ausentes vivos (plan de finales, E3): un tramo de superficie suave entre dos alturas
// con el labio de abajo redondeado hacia dentro (y algo más oscuro, como la sombra de una juntura), la punta de arriba
// metida bajo la placa siguiente y, por medio, ranuras finas entre placas. Así una articulación se lee como dos piezas
// que encajan, no como dos conos que se cruzan.
import { Color } from 'three';
import type { Section } from './absentShape';
import { loftGeometry, plateEdge, rowsBetween, smooth01 } from './absentLoft';
import type { AbsentContext, AbsentSegment } from './absentParts';

export interface PlateOptions {
  /** Alto del labio de abajo (m; 0 sin labio: la pieza nace dentro de otra). */
  lip?: number;
  /** Lo que sigue por arriba, hundida bajo la siguiente (m). */
  tuck?: number;
  /** Ranuras entre placas, a esas alturas. */
  seams?: readonly number[];
  /** Columnas alrededor y separación máxima entre filas (m). */
  columns?: number;
  step?: number;
  /** Otro color de base (la punta de los dedos, el talón). */
  color?: string;
}

const SEAM_HALF = 0.006;
const SEAM_DEPTH = 0.0035;
const LIP_INSET = 0.007;

/** Cuánto se hunde una ranura en `z` (0 lejos de ellas, 1 en su fondo). */
function seamAt(seams: readonly number[], z: number): number {
  let deepest = 0;
  for (const seam of seams) {
    const d = Math.abs(z - seam) / SEAM_HALF;
    if (d < 1) deepest = Math.max(deepest, 1 - d * d);
  }
  return deepest;
}

/** Una placa de cerámica que sigue `sections` de `from` a `to`. */
export function ceramicPlate(
  s: AbsentSegment,
  c: AbsentContext,
  sections: readonly Section[],
  from: number,
  to: number,
  options: PlateOptions = {},
): void {
  const lip = options.lip ?? 0.018;
  const tuck = options.tuck ?? 0;
  const seams = (options.seams ?? []).filter((z) => z > from + lip && z < to);
  // Las filas justas: el sombreado suave redondea lo demás (el presupuesto es de 12.000 triángulos por Ausente).
  const extra = [
    ...(lip > 0 ? [from + lip * 0.35, from + lip] : []),
    ...seams.flatMap((z) => [z - SEAM_HALF, z, z + SEAM_HALF]),
    ...(tuck > 0 ? [to, to + Math.min(0.01, tuck)] : []),
  ];
  const rows = rowsBetween(from, to + tuck, options.step ?? 0.075, extra);
  const base = new Color(options.color ?? c.look.ceramic);
  const dark = new Color(c.look.seam);
  const shadeTone = new Color(c.look.ceramicShade);
  const colorAt = (z: number): Color => {
    const color = base.clone();
    // El labio y la punta metida, en la sombra de la juntura.
    if (lip > 0) color.lerp(shadeTone, 0.55 * (1 - smooth01(from, from + lip * 1.4, z)));
    if (tuck > 0 && z > to) color.lerp(dark, 0.6);
    return color.lerp(dark, 0.75 * seamAt(seams, z));
  };
  const cache = new Map<number, Color>();
  s.addWoven(
    'ceramic',
    loftGeometry(sections, {
      rows,
      columns: options.columns ?? 16,
      lift: (_, z) =>
        plateEdge(from, to, z, { lip, inset: LIP_INSET, tuck }) - SEAM_DEPTH * seamAt(seams, z),
      color: (_, z) => {
        let hit = cache.get(z);
        if (!hit) {
          hit = colorAt(z);
          cache.set(z, hit);
        }
        return hit;
      },
    }),
  );
}
