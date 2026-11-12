// El tamaño del cuaderno según la pantalla y las escalas de accesibilidad. Un cuaderno de verdad no encoge la letra
// para que quepa más: con la letra más grande, o en una pantalla pequeña, cabe menos en cada página y lo escrito
// ocupa más páginas. De aquí sale cuánto mide cada página, con qué letra se escribe y cuántos renglones y letras
// caben (`PageFit`), que es lo que usa notebookPages.ts para repartir. Pura: el panel solo aplica lo que sale.

/** Lo que cabe en una página, en renglones y en letras por renglón. */
export interface PageFit {
  /** Renglones de texto normal que caben de arriba abajo. */
  lines: number;
  /** Letras que caben en un renglón. */
  chars: number;
  /** Renglones que ocupa un croquis pegado junto a un hecho. */
  sketchLines: number;
  /** Renglones que ocupa el dibujo de un mundo. */
  photoLines: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** Las escalas de Configuración (1 = tamaño de diseño). */
  uiScale: number;
  textScale: number;
}

export interface BookLayout {
  /** Dónde van las flechas y Cerrar: debajo del libro o, si la pantalla es baja, a los lados. */
  chrome: 'below' | 'sides';
  /** Una sola página a la vista (no caben dos legibles). */
  single: boolean;
  pageWidth: number;
  pageHeight: number;
  /** Tamaño de la letra (px). */
  font: number;
  /** Alto de un renglón (px). */
  line: number;
  padX: number;
  padTop: number;
  padBottom: number;
  /** Ancho del dibujo de un mundo (px): no ocupa más de media página. */
  photoWidth: number;
  fit: PageFit;
}

/** El ancho medio de una letra de la fuente manuscrita, en em (con lo que se pierde al cortar por palabras). */
export const CHAR_EM = 0.4;
/** Alto de renglón del cuaderno (em). */
export const LINE_EM = 1.15;
/** Las proporciones de los croquis (ui/notebookSketches.ts: 200 × 130) y cuánto ancho de página ocupan. */
const SKETCH_RATIO = 130 / 200;
const SKETCH_SHARE = 0.78;
/** El dibujo de un mundo es 4:3, con su marco de foto, y ocupa como mucho este ancho y esta parte del alto. */
const PHOTO_SHARE = 0.72;
const PHOTO_MAX_HEIGHT = 0.45;
/** La página de diseño es 3:4; puede ser más alta (hasta 0,62) o más ancha según la pantalla. */
const PAGE_RATIO = 0.75;
const MIN_RATIO = 0.62;
const MAX_RATIO_DOUBLE = 1.15;
const MAX_RATIO_SINGLE = 1.7;
/** Con menos letras por renglón que estas, la página se ensancha si hay sitio. */
const COMFORT_CHARS = 34;
/** Con menos que estas a doble página, se enseña una sola. */
const MIN_CHARS = 20;
/** Por debajo de este alto (de diseño), las flechas van a los lados para que el libro ocupe todo el alto. */
const LOW_SCREEN = 600;
/** Medidas de diseño (px, se multiplican por la escala de la interfaz). */
const MIN_FONT = 15;
const BUTTON = 44;
const MARGIN = 16;
const MARGIN_LOW = 8;
const BAR_GAP = 14;
const SIDE_GAP = 10;
const TAB_MIN = 26;
/** La letra de diseño y las pestañas, como parte del ancho de la página. */
const FONT_SHARE = 0.041;
const TAB_SHARE = 0.064;

interface Candidate {
  width: number;
  height: number;
  font: number;
  padX: number;
  chars: number;
}

/** La letra crece con la página (de diseño, 3:4); en una página ancha y baja manda el alto. */
function fontOf(pageWidth: number, pageHeight: number, v: Viewport): number {
  const drawn = FONT_SHARE * Math.min(pageWidth, pageHeight * PAGE_RATIO);
  return Math.max(MIN_FONT * v.uiScale, drawn) * v.textScale;
}

function padOf(pageWidth: number, font: number, v: Viewport): number {
  return Math.max(10 * v.uiScale, Math.min(0.096 * pageWidth, 2.4 * font));
}

