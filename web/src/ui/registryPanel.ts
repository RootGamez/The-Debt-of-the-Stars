// El Registro como cuaderno (plan del HUD, hito E): un libro con dos páginas abiertas y hojas que giran en 3D, con
// sombra según el ángulo. Se pasan con clic, ← →, los botones de abajo o arrastrando la esquina (la hoja sigue al
// dedo y, al soltar, termina o vuelve). Pestañas en el canto: Preguntas y Mundos. Lo anotado desde la última vez se
// escribe delante del jugador al llegar a su página. En pantallas estrechas se ve una página cada vez. Solo pinta
// lo que calcula registry/notebookPages.ts; todo entra como texto.
import {
  sectionPage,
  spreadOf,
  type NotebookEntry,
  type NotebookPage,
} from '../registry/notebookPages';
import type { WorldPage } from '../worlds/worldLog';
import { worldDrawing } from './worldDrawings';
import { t } from '../i18n';

/** Lo que tarda una hoja en dar la vuelta entera (ms). */
const FLIP_MS = 520;
/** Arrastrar menos que esto es un clic. */
const DRAG_THRESHOLD = 6;
/** Por debajo de este ancho, una página por pantalla. */
const NARROW_WIDTH = 640;
/** El libro abierto es 3:2 (cada página, 3:4). */
const BOOK_RATIO = 1.5;
/** Al soltar una hoja arrastrada, termina de pasar si llegó a este ángulo. */
const DRAG_COMMIT_ANGLE = 60;

export interface RegistryPanel {
  open(pages: readonly NotebookPage[]): void;
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

function entryItem(entry: NotebookEntry): HTMLElement {
  if (entry.kind === 'rumor') {
    const item = node('li', 'registry-rumor', `? ${entry.question}`);
    if (entry.fresh) item.classList.add('entry-new');
    return item;
  }
  const item = node('li', 'registry-fact');
  if (entry.fresh) item.classList.add('entry-new');
  item.append(node('span', 'registry-line', entry.line));
  if (entry.related.length > 0) {
    const related = node('ul', 'registry-related');
    related.setAttribute('aria-label', t('Ver también'));
    for (const line of entry.related) related.append(node('li', 'registry-related-item', line));
    item.append(node('p', 'registry-also', t('Ver también')), related);
  }
  return item;
}

/** Un garabato a tinta por pregunta (órbitas y puntos), distinto para cada una pero siempre el mismo. */
function doodle(seed: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  let hash = 7;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 120 60');
  svg.setAttribute('class', 'registry-doodle');
  svg.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < 3; k++) {
    const orbit = document.createElementNS(ns, 'ellipse');
    orbit.setAttribute('cx', '60');
    orbit.setAttribute('cy', '30');
    orbit.setAttribute('rx', String(18 + k * 14 + ((hash >> k) % 6)));
    orbit.setAttribute('ry', String(7 + k * 6 + ((hash >> (k + 3)) % 4)));
    orbit.setAttribute('transform', `rotate(${((hash >> (k * 2)) % 40) - 20} 60 30)`);
    svg.append(orbit);
    const dot = document.createElementNS(ns, 'circle');
    const angle = ((hash >> (k * 3)) % 628) / 100;
    dot.setAttribute('cx', String(60 + Math.cos(angle) * (18 + k * 14)));
    dot.setAttribute('cy', String(30 + Math.sin(angle) * (7 + k * 6)));
    dot.setAttribute('r', String(1.6 + k * 0.6));
    svg.append(dot);
  }
  return svg;
}

function worldPhoto(world: WorldPage): HTMLElement {
  const figure = node('figure', 'registry-photo');
  const url = worldDrawing(world.id);
  if (url) {
    const image = document.createElement('img');
    image.src = url;
    image.alt = t('Dibujo de {name}', { name: world.name });
    image.width = 360;
    image.height = 270;
    figure.append(image);
  }
  return figure;
}

function worldMeta(world: WorldPage): string {
  const parts = [world.where];
  if (world.name !== world.official) parts.unshift(world.official);
  parts.push(
    world.loop === undefined
      ? t('casa')
      : t('encontrado en el ciclo {loop}', { loop: world.loop + 1 }),
  );
  return parts.join(' · ');
}

