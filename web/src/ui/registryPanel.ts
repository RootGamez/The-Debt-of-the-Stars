// El Registro como cuaderno (plan del HUD, hito E): un libro con dos páginas abiertas y hojas que giran en 3D, con
// sombra según el ángulo. Se pasan con clic, ← →, los botones de abajo o arrastrando la esquina (la hoja sigue al
// dedo y, al soltar, termina o vuelve). Pestañas en el canto: Preguntas y Mundos. Lo anotado desde la última vez se
// escribe delante del jugador al llegar a su página. Solo pinta lo que calcula registry/notebookPages.ts; todo
// entra como texto.
// El libro se adapta a la pantalla y a las escalas de accesibilidad (registry/bookLayout.ts): con poco sitio o la
// letra grande, la página cambia de forma, se ve una sola o las flechas pasan a los lados, y lo escrito se reparte
// en más páginas. Después de pintarlo se mide: si algo no cabe, se reparte otra vez con menos por página; lo que
// ni así cabe (una sola entrada más larga que la página) se puede deslizar dentro de su página.
import {
  currentTaskPage,
  pageTopic,
  sectionPage,
  spreadOf,
  topicPage,
  type NotebookEntry,
  type NotebookPage,
} from '../registry/notebookPages';
import { bookLayout, tighter, type BookLayout, type PageFit } from '../registry/bookLayout';
import type { WorldPage } from '../worlds/worldLog';
import { worldDrawing } from './worldDrawings';
import { SKETCH_HEIGHT, SKETCH_WIDTH, sketchOf } from './notebookSketches';
import { t } from '../i18n';

/** Lo que tarda una hoja en dar la vuelta entera (ms). */
const FLIP_MS = 520;
/** Arrastrar menos que esto es un clic. */
const DRAG_THRESHOLD = 6;
/** Cuántas veces se reparte de nuevo, con menos por página, si lo pintado no cabe. */
const MAX_REFITS = 5;
/** Al soltar una hoja arrastrada, termina de pasar si llegó a este ángulo. */
const DRAG_COMMIT_ANGLE = 60;

/** Reparte el cuaderno en páginas para lo que cabe en cada una (cambia con la pantalla y el tamaño de letra). */
export type Paginate = (fit: PageFit) => NotebookPage[];

