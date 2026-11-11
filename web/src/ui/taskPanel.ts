// La lista de tareas del prólogo (al lado izquierdo): un papel pequeño con el título y la tarea de ahora, que se
// despliega para ver todas con su casilla (la tecla O o un clic). Solo pinta lo que calcula game/tasks.ts.
import { t } from '../i18n';
import type { TaskItem } from '../game/tasks';

export interface TaskPanel {
  /** Una vez por fotograma: las tareas y si se puede ver (no en pausa ni leyendo). */
  update(items: readonly TaskItem[], visible: boolean): void;
  /** Despliega o recoge la lista. */
  toggle(): void;
  /** Despliega la lista (al pedir ver los objetivos). */
  expand(): void;
  readonly expanded: boolean;
  /** Oculta o muestra la lista entera (con interfaz muy grande tapa la pantalla). */
  setHidden(hidden: boolean): void;
  readonly hidden: boolean;
  dispose(): void;
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function createTaskPanel(
  touch: boolean,
  onHiddenChange?: (hidden: boolean) => void,
): TaskPanel {
  const root = node('aside', 'tareas');
  root.setAttribute('aria-label', t('Tareas'));
  const head = node('button', 'tareas-cabecera');
  head.type = 'button';
  const title = node('span', 'tareas-titulo', t('Tareas'));
  const key = node('span', 'tareas-tecla', touch ? '' : 'O · H');
  const now = node('span', 'tareas-ahora');
  head.append(title, key, now);
  const list = node('ol', 'tareas-lista');
  const hint = node('p', 'tareas-pista');
  const hide = node('button', 'tareas-ocultar', '✕');
  hide.type = 'button';
  hide.setAttribute('aria-label', t('Ocultar tareas'));
  hide.title = t('Ocultar tareas');
  root.append(head, hide, list, hint);
  // Con la lista oculta queda un botón pequeño para traerla de vuelta (sin teclado no habría otra forma).
  const showButton = node('button', 'tareas-mostrar', '☑');
  showButton.type = 'button';
  showButton.setAttribute('aria-label', t('Mostrar tareas'));
  showButton.title = t('Mostrar tareas');
  document.body.append(root, showButton);

  let expanded = !touch; // en el teléfono arranca recogida: solo la tarea de ahora; un toque en el título la despliega
  let visible = false;
  let hidden = false;
  let lastKey = '';

  const apply = (): void => {
    root.classList.toggle('tareas-desplegada', expanded);
    head.setAttribute('aria-expanded', String(expanded));
    root.classList.toggle('tareas-oculta', hidden);
    showButton.classList.toggle('tareas-mostrar-visible', hidden && visible);
  };
  const setHidden = (value: boolean): void => {
    if (value === hidden) return;
    hidden = value;
    apply();
    onHiddenChange?.(hidden);
  };
  hide.addEventListener('click', () => {
    setHidden(true);
  });
  showButton.addEventListener('click', () => {
    setHidden(false);
  });
  head.addEventListener('click', () => {
    expanded = !expanded;
    apply();
  });
  apply();

  return {
    update(items, show) {
      if (show !== visible) {
        visible = show;
        root.classList.toggle('tareas-visible', show);
        apply();
      }
      const current = items.find((item) => item.current);
      const stateKey = items
        .map((i) => `${i.id}${i.done ? '1' : '0'}${i.current ? '*' : ''}${i.title}`)
        .join();
      if (stateKey === lastKey) return;
      lastKey = stateKey;
      const done = items.filter((i) => i.done).length;
      now.textContent = current ? current.title : t('Todo hecho');
      // En el bucle, la lista lleva el nombre de la misión de ahora (o de la última, con todo hecho).
      const mission = (current ?? items[items.length - 1])?.mission ?? t('Tareas');
      title.textContent = `${mission} ${String(done)}/${String(items.length)}`;
      hint.textContent = current?.hint ?? '';
      list.replaceChildren(
        ...items.map((item) => {
          const li = node('li', 'tarea');
          li.classList.toggle('tarea-hecha', item.done);
          li.classList.toggle('tarea-actual', item.current);
          li.append(
            node('span', 'tarea-casilla', item.done ? '☑' : '☐'),
            node('span', 'tarea-texto', item.title),
          );
          if (item.current) li.setAttribute('aria-current', 'step');
          return li;
        }),
      );
    },
    toggle() {
      expanded = !expanded;
      apply();
    },
    expand() {
      expanded = true;
      apply();
    },
    get expanded() {
      return expanded;
    },
    setHidden,
    get hidden() {
      return hidden;
    },
    dispose() {
      root.remove();
      showButton.remove();
    },
  };
}
