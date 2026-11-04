// Accesibilidad: todo el CSS del juego está en píxeles. Este plugin de PostCSS multiplica cada medida en px por
// `--ui-scale` (escala de toda la interfaz) y los tamaños de letra, además, por `--text-scale`. Así las fuentes de
// verdad siguen en px y las dos escalas se eligen en Configuración (src/accessibility/).
// No toca las consultas @media (no admiten variables) ni los valores con url() (datos incrustados).

import type { Plugin } from 'postcss';

type TextMode = 'all' | 'first' | 'none';

const PX = /(-?\d*\.?\d+)px\b/g;

/** Envuelve cada medida en px en un calc() con las variables de escala. */
export function scaleValue(value: string, textMode: TextMode): string {
  let first = true;
  return value.replace(PX, (_match: string, amount: string) => {
    const withText = textMode === 'all' || (textMode === 'first' && first);
    const text = withText ? ' * var(--text-scale, 1)' : '';
    first = false;
    return `calc(${amount}px * var(--ui-scale, 1)${text})`;
  });
}

/** `font-size` es todo tamaño de letra; en el `font` abreviado solo el primer valor (el tamaño). */
function textModeOf(prop: string): TextMode {
  if (prop === 'font-size') return 'all';
  return prop === 'font' ? 'first' : 'none';
}

export default function uiScale(): Plugin {
  return {
    postcssPlugin: 'postcss-ui-scale',
    Declaration(decl) {
      if (
        decl.value.includes('url(') ||
        decl.prop.startsWith('--ui-') ||
        decl.prop === '--text-scale'
      )
        return;
      if (decl.value.includes('var(--ui-scale')) return; // ya procesado
      if (!PX.test(decl.value)) return;
      PX.lastIndex = 0;
      decl.value = scaleValue(decl.value, textModeOf(decl.prop));
    },
  };
}