export interface RegistryPanel {
  /** `focus: 'tasks'` abre por la página de las tareas (la tecla T) en vez de por lo último anotado. */
  open(paginate: Paginate, focus?: 'tasks'): void;
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

/** El croquis a tinta de un hecho (trazos de notebookSketches.ts), con su texto alternativo. */
function sketchFigure(id: string): HTMLElement | undefined {
  const sketch = sketchOf(id);
  if (!sketch) return undefined;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${String(SKETCH_WIDTH)} ${String(SKETCH_HEIGHT)}`);
  svg.setAttribute('class', 'registry-sketch');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', sketch.alt);
  for (const shape of sketch.shapes) {
    if (shape.type === 'path') {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', shape.d);
      if (shape.accent) path.setAttribute('class', 'sketch-accent');
      if (shape.dashed) path.setAttribute('stroke-dasharray', '4 3');
      svg.append(path);
    } else if (shape.type === 'dot') {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', String(shape.x));
      dot.setAttribute('cy', String(shape.y));
      dot.setAttribute('r', String(shape.r));
      dot.setAttribute('class', shape.accent ? 'sketch-dot sketch-accent' : 'sketch-dot');
      svg.append(dot);
    } else {
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', String(shape.x));
      label.setAttribute('y', String(shape.y));
      label.setAttribute('text-anchor', shape.anchor ?? 'middle');
      label.setAttribute('class', shape.accent ? 'sketch-label sketch-accent' : 'sketch-label');
      label.textContent = shape.text;
      svg.append(label);
    }
  }
  const figure = node('figure', 'registry-sketch-figure');
  figure.append(svg);
  return figure;
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
  const sketch = entry.sketch === undefined ? undefined : sketchFigure(entry.sketch);
  if (sketch) item.append(sketch);
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
  parts.push(
    world.loop === undefined
      ? t('casa')
      : t('encontrado en el ciclo {loop}', { loop: world.loop + 1 }),
  );
  return parts.join(' · ');
}

/**
 * Una página de deducción (plan de historia y puzzles, §5.1): el título de la conclusión; si está completa, lo que
 * ahora sé y qué puedo hacer; y sus trozos, los sabidos con ✓ y los que faltan como pregunta con su orientación.
 */
function deductionContent(page: Extract<NotebookPage, { kind: 'deduction' }>): HTMLElement[] {
  const { deduction } = page;
  const first = page.part === 0;
  const title = node('h3', 'registry-known-title', deduction.title);
  if (deduction.unlocked) title.classList.add('registry-deduction-done');
  if (!first) title.dataset['sigue'] = 'true';
  const parts: HTMLElement[] = [title];
  if (first && deduction.unlocked && deduction.knowLine !== undefined) {
    parts.push(node('p', 'registry-deduction-know', deduction.knowLine));
  }
  if (first && deduction.unlocked && deduction.action !== undefined) {
    const action = node('p', 'registry-deduction-action');
    action.append(
      node('span', 'registry-deduction-label', `${t('Qué puedo hacer ahora')}: `),
      document.createTextNode(deduction.action),
    );
    parts.push(action);
  }
  parts.push(
    node(
      'p',
      'registry-count',
      deduction.unlocked ? t('Por qué lo sé') : t('Lo que tengo y lo que me falta'),
    ),
  );
  const list = node('ul', 'registry-facts');
  for (const piece of page.pieces) {
    const item = node('li', piece.met ? 'registry-piece' : 'registry-piece registry-piece-missing');
    item.append(node('span', 'registry-line', `${piece.met ? '✓' : '?'} ${piece.line}`));
    const sketch = piece.sketch === undefined ? undefined : sketchFigure(piece.sketch);
    if (sketch) item.append(sketch);
    if (!piece.met && piece.lead !== undefined) {
      item.append(node('p', 'registry-lead', piece.lead));
    }
    list.append(item);
  }
  parts.push(list);
  return parts;
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
      const title = node('h3', 'registry-known-title', t('Lo que sé'));
      if (page.part > 0) title.dataset['sigue'] = 'true';
      const parts: HTMLElement[] = [
        title,
        node('p', 'registry-summary', t('{total} hechos anotados', { total: page.totalFacts })),
      ];
      const list = node('ul', 'registry-known');
      for (const title of page.conclusions) list.append(node('li', 'registry-known-item', title));
      if (page.conclusions.length === 0 && page.part === 0) {
        list.append(node('li', 'registry-empty', t('Todavía no sé nada con certeza.')));
      }
      parts.push(list);
      return parts;
    }
    case 'deduction':
      return deductionContent(page);
    case 'tasks': {
      const title = node('h3', 'registry-known-title', t('Tareas'));
      if (page.part > 0) title.dataset['sigue'] = 'true';
      const list = node('ul', 'registry-facts registry-tasks');
      for (const item of page.items) {
        const row = node('li', 'registry-task');
        row.classList.toggle('registry-task-done', item.done);
        row.classList.toggle('registry-task-current', item.current);
        row.append(
          node('span', 'registry-task-box', item.done ? '☑' : '☐'),
          node('span', 'registry-task-title', item.title),
        );
        if (item.current) row.append(node('p', 'registry-task-hint', item.hint));
        list.append(row);
      }
      return [
        title,
        node(
          'p',
          'registry-count',
          t('{done} de {total} hechas', { done: page.done, total: page.total }),
        ),
        list,
      ];
    }
    case 'learned': {
      const name = node('h3', 'registry-known-title', t('Lo que he aprendido'));
      if (page.part > 0) name.dataset['sigue'] = 'true';
      const list = node('ul', 'registry-facts');
      for (const fact of page.facts) {
        const item = node('li', 'registry-fact');
        if (fact.fresh) item.classList.add('entry-new');
        item.append(node('span', 'registry-line', fact.line));
        list.append(item);
      }
      if (page.total === 0) {
        list.append(
          node(
            'li',
            'registry-empty',
            t('Todavía no he aprendido nada. Habla con la gente y lee.'),
          ),
        );
      }
      return [name, list];
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
        // Una marca a mano: ✓ si ya se leyó todo allí; si no, un «…» de lo que queda.
        if (world.complete !== undefined) {
          const mark = node('span', 'registry-world-mark', world.complete ? ' ✓' : ' …');
          mark.title = world.complete
            ? t('Aquí ya lo he leído todo')
            : t('Aún queda algo por leer aquí');
          item.append(mark);
        }
        list.append(item);
      }
      const title = node('h3', 'registry-known-title', t('Bitácora de mundos'));
      if (page.part > 0) title.dataset['sigue'] = 'true';
      return [
        title,
        node('p', 'registry-count', t('A cada mundo que encuentro le pego su dibujo.')),
        list,
      ];
    }
    case 'world': {
      const name = node('h3', 'registry-world-name', page.world.name);
      if (page.fresh) name.classList.add('entry-new');
      if (page.part > 0) name.dataset['sigue'] = 'true';
      const parts: HTMLElement[] = page.part === 0 ? [worldPhoto(page.world), name] : [name];
      if (page.part === 0) parts.push(node('p', 'registry-count', worldMeta(page.world)));
      if (page.part === 0 && page.world.note !== undefined) {
        const note = node('p', 'registry-world-note', page.world.note);
        note.classList.toggle('registry-world-note-done', page.world.complete === true);
        parts.push(note);
      }
      const list = node('ul', 'registry-facts');
      for (const fact of page.facts) list.append(node('li', 'registry-fact', fact.line));
      if (page.part === 0 && page.world.facts.length === 0) {
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
  close.setAttribute('aria-label', t('Cerrar (Esc)'));
  bar.append(prev, where, next, close);
  backdrop.append(book, bar);
  document.body.append(backdrop);
  const abort = new AbortController();
  const { signal } = abort;

  let isOpen = false;
  let paginate: Paginate = () => [];
  let layout: BookLayout | null = null;
  let pages: readonly NotebookPage[] = [];
  let leaves: HTMLElement[] = [];
  let tabs: HTMLElement | null = null;
  /** Hojas pasadas a la izquierda (0 = cerrado por la tapa). */
  let flipped = 0;
  /** En pantallas estrechas: qué página de la doble se ve. */
  let side: 'left' | 'right' = 'right';
  let busy = false;
  let frame = 0;
  let resizing = 0;

  /** Una sola página a la vista (no caben dos legibles). */
  const narrow = (): boolean => layout?.single ?? false;

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

  /** Mide la pantalla y las escalas de Configuración, y da al libro su tamaño, su letra y sus márgenes. */
  function applyLayout(): BookLayout {
    const root = getComputedStyle(document.documentElement);
    const scale = (name: string): number => {
      const value = Number.parseFloat(root.getPropertyValue(name));
      return Number.isFinite(value) && value > 0 ? value : 1;
    };
    const uiScale = scale('--ui-scale');
    const next = bookLayout({
      width: window.innerWidth,
      height: window.innerHeight,
      uiScale,
      textScale: scale('--text-scale'),
    });
    layout = next;
    const sides = next.chrome === 'sides';
    backdrop.classList.toggle('registry--sides', sides);
    book.classList.toggle('registry-book--single', next.single);
    // Una sola página a la vista: el libro mide una hoja y se recorta (las pestañas sobresalen por el canto).
    const shown = next.single ? next.pageWidth : 2 * next.pageWidth;
    book.style.width = `${String(shown)}px`;
    book.style.height = `${String(next.pageHeight)}px`;
    const tabWidth = Math.max(26 * uiScale, 0.064 * next.pageWidth);
    const tabHeight = Math.min(
      Math.max(72 * uiScale, 0.24 * next.pageWidth),
      (next.pageHeight * 0.8 - 8) / 2,
    );
    book.style.marginLeft = '0';
    book.style.marginRight = next.single || sides ? `${String(Math.round(tabWidth))}px` : '0';
    book.style.setProperty('--tab-w', `${tabWidth.toFixed(1)}px`);
    book.style.setProperty('--tab-h', `${tabHeight.toFixed(1)}px`);
    book.style.setProperty(
      '--tab-font',
      `${Math.max(13 * uiScale, 0.034 * next.pageWidth).toFixed(1)}px`,
    );
    const px = (value: number): string => `${value.toFixed(2)}px`;
    book.style.setProperty('--page-font', px(next.font));
    book.style.setProperty('--page-line', px(next.line));
    book.style.setProperty('--pad-x', px(next.padX));
    book.style.setProperty('--pad-top', px(next.padTop));
    book.style.setProperty('--pad-bottom', px(next.padBottom));
    book.style.setProperty('--photo-w', px(next.photoWidth));
    close.textContent = sides ? '✕' : t('Cerrar (Esc)');
    // Las pestañas van en el canto del libro; con una sola página, en el canto de la que se ve.
    if (tabs) (next.single ? book : shift).append(tabs);
    return next;
  }

  /** ¿Se sale lo escrito de la página? (se mide la maqueta, no lo pintado: las hojas están giradas en 3D). */
  function overflows(content: HTMLElement, bottom: number): boolean {
    const limit = content.clientHeight - bottom + 1;
    for (const child of content.children) {
      if (!(child instanceof HTMLElement) || child.classList.contains('registry-page-number')) {
        continue;
      }
      if (child.offsetTop + child.offsetHeight > limit) return true;
    }
    return false;
  }

  /** Cuántas cosas lleva una página: una sola que no cabe no se arregla repartiendo. */
  function itemsOn(page: NotebookPage | undefined): number {
    switch (page?.kind) {
      case 'thread':
        return page.entries.length;
      case 'world':
      case 'learned':
        return page.facts.length;
      case 'known':
        return page.conclusions.length;
      case 'deduction':
        return page.pieces.length;
      case 'tasks':
        return page.items.length;
      case 'worlds':
        return page.worlds.length;
      default:
        return 0;
    }
  }

  /**
   * Reparte y pinta con `fit`. Devuelve las hojas que se desbordan y cuántas de ellas apretar más podría arreglar
   * (las de varios elementos; una sola entrada más larga que la hoja no se arregla repartiendo).
   */
  function paintWith(fit: PageFit, padBottom: number): { tight: HTMLElement[]; fixable: number } {
    pages = paginate(fit);
    build();
    const tight: HTMLElement[] = [];
    let fixable = 0;
    shift.querySelectorAll<HTMLElement>('.registry-page').forEach((content, index) => {
      if (!overflows(content, padBottom)) return;
      // El garabato de adorno es lo primero que se quita si estorba.
      const doodleArt = content.querySelector('.registry-doodle');
      if (doodleArt) {
        doodleArt.remove();
        if (!overflows(content, padBottom)) return;
      }
      tight.push(content);
      if (itemsOn(pages[index]) > 1) fixable++;
    });
    return { tight, fixable };
  }

  /**
   * Reparte y pinta; si alguna hoja de varios elementos no cabe, otra vez con menos por página (pocas veces: apretar
   * de más gasta páginas). Lo que ni así cabe, se desliza dentro de su hoja.
   */
  function paginateToFit(): void {
    const { fit: designFit, padBottom } = layout ?? applyLayout();
    let fit = designFit;
    let best = { fit, fixable: Number.POSITIVE_INFINITY };
    let last = paintWith(fit, padBottom);
    for (let attempt = 0; last.fixable > 0 && attempt < MAX_REFITS; attempt++) {
      if (last.fixable < best.fixable) best = { fit, fixable: last.fixable };
      fit = tighter(fit);
      last = paintWith(fit, padBottom);
    }
    if (last.fixable > best.fixable) {
      // Apretar no mejoró: se vuelve al mejor reparto.
      last = paintWith(best.fit, padBottom);
    }
    for (const content of last.tight) content.classList.add('registry-page--scroll');
  }

  /** Coloca el libro abierto por una doble página, sin animación. */
  function showSpread(target: number): void {
    flipped = Math.max(0, Math.min(leaves.length, target));
    leaves.forEach((leaf, k) => {
      setAngle(leaf, k < flipped ? 180 : 0);
    });
    restack();
    placeShift();
    writeVisible();
  }

  /** La pantalla o la letra han cambiado: mismo cuaderno, repartido de nuevo y abierto por donde estaba. */
  function relayout(force = false): void {
    const before = layout;
    const next = applyLayout();
    const same =
      before !== null &&
      before.single === next.single &&
      Math.abs(before.fit.lines - next.fit.lines) < 0.05 &&
      Math.abs(before.fit.chars - next.fit.chars) < 0.05;
    if (same && !force) {
      placeShift();
      describe();
      return;
    }
    const shown = visiblePages()[0] ?? 0;
    const topic = pageTopic(pages[shown]);
    cancelAnimationFrame(frame);
    busy = false;
    drag = null;
    paginateToFit();
    // Lo que ya estaba a la vista no se vuelve a escribir delante del jugador.
    book.classList.add('registry-book--settled');
    const at = shown === 0 ? 0 : topicPage(pages, topic);
    if (at > 0) side = at % 2 === 1 ? 'left' : 'right';
    showSpread(at < 0 ? 1 : spreadOf(at));
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
    // En el modo lateral el sitio es de 44 px: solo los números.
    const prefix = layout?.chrome === 'sides' ? '' : 'p. ';
    where.textContent = shown.length === 0 ? '' : `${prefix}${shown.join('–')}`;
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
    if (busy) return;
    // Directo: las hojas intermedias se colocan de golpe y solo la última se pasa con animación.
    const dir = target > flipped ? 1 : -1;
    if (Math.abs(target - flipped) > 1) {
      const from = target - dir;
      leaves.forEach((leaf, k) => {
        setAngle(leaf, k < from ? 180 : 0);
      });
      flipped = from;
      restack();
    }
    const arrive = (): void => {
      if (narrow()) {
        side = page % 2 === 1 ? 'left' : 'right';
        placeShift();
        writeVisible();
      }
    };
    if (flipped === target) arrive();
    else flip(dir, arrive);
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
    tabs?.remove();
    const tabStrip = node('div', 'registry-tabs');
    tabs = tabStrip;
    const inPrologue = pages.some((page) => page.kind === 'tasks');
    const tabList = inPrologue
      ? ([
          [t('Tareas'), 'tasks'],
          [t('Aprendido'), 'learned'],
        ] as const)
      : ([
          [t('Preguntas'), 'thread'],
          [t('Mundos'), 'worlds'],
        ] as const);
    for (const [text, kind] of tabList) {
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
      tabStrip.append(tab);
    }
    (narrow() ? book : shift).append(tabStrip);
    flipped = 0;
    side = 'right';
    restack();
    placeShift();
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
  // El navegador se queda el gesto (deslizar dentro de una página larga): la hoja vuelve y no se pasa página.
  book.addEventListener(
    'pointercancel',
    () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved || narrow()) return;
      busy = true;
      animateLeaf(d.k, d.angle, d.forward ? 0 : 180, () => {
        restack();
        busy = false;
      });
    },
    { signal },
  );
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
      if (!isOpen || resizing !== 0) return;
      // Girar el teléfono o esconderse la barra del navegador dispara muchos avisos: uno por fotograma basta.
      resizing = requestAnimationFrame(() => {
        resizing = 0;
        if (isOpen) relayout();
      });
    },
    { signal },
  );

  return {
    open(next, focus) {
      paginate = next;
      // Visible antes de repartir: lo que cabe en cada página se comprueba midiendo lo pintado.
      backdrop.hidden = false;
      isOpen = true;
      book.classList.remove('registry-book--settled');
      applyLayout();
      paginateToFit();
      close.focus({ preventScroll: true });
      // Si la letra manuscrita aún está llegando, se mide otra vez cuando esté.
      if (document.fonts.status !== 'loaded') {
        void document.fonts.ready.then(() => {
          if (isOpen) relayout(true);
        });
      }
      // Se abre por la tapa y pasa sola a la primera página, o a la primera con algo nuevo.
      const fresh = pages.findIndex(
        (page) =>
          (page.kind === 'thread' && page.entries.some((e) => e.fresh)) ||
          (page.kind === 'learned' && page.facts.some((f) => f.fresh)) ||
          (page.kind === 'world' && page.fresh),
      );
      flip(1, () => {
        if (focus === 'tasks') goToPage(currentTaskPage(pages));
        else if (fresh > 2) goToPage(fresh);
      });
    },
    close() {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizing);
      resizing = 0;
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