/** El contenido de una página. */
function pageContent(page: NotebookPage): HTMLElement[] {
  switch (page.kind) {
    case 'cover': {
      const label = node('div', 'registry-cover-label');
      label.append(
        node('h2', 'registry-title', t('Registro')),
        node('p', 'registry-cover-sub', t('cuaderno de campo')),
      );
      return [label];
    }
    case 'flyleaf':
      return [
        node('p', 'registry-flyleaf', t('Instituto de Hogar')),
        node(
          'p',
          'registry-flyleaf-note',
          t('Si lo encuentras: aquí está todo lo que he aprendido.'),
        ),
      ];
    case 'known': {
      const parts: HTMLElement[] = [
        node('h3', 'registry-known-title', t('Lo que sé')),
        node('p', 'registry-summary', t('{total} hechos anotados', { total: page.totalFacts })),
      ];
      const list = node('ul', 'registry-known');
      for (const title of page.conclusions) list.append(node('li', 'registry-known-item', title));
      if (page.conclusions.length === 0) {
        list.append(node('li', 'registry-empty', t('Todavía no sé nada con certeza.')));
      }
      parts.push(list);
      return parts;
    }
    case 'thread': {
      const section = node('section', 'registry-thread');
      const question = node('h3', 'registry-question', page.question);
      if (page.part > 0) question.dataset['sigue'] = 'true';
      section.append(
        question,
        node(
          'p',
          'registry-count',
          t('{known} de {total} hechos', { known: page.known, total: page.total }),
        ),
      );
      const list = node('ul', 'registry-facts');
      for (const entry of page.entries) list.append(entryItem(entry));
      if (page.entries.length === 0) {
        list.append(node('li', 'registry-empty', t('Todavía no sé nada sobre esto.')));
      }
      section.append(list);
      if (page.part === 0) section.append(doodle(page.threadId));
      return [section];
    }
    case 'worlds': {
      const list = node('ul', 'registry-worlds');
      for (const world of page.worlds) {
        const item = node('li', 'registry-world-item', world.name);
        item.append(node('span', 'registry-world-page', ` · ${t('p.')} ${world.page}`));
        list.append(item);
      }
      return [
        node('h3', 'registry-known-title', t('Bitácora de mundos')),
        node(
          'p',
          'registry-count',
          t('A cada mundo que encuentro le pongo nombre y pego su dibujo.'),
        ),
        list,
      ];
    }
    case 'world': {
      const name = node('h3', 'registry-world-name', page.world.name);
      if (page.fresh) name.classList.add('entry-new');
      if (page.part > 0) name.dataset['sigue'] = 'true';
      const parts: HTMLElement[] = page.part === 0 ? [worldPhoto(page.world), name] : [name];
      if (page.part === 0) parts.push(node('p', 'registry-count', worldMeta(page.world)));
      const list = node('ul', 'registry-facts');
      for (const fact of page.facts) list.append(node('li', 'registry-fact', fact.line));
      if (page.part === 0 && page.facts.length === 0) {
        list.append(node('li', 'registry-empty', t('Aún no he anotado nada aquí.')));
      }
      parts.push(list);
      return parts;
    }
    case 'blank':
    case 'back':
      return [];
  }
}

function faceOf(
  page: NotebookPage | undefined,
  side: 'front' | 'back',
  number: number,
): HTMLElement {
  const kind = page?.kind ?? 'blank';
  const face = node(
    'div',
    `registry-face ${side} ${kind === 'cover' || kind === 'back' ? 'cover' : 'paper'}`,
  );
  const content = node('div', 'registry-page');
  if (page) content.append(...pageContent(page));
  if (kind !== 'cover' && kind !== 'back' && kind !== 'blank') {
    content.append(node('span', 'registry-page-number', String(number)));
  }
  face.append(content);
  return face;
}

