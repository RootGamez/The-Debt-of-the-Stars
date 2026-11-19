// Las páginas de tu cuaderno pintadas en un lienzo (F4, la escena del nido: la Maestra lee tu Registro). Es el mismo
// cuaderno que el del Registro (ui/registryPanel.ts y ui/theme.css): papel crema rayado, letra a mano (Caveat), la
// tinta verde que brilla, los títulos en ámbar y las cuentas a lápiz, los croquis de los hechos. Aquí no se inventa
// nada: se pinta la página tal como sale de registry/notebookPages.ts. `wrapLines` es pura (con tests); lo demás
// dibuja en un CanvasRenderingContext2D.
import { t } from '../i18n';
import type { NotebookEntry, NotebookPage } from '../registry/notebookPages';
import { SKETCH_HEIGHT, SKETCH_WIDTH, sketchOf } from './notebookSketches';

/** Los colores del papel y de la tinta (ui/theme.css). */
export const PAPER = {
  paper: '#efe3c8',
  ruled: 'rgba(70, 100, 150, 0.18)',
  ink: '#0f5442',
  inkSoft: 'rgba(15, 84, 66, 0.75)',
  amber: '#9a4a12',
  pencil: '#6d6559',
  glow: 'rgba(166, 240, 201, 0.85)',
  amberGlow: 'rgba(246, 195, 122, 0.6)',
  leather: '#5a3a24',
} as const;

const HAND = "'Caveat', 'Segoe Print', cursive";
/** Proporciones de la página (ui/theme.css y registry/bookLayout.ts), como parte de su alto. */
const FONT_SHARE = 0.041 / 0.75;
const LINE_EM = 1.15;
const PAD_TOP = 0.075;
const PAD_X = 0.085;
const PAD_BOTTOM = 0.06;

/** Parte `text` en renglones que no pasen de `maxWidth` según `measure`, sin cortar palabras (salvo una sola larga). */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current === '' ? word : `${current} ${word}`;
    if (measure(trial) <= maxWidth || current === '') {
      current = trial;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current !== '') lines.push(current);
  return lines;
}

interface Pen {
  ctx: CanvasRenderingContext2D;
  /** Tamaño de la letra (px) y alto del renglón. */
  font: number;
  line: number;
  left: number;
  width: number;
  y: number;
  bottom: number;
}

type Tone = 'ink' | 'amber' | 'pencil' | 'inkSoft';

function setFont(pen: Pen, size: number, weight: 500 | 700): void {
  pen.ctx.font = `${String(weight)} ${String(Math.round(pen.font * size))}px ${HAND}`;
}

function setTone(pen: Pen, tone: Tone): void {
  const { ctx } = pen;
  ctx.fillStyle = PAPER[tone];
  // La tinta brilla (como el halo del cuaderno); el lápiz no.
  ctx.shadowColor = tone === 'amber' ? PAPER.amberGlow : PAPER.glow;
  ctx.shadowBlur = tone === 'pencil' ? 0 : pen.font * 0.22;
}

/** Escribe un párrafo con sangría `indent` (en em); devuelve si cupo entero. */
function write(
  pen: Pen,
  text: string,
  options: {
    size?: number;
    weight?: 500 | 700;
    tone?: Tone;
    indent?: number;
    leading?: number;
  } = {},
): boolean {
  const { size = 1, weight = 500, tone = 'ink', indent = 0, leading = 1 } = options;
  setFont(pen, size, weight);
  setTone(pen, tone);
  const x = pen.left + indent * pen.font;
  const step = pen.line * size * leading;
  for (const row of wrapLines(
    text,
    pen.width - indent * pen.font,
    (s) => pen.ctx.measureText(s).width,
  )) {
    if (pen.y + step > pen.bottom) return false;
    pen.ctx.fillText(row, x, pen.y + step * 0.8);
    pen.y += step;
  }
  return true;
}

