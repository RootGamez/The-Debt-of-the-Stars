// El cuaderno en la esquina (plan del HUD, D.3): recuerda que el Registro está ahí (R) y, en pantallas táctiles, lo
// abre. Late cuando se anota algo: la chispa del aviso vuela hasta él.
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface BookButton {
  readonly element: HTMLElement;
  setVisible(visible: boolean): void;
  pulse(): void;
  dispose(): void;
}

function bookIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 32');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of [
    'M20 6 C14 2 7 2 3 4 V28 C7 26 14 26 20 30 Z',
    'M20 6 C26 2 33 2 37 4 V28 C33 26 26 26 20 30 Z',
    'M7 10 H15 M7 15 H16 M24 10 H33 M24 15 H32 M24 20 H30',
  ]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export function createBookButton(touch: boolean, onOpen: () => void): BookButton {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hud-book';
  button.setAttribute('aria-label', 'Abrir el Registro');
  button.append(bookIcon());
  if (!touch) {
    const key = document.createElement('span');
    key.className = 'hud-book-key';
    key.textContent = 'R';
    key.setAttribute('aria-hidden', 'true');
    button.append(key);
  }
  button.hidden = true;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onOpen();
  });
  document.body.append(button);
  let visible = false;

  return {
    element: button,
    setVisible(value) {
      if (value === visible) return;
      visible = value;
      button.hidden = !value;
    },
    pulse() {
      button.classList.remove('is-pulse');
      button.getBoundingClientRect(); // reinicia la animación
      button.classList.add('is-pulse');
    },
    dispose() {
      button.remove();
    },
  };
}