const ease = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export function createRegistryPanel(onClose: () => void, reducedMotion: boolean): RegistryPanel {
  const backdrop = node('div', 'registry');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', t('Registro'));
  backdrop.hidden = true;
  const book = node('div', 'registry-book');
  const shift = node('div', 'registry-shift');
  book.append(shift);
  const bar = node('div', 'registry-bar');
  const prev = node('button', 'registry-turn', '‹');
  prev.type = 'button';
  prev.setAttribute('aria-label', t('Página anterior'));
  const where = node('span', 'registry-where');
  const next = node('button', 'registry-turn', '›');
  next.type = 'button';
  next.setAttribute('aria-label', t('Página siguiente'));
  const close = node('button', 'registry-close', t('Cerrar (Esc)'));
  close.type = 'button';
  bar.append(prev, where, next, close);
  backdrop.append(book, bar);
  document.body.append(backdrop);
  const abort = new AbortController();
  const { signal } = abort;

  let isOpen = false;
  let pages: readonly NotebookPage[] = [];
  let leaves: HTMLElement[] = [];
  /** Hojas pasadas a la izquierda (0 = cerrado por la tapa). */
  let flipped = 0;
  /** En pantallas estrechas: qué página de la doble se ve. */
  let side: 'left' | 'right' = 'right';
  let busy = false;
  let frame = 0;

  const narrow = (): boolean => window.innerWidth < NARROW_WIDTH;

  function setAngle(leaf: HTMLElement, angle: number): void {
    leaf.style.transform = `rotateY(${-angle}deg)`;
    leaf.style.setProperty('--shade', Math.sin((angle * Math.PI) / 180).toFixed(3));
  }

  function restack(): void {
    leaves.forEach((leaf, k) => {
      leaf.style.zIndex = String(k < flipped ? k + 1 : 2 * leaves.length - k);
    });
  }

  /** Cerrado, el libro se corre para centrar la tapa; en estrecho, se ve solo la página `side`. */
  function placeShift(target = flipped): void {
    let x = 0;
    if (target === 0) x = -25;
    else if (target === leaves.length) x = 25;
    else if (narrow()) x = side === 'left' ? 25 : -25;
    shift.style.transform = `translateX(${x}%)`;
  }

  function size(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const room = height - 120;
    const bookWidth = narrow()
      ? 2 * Math.min(width - 32, room * (BOOK_RATIO / 2))
      : Math.min(width * 0.92, room * BOOK_RATIO);
    book.style.width = `${Math.round(bookWidth)}px`;
    book.style.height = `${Math.round(bookWidth / BOOK_RATIO)}px`;
  }

  /** Las páginas que se ven ahora (para escribir lo nuevo y el texto de abajo). */
  function visiblePages(): number[] {
    if (flipped === 0) return [0];
    if (flipped === leaves.length) return [pages.length - 1];
    const left = 2 * flipped - 1;
    if (narrow()) return [side === 'left' ? left : left + 1];
    return [left, left + 1];
  }

  function describe(): void {
    const shown = visiblePages().filter((p) => p > 0 && p < pages.length - 1);
    where.textContent = shown.length === 0 ? '' : `p. ${shown.join('–')}`;
    prev.disabled = flipped === 0;
    next.disabled = flipped === leaves.length;
  }

  /** Lo nuevo de las páginas que se ven se escribe ahora. */
  function writeVisible(): void {
    for (const page of visiblePages()) {
      const leaf = leaves[Math.floor(page / 2)];
      const face = leaf?.querySelector(page % 2 === 0 ? '.front' : '.back');
      for (const entry of face?.querySelectorAll('.entry-new:not(.written)') ?? []) {
        entry.classList.add('written');
      }
    }
    describe();
  }

  function animateLeaf(k: number, from: number, to: number, done: () => void): void {
    const leaf = leaves[k];
    if (!leaf) return;
    leaf.style.zIndex = '100';
    const duration = reducedMotion ? 1 : (FLIP_MS * Math.abs(to - from)) / 180 + 80;
    const start = performance.now();
    const step = (now: number): void => {
      const p = Math.min(1, (now - start) / duration);
      setAngle(leaf, from + (to - from) * ease(p));
      if (p < 1) frame = requestAnimationFrame(step);
      else done();
    };
    frame = requestAnimationFrame(step);
  }

  function flip(dir: 1 | -1, done?: () => void): void {
    if (busy) return;
    if (dir > 0 && flipped >= leaves.length) return;
    if (dir < 0 && flipped <= 0) return;
    busy = true;
    const k = dir > 0 ? flipped : flipped - 1;
    side = dir > 0 ? 'left' : 'right';
    placeShift(flipped + dir);
    animateLeaf(k, dir > 0 ? 0 : 180, dir > 0 ? 180 : 0, () => {
      flipped += dir;
      restack();
      busy = false;
      writeVisible();
      done?.();
    });
  }

  /** Una página más hacia delante o hacia atrás (en estrecho, primero la otra cara de la doble página). */
  function turn(dir: 1 | -1): void {
    if (busy) return;
    const open = flipped > 0 && flipped < leaves.length;
    if (narrow() && open && dir > 0 && side === 'left') {
      side = 'right';
      placeShift();
      writeVisible();
      return;
    }
    if (narrow() && open && dir < 0 && side === 'right') {
      side = 'left';
      placeShift();
      writeVisible();
      return;
    }
    flip(dir);
  }

  function goToPage(page: number): void {
    const target = spreadOf(page);
    const step = (): void => {
      if (flipped === target) {
        if (narrow()) {
          side = page % 2 === 1 ? 'left' : 'right';
          placeShift();
          writeVisible();
        }
        return;
      }
      flip(target > flipped ? 1 : -1, step);
    };
    step();
  }

  function build(): void {
    shift.replaceChildren();
    leaves = [];
    for (let k = 0; k < pages.length / 2; k++) {
      const leaf = node('div', 'registry-leaf');
      leaf.append(
        faceOf(pages[2 * k], 'front', 2 * k),
        faceOf(pages[2 * k + 1], 'back', 2 * k + 1),
      );
      shift.append(leaf);
      leaves.push(leaf);
      setAngle(leaf, 0);
    }
    const tabs = node('div', 'registry-tabs');
    for (const [text, kind] of [
      [t('Preguntas'), 'thread'],
      [t('Mundos'), 'worlds'],
    ] as const) {
      const tab = node('button', 'registry-tab', text);
      tab.type = 'button';
      tab.setAttribute('aria-label', `Ir a ${text}`);
      tab.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      tab.addEventListener('click', (event) => {
        event.stopPropagation();
        goToPage(sectionPage(pages, kind));
      });
      tabs.append(tab);
    }
    shift.append(tabs);
    flipped = 0;
    side = 'right';
    restack();
    placeShift();
    size();
    describe();
  }

  // Arrastrar la esquina: la hoja sigue al dedo y, al soltar, termina o vuelve.
  let drag: {
    k: number;
    forward: boolean;
    x0: number;
    moved: boolean;
    width: number;
    angle: number;
  } | null = null;
  book.addEventListener(
    'pointerdown',
    (event) => {
      if (busy || event.button > 0) return;
      const rect = shift.getBoundingClientRect();
      const forward = narrow()
        ? event.clientX >= window.innerWidth / 2
        : event.clientX >= rect.left + rect.width / 2;
      if (forward ? flipped >= leaves.length : flipped <= 0) return;
      const k = forward ? flipped : flipped - 1;
      drag = {
        k,
        forward,
        x0: event.clientX,
        moved: false,
        width: rect.width / 2,
        angle: forward ? 0 : 180,
      };
      book.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  book.addEventListener(
    'pointermove',
    (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x0;
      if (Math.abs(dx) > DRAG_THRESHOLD) drag.moved = true;
      if (!drag.moved || narrow()) return;
      const leaf = leaves[drag.k];
      if (!leaf) return;
      leaf.style.zIndex = '100';
      const span = drag.width * 1.6;
      const swept = Math.max(0, Math.min(180, ((drag.forward ? -dx : dx) / span) * 180));
      drag.angle = drag.forward ? swept : 180 - swept;
      setAngle(leaf, drag.angle);
    },
    { signal },
  );
  const endDrag = (event: PointerEvent): void => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) {
      turn(d.forward ? 1 : -1);
      return;
    }
    if (narrow()) {
      // En estrecho se desliza: el gesto pasa página sin seguir al dedo.
      turn(event.clientX < d.x0 ? 1 : -1);
      return;
    }
    const complete = d.forward ? d.angle > DRAG_COMMIT_ANGLE : d.angle < 180 - DRAG_COMMIT_ANGLE;
    busy = true;
    const target = complete === d.forward ? 180 : 0;
    if (complete) {
      side = d.forward ? 'left' : 'right';
      placeShift(flipped + (d.forward ? 1 : -1));
    }
    animateLeaf(d.k, d.angle, target, () => {
      if (complete) flipped += d.forward ? 1 : -1;
      restack();
      busy = false;
      writeVisible();
    });
  };
  book.addEventListener('pointerup', endDrag, { signal });
  book.addEventListener('pointercancel', endDrag, { signal });
  prev.addEventListener(
    'click',
    () => {
      turn(-1);
    },
    { signal },
  );
  next.addEventListener(
    'click',
    () => {
      turn(1);
    },
    { signal },
  );
  close.addEventListener('click', onClose, { signal });
  window.addEventListener(
    'keydown',
    (event) => {
      if (!isOpen || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'ArrowRight' || event.code === 'PageDown') {
        event.preventDefault();
        turn(1);
      } else if (event.code === 'ArrowLeft' || event.code === 'PageUp') {
        event.preventDefault();
        turn(-1);
      }
    },
    { signal },
  );
  window.addEventListener(
    'resize',
    () => {
      if (!isOpen) return;
      size();
      placeShift();
      describe();
    },
    { signal },
  );

  return {
    open(next) {
      pages = next;
      build();
      backdrop.hidden = false;
      isOpen = true;
      close.focus({ preventScroll: true });
      // Se abre por la tapa y pasa sola a la primera página, o a la primera con algo nuevo.
      const fresh = pages.findIndex(
        (page) =>
          (page.kind === 'thread' && page.entries.some((e) => e.fresh)) ||
          (page.kind === 'world' && page.fresh),
      );
      flip(1, () => {
        if (fresh > 2) goToPage(fresh);
      });
    },
    close() {
      cancelAnimationFrame(frame);
      busy = false;
      backdrop.hidden = true;
      isOpen = false;
    },
    get isOpen() {
      return isOpen;
    },
    dispose() {
      abort.abort();
      cancelAnimationFrame(frame);
      backdrop.remove();
    },
  };
}
