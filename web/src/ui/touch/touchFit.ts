// Los controles táctiles se ajustan a la pantalla. El CSS da los tamaños en px y `--ui-scale` (accesibilidad) los
// multiplica; aquí se calcula `--touch-fit`, un factor que sale del alto y el ancho reales de la ventana y que
// los botones, su separación y sus márgenes también multiplican: encogen en un teléfono bajo, y crecen un poco en
// una tableta. El suelo de 44 px (zona de toque mínima) lo pone el CSS. Todo puro: se prueba sin DOM.

/** Alto de pantalla (px) en el que los botones tienen su tamaño de diseño. */
const REFERENCE_HEIGHT = 430;
/** Ancho (px) en el que los botones tienen su tamaño de diseño. */
const REFERENCE_WIDTH = 760;

export const MIN_FIT = 0.72;
export const MAX_FIT = 1.15;

/** Por debajo de este ancho o alto (px) no caben los rótulos de los botones: quedan solo los iconos. */
const ICONS_ONLY_WIDTH = 620;
const ICONS_ONLY_HEIGHT = 340;

/** Lo mínimo del elemento raíz que se toca (permite probarlo sin DOM). */
export interface FitTarget {
  setProperty(name: string, value: string): void;
}

/** El factor de tamaño de los controles para una ventana de `width` × `height` px. */
export function touchFit(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1;
  const fit = Math.min(height / REFERENCE_HEIGHT, width / REFERENCE_WIDTH);
  return Math.min(MAX_FIT, Math.max(MIN_FIT, fit));
}

/** ¿Es una pantalla tan pequeña que los botones con rótulo deben quedarse solo con el icono? */
export function needsIconsOnly(width: number, height: number): boolean {
  return width < ICONS_ONLY_WIDTH || height < ICONS_ONLY_HEIGHT;
}

/** Pone el factor como variable CSS (`--touch-fit`). */
export function applyTouchFit(target: FitTarget, width: number, height: number): void {
  target.setProperty('--touch-fit', touchFit(width, height).toFixed(3));
}
