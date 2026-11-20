// Filtro de la mirada del ratón. Con el puntero capturado, Chrome en Windows devuelve el cursor al centro de la ventana
// y, con ratones de sondeo alto (1000 Hz), a veces un evento mide el movimiento a través de ese salto: llega un
// `movementX` de cientos o miles de píxeles y la vista se «teletransporta». Ningún gesto real da tanto en un solo
// evento (un giro muy rápido a 1000 Hz son unas decenas de píxeles; a 125 Hz, menos de 100), así que se descarta.

/** Más que esto (px, en un solo evento y en cualquier eje) no es un gesto: es un salto del cursor. */
export const MAX_LOOK_EVENT_PIXELS = 300;

/** Devuelve el movimiento del evento o null si es un salto imposible que hay que descartar. */
export function filterLookEvent(dx: number, dy: number): { x: number; y: number } | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) > MAX_LOOK_EVENT_PIXELS || Math.abs(dy) > MAX_LOOK_EVENT_PIXELS) return null;
  return { x: dx, y: dy };
}
