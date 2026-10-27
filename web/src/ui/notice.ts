// Aviso breve y discreto ("Anotado en el Registro: …"). Se anuncia a los lectores de pantalla sin
// robar el foco y se apaga solo.
const VISIBLE_MS = 4500;

export interface Notice {
  show(message: string): void;
  hide(): void;
  dispose(): void;
}

export function createNotice(): Notice {
  const element = document.createElement('p');
  element.className = 'notice';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  document.body.append(element);
  let timer: number | undefined;

  function hide(): void {
    window.clearTimeout(timer);
    element.classList.remove('notice-visible');
    element.textContent = '';
  }

  return {
    hide,
    show(message) {
      // La región existe siempre (vacía): así los lectores de pantalla anuncian el cambio de texto.
      element.textContent = message;
      element.classList.add('notice-visible');
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, VISIBLE_MS);
    },
    dispose() {
      window.clearTimeout(timer);
      element.remove();
    },
  };
}
