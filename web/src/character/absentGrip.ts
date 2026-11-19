// La taza entre las dos palmas (F3). La pose de los gestos (absentGestures.ts) se calcula de perfil y no sabe lo que
// sale cada brazo hacia fuera (hombros, codos, el largo de la mano de cada uno); aquí se mide en el muñeco de verdad
// cuánto deben girar los brazos hacia dentro para que las dos palmas abracen la taza, y el gesto lo usa (`grip`).
// Se mide una vez al montar la escena: lo demás (respirar, girar la taza) apenas lo cambia.
import { Vector3 } from 'three';
import type { AbsentRig } from './absentModel';
import { NEUTRAL_GESTURE, PALM_SHARE, seatedGesture } from './absentGestures';
import { ABSENT_SKELETONS } from './absentSkeleton';

/** Entre las dos palmas (sus ejes): la taza, de 0,12 m, y lo grueso de las manos. */
export const CUP_PALMS_GAP = 0.15;
/** Más allá las manos se cruzan. */
const MAX_TWIST = 1.5;
const SAMPLES = 30;
const BISECTIONS = 20;

const left = new Vector3();
const right = new Vector3();

/** Lo que hay entre las dos palmas del muñeco tal como está posado (m). */
export function palmGap(rig: AbsentRig): number {
  const reach = -ABSENT_SKELETONS[rig.who].handLength * PALM_SHARE;
  rig.root.updateMatrixWorld(true);
  rig.bones.handL.localToWorld(left.set(0, reach, 0));
  rig.bones.handR.localToWorld(right.set(0, reach, 0));
  return left.distanceTo(right);
}

/**
 * El giro hacia dentro de los dos brazos con el que, sosteniendo la taza, las palmas quedan a `gap` (o lo más cerca
 * que se pueda). Deja el muñeco posado con ese giro: quien lo usa lo vuelve a posar en el siguiente fotograma.
 */
export function gripTwist(rig: AbsentRig, gap = CUP_PALMS_GAP): number {
  const pose = seatedGesture(rig.who, 0, { ...NEUTRAL_GESTURE, hold: 1 });
  const gapAt = (twist: number): number => {
    const [armL, armR] = pose.arms;
    rig.setPose({
      ...pose,
      arms: [
        { ...armL, twist },
        { ...armR, twist },
      ],
    });
    return palmGap(rig);
  };
  // Al girar, las palmas se acercan hasta cruzarse: se busca el giro más cerrado y, antes de él, el que da `gap`.
  let closest = 0;
  let narrowest = Infinity;
  for (let k = 0; k <= SAMPLES; k += 1) {
    const twist = (MAX_TWIST * k) / SAMPLES;
    const measured = gapAt(twist);
    if (measured < narrowest) {
      narrowest = measured;
      closest = twist;
    }
  }
  if (narrowest >= gap) return closest;
  let low = 0;
  let high = closest;
  for (let k = 0; k < BISECTIONS; k += 1) {
    const middle = (low + high) / 2;
    if (gapAt(middle) > gap) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
