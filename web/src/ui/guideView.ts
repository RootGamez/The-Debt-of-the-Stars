// El aviso de la tarea del prólogo (game/tasks.ts): una línea discreta arriba, en el centro, que aparece despacio al
// empezar una tarea, se va a los pocos segundos y se esconde mientras lees o en pausa. Se anuncia a los lectores de
// pantalla sin robar el foco.
export interface GuideNote {
  id: string;
  text: string;
}

export interface GuideView {
  /** `note`: el aviso que toca (o ninguno); `visible`: si se puede mostrar ahora (no en pausa ni leyendo). */
  update(note: GuideNote | undefined, visible: boolean): void;
  /** Para depurar y las pruebas: el aviso a la vista, si hay. */
  readonly shown: string | undefined;
  dispose(): void;
}

export function createGuideView(): GuideView {
  const element = document.createElement('p');
  element.className = 'guia';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  document.body.append(element);
  let current: string | undefined;
  let showing = false;

  return {
    update(note, visible) {
      if (note?.id !== current) {
        current = note?.id;
        element.textContent = note?.text ?? '';
      }
      const show = visible && note !== undefined;
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
