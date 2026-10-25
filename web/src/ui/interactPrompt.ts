// Aviso de que hay una fuente al alcance: "E · leer" en PC y un botón "Leer" en pantallas táctiles.
export interface InteractPrompt {
  show(label: string): void;
  hide(): void;
  dispose(): void;
}

export function createInteractPrompt(touch: boolean, onActivate: () => void): InteractPrompt {
  const element = document.createElement(touch ? 'button' : 'p');
  element.className = touch ? 'prompt prompt-button' : 'prompt';
  if (element instanceof HTMLButtonElement) {
    element.type = 'button';
    element.addEventListener('click', onActivate);
  }
  element.hidden = true;
  document.body.append(element);
  let current = '';

  return {
    show(label) {
      if (label !== current) {
        element.textContent = label;
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
