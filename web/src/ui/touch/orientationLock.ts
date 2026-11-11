// Bloquear la pantalla en horizontal con la API del navegador. Es solo una ayuda: Chrome en Android lo permite en
// pantalla completa, y el iPhone no tiene esta API. Lo que de verdad garantiza el horizontal es el aviso de
// rotateGuard.ts; aquí todo fallo se ignora.

export interface LockScreen {
  readonly orientation?: {
    lock?(orientation: 'landscape'): Promise<void>;
    unlock?(): void;
  };
}

export interface LockDocument {
  readonly fullscreenElement: unknown;
  addEventListener(type: string, listener: () => void, options?: { signal?: AbortSignal }): void;
}

/** Pide el bloqueo al primer toque y al entrar en pantalla completa; lo suelta al salir. Devuelve cómo quitarlo. */
export function installLandscapeLock(doc: LockDocument, screen: LockScreen): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const { orientation } = screen;

  const lock = (): void => {
    try {
      Promise.resolve(orientation?.lock?.('landscape')).catch(() => {
        // Sin permiso (no está en pantalla completa) o sin soporte: el aviso de girar cubre el caso.
      });
    } catch {
      // Algunos navegadores lanzan en vez de rechazar.
    }
  };

  let asked = false;
  doc.addEventListener(
    'pointerup',
    () => {
      if (asked) return;
      asked = true;
      lock();
    },
    { signal },
  );
  doc.addEventListener(
    'fullscreenchange',
    () => {
      if (doc.fullscreenElement !== null) lock();
      else orientation?.unlock?.();
    },
    { signal },
  );
  return () => {
    abort.abort();
  };
}