/** El ancho que queda para escribir: el lomo se come un poco más que el canto. */
function textWidthOf(pageWidth: number, padX: number): number {
  return pageWidth - 2.08 * padX;
}

function measure(width: number, height: number, v: Viewport): Candidate {
  const font = fontOf(width, height, v);
  const padX = padOf(width, font, v);
  return { width, height, font, padX, chars: textWidthOf(width, padX) / (font * CHAR_EM) };
}

/** La mejor página con `across` páginas a la vista en el sitio que queda. */
function fitPages(across: 1 | 2, availW: number, availH: number, v: Viewport): Candidate {
  const maxWidth = Math.max(
    80,
    Math.min((availW - TAB_MIN * v.uiScale) / across, availW / (across + TAB_SHARE)),
  );
  const height = Math.max(80, availH);
  let best = measure(Math.min(maxWidth, height * PAGE_RATIO), height, v);
  // Pocas letras por renglón: se ensancha la página mientras quede sitio.
  const widest = Math.min(maxWidth, height * (across === 1 ? MAX_RATIO_SINGLE : MAX_RATIO_DOUBLE));
  for (let width = best.width + 4; best.chars < COMFORT_CHARS && width <= widest + 4; width += 4) {
    const wider = measure(Math.min(width, widest), height, v);
    if (wider.chars <= best.chars) break;
    best = wider;
  }
  // Estrecha y alta (una ventana delgada): no más alargada que una libreta de bolsillo.
  if (best.width < height * MIN_RATIO) best = measure(best.width, best.width / MIN_RATIO, v);
  return best;
}

export function bookLayout(v: Viewport): BookLayout {
  const ui = v.uiScale;
  const chrome = v.height < LOW_SCREEN * ui ? 'sides' : 'below';
  const availW =
    chrome === 'sides'
      ? v.width - 2 * MARGIN_LOW * ui - 2 * (BUTTON + SIDE_GAP) * ui
      : v.width - 2 * MARGIN * ui;
  const availH =
    chrome === 'sides'
      ? v.height - 2 * MARGIN_LOW * ui
      : v.height - 2 * MARGIN * ui - (BUTTON + BAR_GAP) * ui;
  const double = fitPages(2, availW, availH, v);
  const single = double.chars < MIN_CHARS;
  const page = single ? fitPages(1, availW, availH, v) : double;

  const line = page.font * LINE_EM;
  const padTop = page.padX * 1.15;
  const padBottom = Math.max(page.padX, page.font * 1.2);
  const textWidth = textWidthOf(page.width, page.padX);
  const textHeight = page.height - padTop - padBottom;
  // El marco de la foto añade un poco arriba y bastante abajo (como una instantánea).
  const frame = 0.05 * page.width;
  const photoWidth = Math.max(
    40,
    Math.min(PHOTO_SHARE * textWidth, ((textHeight * PHOTO_MAX_HEIGHT - frame) * 4) / 3),
  );
  const fit: PageFit = {
    lines: Math.max(3, textHeight / line),
    chars: Math.max(8, page.chars),
    sketchLines: (SKETCH_SHARE * textWidth * SKETCH_RATIO) / line + 0.5,
    photoLines: (photoWidth * 0.75 + frame) / line + 0.9,
  };
  return {
    chrome,
    single,
    pageWidth: Math.round(page.width),
    pageHeight: Math.round(page.height),
    font: page.font,
    line,
    padX: page.padX,
    padTop,
    padBottom,
    photoWidth,
    fit,
  };
}

/** La página de diseño (un portátil al 100 %): lo que se usa cuando no hay pantalla que medir (tests). */
export const DESIGN_FIT: PageFit = bookLayout({
  width: 1366,
  height: 768,
  uiScale: 1,
  textScale: 1,
}).fit;

/** Si lo medido no cabe, se reparte otra vez con algo menos de sitio por página. */
export function tighter(fit: PageFit): PageFit {
  return { ...fit, lines: Math.max(3, fit.lines * 0.85) };
}
