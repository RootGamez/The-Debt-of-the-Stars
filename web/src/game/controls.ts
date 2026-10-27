// Los controles del jugador: ratón, teclado, táctil y la pantalla de pausa.
import { InputController } from '../core/inputController';
import type { LoopSession } from '../core/loopSession';
import { createPauseOverlay, isTouchDevice, type PauseOverlay } from '../ui/pauseOverlay';
import { createTouchControls, type TouchControls } from '../ui/touchControls';

export interface TouchShipControls {
  isPiloting: () => boolean;
  onShipAction: (action: 'board' | 'target' | 'stabilize') => void;
}

export function createControls(
  canvas: HTMLCanvasElement,
  title: string,
  session: LoopSession,
  openRegistry: () => void,
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
    },
  );
  input.dragLookEnabled = () => overlay.dragLook;
  if (isTouchDevice()) {
    touch = createTouchControls(canvas, input, {
      isPlaying: () => overlay.playing,
      isPiloting: shipControls?.isPiloting ?? (() => false),
      onShipAction: shipControls?.onShipAction ?? (() => {}),
      onPause: () => {
        overlay.pause();
      },
    });
    touch.setVisible(false);
  }
  return { input, overlay, touch };
}
