// Panel del Registro: lo aprendido por hilos, los rumores como preguntas, los enlaces "ver también" y
// las conclusiones. Solo pinta la vista que calcula registry/registryView.ts; todo entra como texto.
import type { RegistryView, ThreadView } from '../registry/registryView';

export interface RegistryPanel {
  open(view: RegistryView): void;
  close(): void;
  readonly isOpen: boolean;
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

function threadSection(view: ThreadView): HTMLElement {
  const section = node('section', 'registry-thread');
  section.append(
    node('h3', 'registry-question', view.thread.question),
    node('p', 'registry-count', `${view.known} de ${view.total} hechos`),
  );
  const list = node('ul', 'registry-facts');
  for (const fact of view.facts) {
    const item = node('li', 'registry-fact');
    item.append(node('span', 'registry-line', fact.line));
    if (fact.related.length > 0) {
      const related = node('ul', 'registry-related');
      related.setAttribute('aria-label', 'Ver también');
      for (const r of fact.related) related.append(node('li', 'registry-related-item', r.line));
      item.append(node('p', 'registry-also', 'Ver también'), related);
    }
    list.append(item);
  }
  for (const rumor of view.rumors) {
    list.append(node('li', 'registry-rumor', `? ${rumor.question}`));
  }
  if (view.facts.length === 0 && view.rumors.length === 0) {
    list.append(node('li', 'registry-empty', 'Todavía no sé nada sobre esto.'));
  }
  section.append(list);
  return section;
}

export function createRegistryPanel(onClose: () => void): RegistryPanel {
  const backdrop = node('div', 'registry');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Registro');
  backdrop.hidden = true;
  const card = node('article', 'registry-card');
  backdrop.append(card);
  document.body.append(backdrop);
  let isOpen = false;

  return {
    open(view) {
      const close = node('button', 'registry-close', 'Cerrar (Esc)');
      close.type = 'button';
      close.addEventListener('click', onClose);
      const parts: HTMLElement[] = [
        node('h2', 'registry-title', 'Registro'),
        node('p', 'registry-summary', `${view.totalFacts} hechos anotados`),
      ];
      if (view.conclusions.length > 0) {
        const known = node('ul', 'registry-known');
        for (const c of view.conclusions) known.append(node('li', 'registry-known-item', c.title));
        parts.push(node('h3', 'registry-known-title', 'Lo que sé'), known);
      }
      for (const thread of view.threads) parts.push(threadSection(thread));
      parts.push(close);
      card.replaceChildren(...parts);
      backdrop.hidden = false;
      isOpen = true;
      close.focus({ preventScroll: true });
    },
    close() {
      backdrop.hidden = true;
      isOpen = false;
    },
    get isOpen() {
      return isOpen;
    },
    dispose() {
      backdrop.remove();
    },
  };
}
