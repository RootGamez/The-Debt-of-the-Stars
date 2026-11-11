// Ceder el paso al navegador entre dos trabajos largos: deja que dibuje (la pantalla de carga) y atienda los gestos
// (el que desbloquea la música). Con la pestaña oculta no hay fotogramas: entonces se sigue tras un momento.

/** Lo que se espera como mucho a un fotograma (ms) antes de seguir igualmente. */
const FALLBACK_MS = 100;

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    // Tras el fotograma, un turno más: así lo dibujado llega a la pantalla antes de seguir trabajando.
    requestAnimationFrame(() => setTimeout(finish, 0));
    setTimeout(finish, FALLBACK_MS);
  });
}
