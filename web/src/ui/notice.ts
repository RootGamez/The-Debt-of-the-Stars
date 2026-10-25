// Aviso breve y discreto ("Anotado en el Registro: …"). Se anuncia a los lectores de pantalla sin
// robar el foco y se apaga solo.
const VISIBLE_MS = 4500;

export interface Notice {
  show(message: string): void;
  dispose(): void;
}

export function createNotice(): Notice {
  const element = document.createElement('p');
  element.className = 'notice';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.hidden = true;
  document.body.append(element);
  let timer: number | undefined;

  return {
    show(message) {
      element.textContent = message;
      element.hidden = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        element.hidden = true;
      }, VISIBLE_MS);
    },
    dispose() {
      window.clearTimeout(timer);
      element.remove();
    },
  };
}
