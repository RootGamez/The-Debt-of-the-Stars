// Detecta cuándo algo se enciende o se apaga (la luz del cuerpo, abrir el Registro, leer) para dar un sonido por
// cada cambio. La primera vez que se ve un estado no cuenta como cambio: al cargar el juego no suena nada.

export interface EdgeTracker {
  /** `'on'` o `'off'` en el fotograma en que `name` cambia; `undefined` el resto del tiempo. */
  update(name: string, value: boolean): 'on' | 'off' | undefined;
}

export function createEdgeTracker(): EdgeTracker {
  const last = new Map<string, boolean>();
  return {
    update(name, value) {
      const before = last.get(name);
      last.set(name, value);
      if (before === undefined || before === value) return undefined;
      return value ? 'on' : 'off';
    },
  };
}
