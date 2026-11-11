// Los controles del jugador: ratón, teclado, táctil y la pantalla de pausa.
import type { ShipAction } from './shipFlight';
import { InputController } from '../core/inputController';
import type { LoopSession } from '../core/loopSession';
import type { TextSettings } from '../typewriter/textPreferences';
import {
  createPauseOverlay,
  isTouchDevice,
  type DisplaySettings,
  type PauseOverlay,
} from '../ui/pauseOverlay';
import { createTouchControls, type TouchControls } from '../ui/touchControls';
import type { TouchContext } from '../ui/touch/touchContext';

export interface TouchShipControls {
  /** Lo que pasa ahora en el juego, para mostrar solo los botones táctiles que sirven. */
  context: () => TouchContext;
  onShipAction: (action: ShipAction) => void;
}

/** Sin nave (los mundos sin ella): a pie, jugando. */
export const ON_FOOT: TouchContext = {
  playing: true,
  piloting: false,
  landed: true,
  altitude: undefined,
  stabilize: true,
  station: undefined,
  swimming: false,
};

export function createControls(
  canvas: HTMLCanvasElement,
  title: string,
  session: LoopSession,
  openRegistry: () => void,
  text: { settings: TextSettings; display: DisplaySettings; onLetterSample: () => void },
  shipControls?: TouchShipControls,
): { input: InputController; overlay: PauseOverlay; touch?: TouchControls } {
  const input = new InputController(canvas);
  let touch: TouchControls | undefined;
  const overlay = createPauseOverlay(
    canvas,
    title,
    () => {
      input.reset();
      touch?.setVisible(overlay.playing);
    },
    {
      loops: () => session.director.loopsCompleted,
      savingWorks: () => session.savingWorks,
      onResetProgress: () => session.resetProgress(),
      onOpenRegistry: openRegistry,
      settings: text.settings,
      display: text.display,
      onLetterSample: text.onLetterSample,
    },
  );
  input.dragLookEnabled = () => overlay.dragLook;
  if (isTouchDevice()) {
    touch = createTouchControls(canvas, input, {
      isPlaying: () => overlay.playing,
      context: shipControls?.context ?? (() => ON_FOOT),
      onShipAction: shipControls?.onShipAction ?? (() => {}),
      onPause: () => {
        overlay.pause();
      },
    });
    touch.setVisible(false);
  }
  return { input, overlay, touch };
}
