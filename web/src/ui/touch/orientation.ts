// Jugar es solo en horizontal (✅ Anthony, 2026-11-10). Aquí va la parte pura: cuándo hay que pedir que se gire el
// teléfono y cómo se vigila la orientación. El aviso que se dibuja está en rotateGuard.ts.

export interface RotateState {
  /** Pantalla táctil (teléfono o tableta). */
  touch: boolean;
  /** Más alta que ancha. */
  portrait: boolean;
}

/** El aviso «Gira el teléfono» solo sale en una pantalla táctil sostenida en vertical (con ratón se juega como sea). */
export function shouldShowRotateGuard({ touch, portrait }: RotateState): boolean {
  return touch && portrait;
}

/** Lo que se usa de `matchMedia('(orientation: portrait)')` (un objeto de mentira basta en las pruebas). */
export interface MediaQueryLike {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void, options?: { signal?: AbortSignal }): void;
}

export interface OrientationWatcher {
  readonly portrait: boolean;
  /** Avisa solo cuando cambia la orientación; devuelve la función que lo deja de avisar. */
  subscribe(listener: (portrait: boolean) => void): () => void;
  dispose(): void;
}

export function watchOrientation(query: MediaQueryLike): OrientationWatcher {
  const abort = new AbortController();
  const listeners = new Set<(portrait: boolean) => void>();
  let portrait = query.matches;
  query.addEventListener(
    'change',
    () => {
      if (query.matches === portrait) return;
      portrait = query.matches;
      for (const listener of [...listeners]) listener(portrait);
    },
    { signal: abort.signal },
  );
  return {
    get portrait() {
      return portrait;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      abort.abort();
      listeners.clear();
    },
  };
}
