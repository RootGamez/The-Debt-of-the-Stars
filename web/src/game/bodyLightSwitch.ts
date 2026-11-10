// El interruptor de la luz del cuerpo: la L la enciende y la apaga (no mientras se escribe en un campo de texto).
// Lo que se ve y cómo se funde lo lleva `render/explorerView.ts`; aquí solo se recuerda si está encendida.

export const BODY_LIGHT_KEY = 'KeyL';

export interface BodyLightSwitch {
  readonly on: boolean;
  toggle(): void;
  dispose(): void;
}

/** `enabled` dice si la tecla cuenta ahora (p. ej. solo jugando, no en el menú ni pilotando). */
export function createBodyLightSwitch(enabled: () => boolean = () => true): BodyLightSwitch {
  let on = false;
  const abort = new AbortController();
  const toggle = (): void => {
    on = !on;
  };
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.code !== BODY_LIGHT_KEY || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (!enabled()) return;
      toggle();
    },
    { signal: abort.signal },
  );
  return {
    get on() {
      return on;
    },
    toggle,
    dispose() {
      abort.abort();
    },
  };
}
