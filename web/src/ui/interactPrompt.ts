// Aviso de que hay una fuente al alcance (plan del HUD, D.2): la tecla en un círculo de tinta que respira y el
// verbo a mano ("E · leer"); en pantallas táctiles, un botón "Leer" con el mismo dibujo. El texto completo sigue
// siendo "E · leer" (lo que leen los lectores de pantalla y las pruebas); el punto medio solo se oculta a la vista.
export interface InteractPrompt {
  show(label: string): void;
  hide(): void;
  dispose(): void;
}

/** "E · leer" → tecla y verbo; un botón táctil ("Leer") no lleva tecla. */
const KEYED = /^(\S{1,6}) · (.+)$/;

function span(className: string, text: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

export function createInteractPrompt(
  touch: boolean,
  onActivate: () => void,
  parent: HTMLElement = document.body,
): InteractPrompt {
  const element = document.createElement(touch ? 'button' : 'p');
  element.className = touch ? 'prompt prompt-button' : 'prompt';
  if (element instanceof HTMLButtonElement) {
    element.type = 'button';
    element.addEventListener('click', onActivate);
  }
  element.hidden = true;
  parent.append(element);
  let current = '';

  return {
    show(label) {
      if (label !== current) {
        const keyed = KEYED.exec(label);
        if (keyed) {
          element.replaceChildren(
            span('prompt-key', keyed[1] ?? ''),
            span('prompt-sep', ' · '),
            span('prompt-verb', keyed[2] ?? ''),
          );
        } else {
          element.replaceChildren(
            span('prompt-key prompt-key-dot', ''),
            span('prompt-verb', label),
          );
        }
        current = label;
      }
      element.hidden = false;
    },
    hide() {
      element.hidden = true;
    },
    dispose() {
      element.remove();
    },
  };
}
