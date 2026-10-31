// Aviso breve y discreto ("Anotado en el Registro: …"): una tira de papel que entra arriba a la derecha (plan del
// HUD, D.3) y una chispa que vuela al cuaderno de la esquina. Se anuncia a los lectores de pantalla sin robar el
// foco y se apaga solo.
const VISIBLE_MS = 4500;
const LABEL_END = ': ';
/** El trozo de antes de los dos puntos va en letra a mano, como encabezado («Anotado en el Registro»). */
const MAX_LABEL = 40;
const SPARK_MS = 800;

export interface Notice {
  show(message: string): void;
  hide(): void;
  dispose(): void;
}

/** @param book adónde vuela la chispa del aviso (el cuaderno de la esquina), si se ve. */
export function createNotice(book?: { element: HTMLElement; pulse(): void }): Notice {
  const element = document.createElement('p');
  element.className = 'notice';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  document.body.append(element);
  let timer: number | undefined;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hide(): void {
    window.clearTimeout(timer);
    element.classList.remove('notice-visible');
    element.textContent = '';
  }

  function spark(): void {
    if (!book || book.element.hidden) return;
    book.pulse();
    if (reducedMotion) return;
    const from = element.getBoundingClientRect();
    const to = book.element.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'notice-spark';
    dot.style.left = `${from.left + 18}px`;
    dot.style.top = `${from.top + from.height / 2}px`;
    document.body.append(dot);
    const dx = to.left + to.width / 2 - (from.left + 18);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    dot
      .animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.2 },
        ],
        { duration: SPARK_MS, easing: 'cubic-bezier(.5,0,.3,1)' },
      )
      .addEventListener('finish', () => {
        dot.remove();
      });
  }

  return {
    hide,
    show(message) {
      // La región existe siempre (vacía): así los lectores de pantalla anuncian el cambio de texto.
      const cut = message.indexOf(LABEL_END);
      if (cut > 0 && cut <= MAX_LABEL) {
        const label = document.createElement('span');
        label.className = 'notice-label';
        label.textContent = message.slice(0, cut + LABEL_END.length);
        const text = document.createElement('span');
        text.className = 'notice-text';
        text.textContent = message.slice(cut + LABEL_END.length);
        element.replaceChildren(label, text);
      } else {
        element.textContent = message;
      }
      element.classList.add('notice-visible');
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, VISIBLE_MS);
      spark();
    },
    dispose() {
      window.clearTimeout(timer);
      element.remove();
    },
  };
}
