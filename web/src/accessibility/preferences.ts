// Accesibilidad: el tamaño de la interfaz y de las letras (para quien ve poco). Se eligen en Configuración, dentro de
// la pausa, y se recuerdan entre partidas aparte del progreso, como la velocidad del texto (typewriter/textPreferences.ts).
// El CSS usa px y un plugin de PostCSS (scripts/postcss-ui-scale.ts) los multiplica por `--ui-scale` y, en las
// letras, también por `--text-scale`. Lo leído del almacenamiento se valida: lo que no se entiende vuelve al valor por defecto.
import type { KeyValueStore } from '../core/save';

export const ACCESSIBILITY_KEY = 'bucle-tiempo:accesibilidad';

/** Escalas ofrecidas (1 = tamaño de diseño). */
export const UI_SCALES = [1, 1.25, 1.5, 1.75, 2] as const;
export const TEXT_SCALES = [1, 1.25, 1.5, 2] as const;
export type UiScale = (typeof UI_SCALES)[number];
export type TextScale = (typeof TEXT_SCALES)[number];

export interface AccessibilityPreferences {
  uiScale: UiScale;
  textScale: TextScale;
}

export const DEFAULT_ACCESSIBILITY: Readonly<AccessibilityPreferences> = {
  uiScale: 1,
  textScale: 1,
};

/** Lo que se sabe de la pantalla para elegir el tamaño de partida. */
export interface ScreenInfo {
  touch: boolean;
  /** Alto útil en px (en horizontal, el de un teléfono ronda 360–430). */
  height: number;
}

/** Un teléfono de lado (táctil y bajo) arranca con la interfaz al 125 %; lo que se guardó siempre manda. */
export function defaultAccessibility(screen: ScreenInfo): AccessibilityPreferences {
  return screen.touch && screen.height < 500
    ? { uiScale: 1.25, textScale: 1 }
    : { ...DEFAULT_ACCESSIBILITY };
}

function pick<T extends number>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.find((option) => option === value) ?? fallback;
}

export function loadAccessibility(
  store: KeyValueStore | null,
  screen?: ScreenInfo,
): AccessibilityPreferences {
  const fallback = screen ? defaultAccessibility(screen) : { ...DEFAULT_ACCESSIBILITY };
  let raw: unknown;
  try {
    const text = store?.getItem(ACCESSIBILITY_KEY);
    raw = text ? JSON.parse(text) : undefined;
  } catch {
    raw = undefined;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fallback;
  }
  const { uiScale, textScale } = raw as Record<string, unknown>;
  return {
    uiScale: pick(UI_SCALES, uiScale, fallback.uiScale),
    textScale: pick(TEXT_SCALES, textScale, fallback.textScale),
  };
}

/** Devuelve false (sin lanzar) si no se pudo guardar: la preferencia dura solo esta sesión. */
export function saveAccessibility(
  store: KeyValueStore | null,
  prefs: AccessibilityPreferences,
): boolean {
  if (!store) return false;
  try {
    store.setItem(ACCESSIBILITY_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/** Lo mínimo del elemento raíz que se toca (permite probarlo sin DOM). */
export interface StyleTarget {
  setProperty(name: string, value: string): void;
}

/** Pone las dos escalas como variables CSS. */
export function applyAccessibility(target: StyleTarget, prefs: AccessibilityPreferences): void {
  target.setProperty('--ui-scale', String(prefs.uiScale));
  target.setProperty('--text-scale', String(prefs.textScale));
}

/** Las preferencias en vivo: Configuración las cambia y se aplican al instante. */
export interface AccessibilitySettings {
  readonly current: Readonly<AccessibilityPreferences>;
  update(change: Partial<AccessibilityPreferences>): void;
}

export function createAccessibilitySettings(
  store: KeyValueStore | null,
  target: StyleTarget,
  screen?: ScreenInfo,
): AccessibilitySettings {
  let current: Readonly<AccessibilityPreferences> = loadAccessibility(store, screen);
  applyAccessibility(target, current);
  return {
    get current() {
      return current;
    },
    update(change) {
      current = { ...current, ...change };
      saveAccessibility(store, current);
      applyAccessibility(target, current);
    },
  };
}
