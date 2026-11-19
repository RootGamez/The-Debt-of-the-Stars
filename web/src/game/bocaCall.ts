// La llamada de La Boca (plan de los finales, F2; los números son 🟡): a las 10:00 La Boca de Umbral contesta la llamada
// del Límite y se abre unos 20 s como una esfera de gusano con el cielo azul de Hogar en el centro. Cruzarla, a pie y
// confirmándolo, te saca por la Puerta Mayor años después: el final malo («Llegas tarde», `via=boca`). Lógica pura.

/** Cuándo se abre (segundos del ciclo; el mismo minuto 10 del destello) y cuánto dura. */
export const BOCA_CALL_START = 600;
export const BOCA_CALL_DURATION = 20;
/**
 * A cuántos metros del centro de la esfera se pregunta si cruzar. El centro está a unos 4,5 m sobre la plataforma,
 * así que con 3 m solo se alcanzaba subido al ara; a 6 m se pregunta desde los escalones.
 */
export const BOCA_ASK_RADIUS = 6;

/** Si La Boca está abierta en este instante del ciclo. */
export function bocaCallOpen(loopTime: number): boolean {
  return loopTime >= BOCA_CALL_START && loopTime < BOCA_CALL_START + BOCA_CALL_DURATION;
}

/** `closed`: nada; `visible`: abierta y lejos; `ask`: cerca, a la espera de confirmar; `cross`: confirmado. */
export type BocaCallStep = 'closed' | 'visible' | 'ask' | 'cross';

/** Qué toca ahora: `distance` es a pie hasta el centro de la esfera (m); `confirmed`, que el jugador aceptó cruzar. */
export function bocaCallStep(loopTime: number, distance: number, confirmed: boolean): BocaCallStep {
  if (!bocaCallOpen(loopTime)) return 'closed';
  if (distance > BOCA_ASK_RADIUS) return 'visible';
  return confirmed ? 'cross' : 'ask';
}
