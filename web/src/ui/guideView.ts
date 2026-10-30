// El aviso de la guía del prólogo (game/guide.ts): una línea discreta arriba, en el centro, que aparece despacio,
// cambia cuando se aprende lo que pide y se esconde mientras lees o en pausa. Se anuncia a los lectores de
// pantalla sin robar el foco.
import { guideText, type GuideStep } from '../game/guide';

export interface GuideView {
  /** `step`: el aviso que toca (o ninguno); `visible`: si se puede mostrar ahora (no en pausa ni leyendo). */
  update(step: GuideStep | undefined, visible: boolean): void;
  /** Para depurar y las pruebas: el aviso a la vista, si hay. */
  readonly shown: GuideStep | undefined;
  dispose(): void;
}

export function createGuideView(touch: boolean): GuideView {
  const element = document.createElement('p');
  element.className = 'guia';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  document.body.append(element);
  let current: GuideStep | undefined;
  let showing = false;

  return {
    update(step, visible) {
      if (step !== current) {
        current = step;
        element.textContent = step ? guideText(step, touch) : '';
      }
      const show = visible && step !== undefined;
      if (show !== showing) {
        showing = show;
        element.classList.toggle('guia-visible', show);
      }
    },
    get shown() {
      return showing ? current : undefined;
    },
    dispose() {
      element.remove();
    },
  };
}
