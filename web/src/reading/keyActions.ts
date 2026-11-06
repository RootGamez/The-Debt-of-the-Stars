// Qué hace cada tecla de la lectura (E, R, Tab, Esc) según el estado. Pura y con tests: el DOM solo
// traduce el resultado en llamadas (readingUi.ts). Las combinaciones con Ctrl, Cmd, Alt o Mayús se
// ignoran para no secuestrar atajos del navegador (Ctrl+R, Mayús+Tab…).

export type KeyAction =
  'none' | 'interact' | 'close-reading' | 'close-registry' | 'open-registry' | 'open-tasks';

export interface KeyContext {
  /** El juego está en marcha (no en pausa). */
  playing: boolean;
  readingOpen: boolean;
  registryOpen: boolean;
  /** Se puede empezar una lectura ahora (jugando, en el suelo, sin paneles abiertos). */
  canInteract: boolean;
  /** Hay una fuente al alcance y a la vista. */
  hasTarget: boolean;
  /** Hay tareas que ver (el prólogo): T abre su página del cuaderno. */
  hasTasks: boolean;
}

export interface KeyInput {
  code: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function keyAction(context: KeyContext, key: KeyInput): KeyAction {
  if (key.repeat || key.ctrlKey || key.metaKey || key.altKey || key.shiftKey) return 'none';
  switch (key.code) {
    case 'KeyE':
      // Con una lectura abierta, E la cierra; si no, lee lo que tengas delante.
      return context.readingOpen || (context.canInteract && context.hasTarget)
        ? 'interact'
        : 'none';
    case 'Escape':
      if (context.registryOpen) return 'close-registry';
      return context.readingOpen ? 'close-reading' : 'none';
    case 'KeyR':
      return context.registryOpen ? 'close-registry' : 'open-registry';
    case 'KeyT':
      // Con las tareas del prólogo, T las abre en el cuaderno (y otra vez T lo cierra, como R).
      if (!context.hasTasks) return 'none';
      return context.registryOpen ? 'close-registry' : 'open-tasks';
    case 'Tab':
      // En pausa, Tab sigue moviendo el foco entre los botones.
      return context.playing ? 'open-registry' : 'none';
    default:
      return 'none';
  }
}