function gap(pen: Pen, lines: number): void {
  pen.y += pen.line * lines;
}

/** El punto de tinta de cada hecho, con su brillo. */
function bullet(pen: Pen): void {
  const { ctx } = pen;
  ctx.save();
  ctx.fillStyle = PAPER.ink;
  ctx.shadowColor = PAPER.glow;
  ctx.shadowBlur = pen.font * 0.35;
  ctx.beginPath();
  ctx.arc(pen.left + pen.font * 0.16, pen.y + pen.line * 0.52, pen.font * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Un croquis pegado junto a un hecho (ui/notebookSketches.ts), al 78 % del ancho. */
function sketch(pen: Pen, id: string): void {
  const drawing = sketchOf(id);
  if (!drawing) return;
  const width = pen.width * 0.78;
  const scale = width / SKETCH_WIDTH;
  const height = SKETCH_HEIGHT * scale;
  if (pen.y + height > pen.bottom) return;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(pen.left + (pen.width - width) / 2, pen.y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const shape of drawing.shapes) {
    ctx.shadowBlur = shape.accent === true ? 2 : 0;
    ctx.shadowColor = PAPER.glow;
    if (shape.type === 'path') {
      ctx.strokeStyle = shape.accent === true ? PAPER.ink : PAPER.inkSoft;
      ctx.setLineDash(shape.dashed === true ? [4, 3] : []);
      ctx.stroke(new Path2D(shape.d));
    } else if (shape.type === 'dot') {
      ctx.fillStyle = shape.accent === true ? PAPER.ink : PAPER.inkSoft;
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = shape.accent === true ? PAPER.ink : PAPER.pencil;
      ctx.font = `500 11px ${HAND}`;
      ctx.textAlign =
        shape.anchor === 'start' ? 'left' : shape.anchor === 'end' ? 'right' : 'center';
      ctx.fillText(shape.text, shape.x, shape.y);
    }
  }
  ctx.restore();
  pen.y += height + pen.line * 0.3;
}

function entry(pen: Pen, item: NotebookEntry): void {
  if (item.kind === 'rumor') {
    write(pen, `? ${item.question}`, { tone: 'pencil' });
    gap(pen, 0.4);
    return;
  }
  bullet(pen);
  write(pen, item.line, { indent: 0.9 });
  if (item.sketch !== undefined) sketch(pen, item.sketch);
  if (item.related.length > 0) {
    write(pen, t('Ver también'), { size: 0.75, tone: 'pencil', indent: 0.9 });
    for (const related of item.related) {
      write(pen, related, { size: 0.85, tone: 'inkSoft', indent: 1.5 });
    }
  }
  gap(pen, 0.4);
}

/** Lo escrito de cada clase de página, como en el Registro. */
function content(pen: Pen, page: NotebookPage): void {
  const title = (text: string, part = 0): void => {
    write(pen, part > 0 ? `${text} (${t('sigue')})` : text, {
      size: 1.35,
      weight: 700,
      tone: 'amber',
      leading: 1.05 / LINE_EM,
    });
    gap(pen, 0.45);
  };
  const count = (text: string): void => {
    write(pen, text, { size: 0.82, tone: 'pencil' });
    gap(pen, 0.45);
  };
  switch (page.kind) {
    case 'flyleaf':
      gap(pen, 6);
      write(pen, t('Si lo encuentras: aquí está todo lo que he aprendido.'), { tone: 'pencil' });
      return;
    case 'known':
      title(t('Lo que sé'), page.part);
      count(t('{total} hechos anotados', { total: page.totalFacts }));
      if (page.conclusions.length === 0 && page.part === 0) {
        write(pen, t('Todavía no sé nada con certeza.'), { tone: 'pencil' });
      }
      for (const conclusion of page.conclusions) {
        write(pen, conclusion, { tone: 'amber' });
        gap(pen, 0.45);
      }
      return;
    case 'thread': {
      // La raya a lápiz sobre cada pregunta.
      const { ctx } = pen;
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 84, 66, 0.14)';
      ctx.lineWidth = Math.max(1, pen.font * 0.05);
      ctx.beginPath();
      ctx.moveTo(pen.left, pen.y + pen.line * 0.2);
      ctx.lineTo(pen.left + pen.width, pen.y + pen.line * 0.2);
      ctx.stroke();
      ctx.restore();
      gap(pen, 0.7);
      title(page.question, page.part);
      count(t('{known} de {total} hechos', { known: page.known, total: page.total }));
      if (page.entries.length === 0)
        write(pen, t('Todavía no sé nada sobre esto.'), { tone: 'pencil' });
      for (const item of page.entries) entry(pen, item);
      return;
    }
    case 'deduction':
      title(page.deduction.title, page.part);
      for (const piece of page.pieces) {
        write(pen, `${piece.met ? '✓' : '?'} ${piece.line}`, {
          tone: piece.met ? 'ink' : 'pencil',
        });
        gap(pen, 0.4);
      }
      return;
    case 'worlds':
      title(t('Bitácora de mundos'), page.part);
      for (const world of page.worlds) {
        write(pen, `${world.name} · ${t('p.')} ${String(world.page)}`);
        gap(pen, 0.3);
      }
      return;
    case 'world':
      title(page.world.name, page.part);
      for (const fact of page.facts) {
        bullet(pen);
        write(pen, fact.line, { indent: 0.9 });
        gap(pen, 0.4);
      }
      return;
    case 'tasks':
    case 'learned':
    case 'cover':
    case 'blank':
    case 'back':
      return;
  }
}

/** El papel: crema, con grano y renglones azulados desde el margen de arriba. */
function paper(ctx: CanvasRenderingContext2D, width: number, height: number, line: number): void {
  ctx.fillStyle = PAPER.paper;
  ctx.fillRect(0, 0, width, height);
  // Grano fijo (siempre el mismo): motas pardas muy suaves.
  let seed = 7;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let k = 0; k < 2600; k++) {
    ctx.fillStyle = `rgba(82, 56, 26, ${(0.03 + random() * 0.06).toFixed(3)})`;
    ctx.fillRect(random() * width, random() * height, 1 + random() * 1.5, 1 + random() * 1.5);
  }
  ctx.strokeStyle = PAPER.ruled;
  ctx.lineWidth = Math.max(1, line * 0.04);
  for (let y = height * PAD_TOP + line; y < height - 2; y += line) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
    ctx.stroke();
  }
}

