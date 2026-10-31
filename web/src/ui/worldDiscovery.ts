// Un mundo nuevo (plan del HUD, F.3): al llegar por primera vez, su dibujo se revela como una foto que se seca,
// el jugador le pone nombre (como mucho 24 letras; vacío = el oficial) y la foto vuela al cuaderno de la esquina.
// El tiempo espera mientras tanto (main.ts). Las teclas que se escriben no llegan al juego (ni E, ni R, ni M).
import { MAX_WORLD_NAME, cleanWorldName } from '../worlds/worldLog';
import { worldDrawing } from './worldDrawings';

const FLY_MS = 800;

export interface WorldDiscovery {
  /** Pide un nombre para el mundo `id`; `onNamed` recibe el nombre ya limpio. */
  open(id: string, official: string, onNamed: (name: string) => void): void;
  readonly isOpen: boolean;
  dispose(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** @param book adónde vuela la foto al pegarla (el cuaderno de la esquina). */
export function createWorldDiscovery(book: () => HTMLElement | undefined): WorldDiscovery {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const backdrop = element('div', 'discover-backdrop');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'discover-title');
  backdrop.hidden = true;
  const card = element('div', 'discover');
  const title = element('h2', 'discover-title', 'Un mundo nuevo');
  title.id = 'discover-title';
  const photo = element('figure', 'discover-photo');
  const image = document.createElement('img');
  image.width = 360;
  image.height = 270;
  photo.append(image);
  const label = element('label', 'discover-label', 'Ponle nombre');
  const input = element('input', 'discover-input');
  input.id = 'discover-name';
  input.type = 'text';
  input.maxLength = MAX_WORLD_NAME;
  input.autocomplete = 'off';
  input.spellcheck = false;
  label.htmlFor = input.id;
  const hint = element('p', 'discover-hint');
  const save = element('button', 'discover-save', 'Pegar en el cuaderno');
  save.type = 'button';
  const foot = element('div', 'discover-foot');
  foot.append(hint, save);
  card.append(title, photo, label, input, foot);
  backdrop.append(card);
  document.body.append(backdrop);

  let pending: { official: string; onNamed: (name: string) => void } | undefined;

  function flyToBook(): void {
    const target = book();
    if (reducedMotion || !target || target.hidden) return;
    const from = image.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const copy = image.cloneNode() as HTMLImageElement;
    copy.className = 'discover-flying';
    copy.alt = '';
    Object.assign(copy.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
    });
    document.body.append(copy);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    copy
      .animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(-12deg)`, opacity: 0.6 },
        ],
        { duration: FLY_MS, easing: 'cubic-bezier(.5,0,.3,1)' },
      )
      .addEventListener('finish', () => {
        copy.remove();
      });
  }

  function finish(): void {
    if (!pending) return;
    const { official, onNamed } = pending;
    pending = undefined;
    const name = cleanWorldName(input.value, official);
    backdrop.hidden = true;
    flyToBook();
    onNamed(name);
  }

  // Lo que se escribe es del nombre: ninguna tecla sale de aquí hacia el juego.
  for (const type of ['keydown', 'keyup'] as const) {
    input.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type === 'keydown' && event.key === 'Enter') {
        event.preventDefault();
        finish();
      }
    });
  }
  save.addEventListener('click', (event) => {
    event.stopPropagation();
    finish();
  });
  backdrop.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  return {
    open(id, official, onNamed) {
      pending = { official, onNamed };
      image.src = worldDrawing(id);
      image.alt = `Dibujo de ${official}`;
      input.value = '';
      input.placeholder = official;
      hint.textContent = `Intro para pegarlo · sin nombre se queda «${official}»`;
      backdrop.hidden = false;
      card.classList.remove('is-in');
      card.getBoundingClientRect(); // reinicia la animación del revelado
      card.classList.add('is-in');
      // El foco va al nombre ya: ninguna tecla llega al juego mientras la foto se revela.
      input.focus({ preventScroll: true });
    },
    get isOpen() {
      return pending !== undefined;
    },
    dispose() {
      backdrop.remove();
    },
  };
}
