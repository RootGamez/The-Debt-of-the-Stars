// Pantalla completa para quien juega en el móvil: la parte pura (la lleva un `document` o uno de mentira en las pruebas).

export interface FullscreenDocument {
  fullscreenEnabled?: boolean;
  readonly fullscreenElement: unknown;
  exitFullscreen(): Promise<void>;
  readonly documentElement: { requestFullscreen(): Promise<void> };
}

/** El navegador deja ponerla (el Safari del iPhone no). */
export function canFullscreen(doc: FullscreenDocument): boolean {
  return doc.fullscreenEnabled === true;
}

/** Entra o sale de la pantalla completa; devuelve si queda dentro. Si el navegador se niega, se queda como estaba. */
export async function toggleFullscreen(doc: FullscreenDocument): Promise<boolean> {
  const inside = doc.fullscreenElement !== null;
  try {
    if (inside) await doc.exitFullscreen();
    else await doc.documentElement.requestFullscreen();
    return !inside;
  } catch {
    return inside;
  }
}