/**
 * Pinta la página `page` (la número `number` del cuaderno) en todo el lienzo: el papel, lo escrito y el número de
 * página. Una página que no existe se queda en blanco; la tapa, de cuero.
 */
export function drawNotebookPage(
  ctx: CanvasRenderingContext2D,
  page: NotebookPage | undefined,
  number: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (page?.kind === 'cover' || page?.kind === 'back') {
    ctx.fillStyle = PAPER.leather;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }
  const font = height * FONT_SHARE;
  const line = font * LINE_EM;
  paper(ctx, width, height, line);
  const left = width * PAD_X;
  const pen: Pen = {
    ctx,
    font,
    line,
    left,
    width: width - left * 2,
    y: height * PAD_TOP,
    bottom: height * (1 - PAD_BOTTOM) - line,
  };
  if (page) content(pen, page);
  // El número, abajo, hacia fuera (las impares a la izquierda del libro).
  if (page && page.kind !== 'blank' && number > 0) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = PAPER.pencil;
    ctx.font = `500 ${String(Math.round(font * 0.8))}px ${HAND}`;
    ctx.textAlign = number % 2 === 1 ? 'left' : 'right';
    ctx.fillText(
      String(number),
      number % 2 === 1 ? left : width - left,
      height - height * PAD_BOTTOM * 0.5,
    );
  }
  ctx.restore();
}
