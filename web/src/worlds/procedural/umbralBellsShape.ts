// Las medidas del canal de las campanas del Anfiteatro (plan de historia y puzzles físicos, P1; 🟡): en el marco del
// Anfiteatro (Z arriba). Las comparten la geometría (umbralBells.ts) y la vista (render/bellsView.ts).
import { BELLS } from '../../puzzles/bells';
import type { Triple } from './kit';

/** Dónde empieza el canal (su borde de arriba, a la altura del lecho) en el marco del Anfiteatro. */
export const CHANNEL_START: Triple = [-3.2, 3.0, 1.05];
/** Cuánto baja por metro de canal (la pendiente). */
export const CHANNEL_SLOPE = 0.086;
/** El ángulo del plano inclinado (rad), hacia +X. */
export const CHANNEL_TILT = Math.atan(CHANNEL_SLOPE);
/** Lo que mide el canal entero (m, a lo largo): hasta pasada la marca 16. */
export const CHANNEL_LENGTH = BELLS.marks * BELLS.spacing + 0.2;
/** El estante de las campanas y el atril. */
export const RACK_AT: Triple = [-3.95, 0.4, 0];
export const LECTERN_AT: Triple = [3.95, -1.0, 0];
/** Dónde cuelga cada campana en el estante (m a lo largo de su travesaño, en Y). */
export const RACK_SLOTS: readonly number[] = [-0.6, -0.2, 0.2, 0.6];
/** A qué altura va el travesaño del estante y cuánto cuelga la campana. */
export const RACK_BAR = 1.35;
/** Las distancias a lo largo del canal donde van las marcas de interacción (en m desde arriba). */
export const CHANNEL_INTERACT: readonly number[] = [0.8, 2.4, 4.0, 5.6];
/** A qué altura sobre el lecho está la marca de interacción. */
export const INTERACT_LIFT = 0.55;
/** Lo que se aleja de lado quien está «junto al canal» (m). */
export const CHANNEL_REACH = 1.9;

/** Un punto del canal a `s` metros desde arriba y `lift` metros sobre su lecho, en el marco del Anfiteatro. */
export function channelPoint(s: number, lift = 0, side = 0): Triple {
  const [x, y, z] = CHANNEL_START;
  return [
    x + s * Math.cos(CHANNEL_TILT),
    y + side,
    z - s * Math.sin(CHANNEL_TILT) + lift * Math.cos(CHANNEL_TILT),
  ];
}

/** La marca del canal más cercana a un punto del marco del Anfiteatro, o undefined si no se está junto al canal. */
export function markNear(local: Triple): number | undefined {
  const [x0, y0, z0] = CHANNEL_START;
  const dx = local[0] - x0;
  const dz = local[2] - z0;
  const s = dx * Math.cos(CHANNEL_TILT) - dz * Math.sin(CHANNEL_TILT);
  if (Math.abs(local[1] - y0) > CHANNEL_REACH) return undefined;
  const mark = Math.round(s / BELLS.spacing);
  return mark < 1 || mark > BELLS.marks ? undefined : mark;
}
