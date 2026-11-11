// «Gira el teléfono»: en una pantalla táctil sostenida en vertical, una capa opaca cubre menú, juego y paneles, y el
// juego se pausa (lo hace main.ts al suscribirse). Al volver a horizontal la capa se quita y el juego se queda en la
// pausa normal: un toque sigue siendo necesario para seguir. Es lo que garantiza el requisito en todos los
// navegadores (el bloqueo de pantalla de orientationLock.ts no existe en iPhone).
import { t } from '../../i18n';
import { shouldShowRotateGuard, watchOrientation } from './orientation';

export interface RotateGuard {
  /** El aviso está a la vista (táctil y en vertical). */
  readonly active: boolean;
  /** Avisa cuando el aviso sale o se va; devuelve la función que lo deja de avisar. */
  subscribe(listener: (active: boolean) => void): () => void;
  dispose(): void;
}

const NO_GUARD: RotateGuard = {
  active: false,
  subscribe: () => () => {},
  dispose: () => {},
};

const PHONE_ICON = '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10.5 18.5h3"/>';

function build(): { root: HTMLDivElement; icon: SVGSVGElement } {
  const root = document.createElement('div');
  root.className = 'rotate-guard';
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'rotate-guard-title');
  root.setAttribute('aria-describedby', 'rotate-guard-text');
  root.hidden = true;
  root.tabIndex = -1;

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('class', 'rotate-guard-phone');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.innerHTML = PHONE_ICON; // texto SVG fijo

  const title = document.createElement('strong');
  title.id = 'rotate-guard-title';
  title.textContent = t('Gira el teléfono');
  const text = document.createElement('span');
  text.id = 'rotate-guard-text';
  text.textContent = t('Este juego se juega en horizontal.');

  root.append(icon, title, text);
  document.body.append(root);
  return { root, icon };
}

/** Deja inerte (sin foco, sin teclado, fuera de los lectores) todo lo demás de la página; devuelve cómo deshacerlo. */
function freezeRest(root: HTMLElement): () => void {
  const frozen = [...document.body.children].filter(
    (node): node is HTMLElement => node instanceof HTMLElement && node !== root && !node.inert,
  );
  for (const node of frozen) node.inert = true;
  return () => {
    for (const node of frozen) node.inert = false;
  };
}

export function createRotateGuard({ touch }: { touch: boolean }): RotateGuard {
  if (!touch) return NO_GUARD;
  const watcher = watchOrientation(window.matchMedia('(orientation: portrait)'));
  const { root } = build();
  const listeners = new Set<(active: boolean) => void>();
  const isActive = (portrait: boolean): boolean => shouldShowRotateGuard({ touch, portrait });
  let active = false;
  let thaw: (() => void) | undefined;
  const apply = (portrait: boolean): void => {
    const next = isActive(portrait);
    if (next === active) return;
    active = next;
    root.hidden = !active;
    if (active) {
      thaw = freezeRest(root);
      root.focus({ preventScroll: true }); // el foco del teclado y de los lectores queda dentro del aviso
    } else {
      thaw?.();
      thaw = undefined;
    }
  };
  apply(watcher.portrait);

  watcher.subscribe((portrait) => {
    apply(portrait);
    for (const listener of [...listeners]) listener(active);
  });

  return {
    get active() {
      return active;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      watcher.dispose();
      thaw?.();
      listeners.clear();
      root.remove();
    },
  };
}
