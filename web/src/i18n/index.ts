// Idiomas del juego (español e inglés). El texto en español del código es la clave: `t('Volver')` devuelve «Volver»
// en español y su traducción de `en.ts` en inglés; lo que no esté traducido se ve en español (nunca una clave rota).
// Los datos narrativos (pistas, finales) se traducen aparte, en `src/i18n/clues.en.ts`.
// Cambiar de idioma recarga la página: así ningún panel ya dibujado se queda a medias (el progreso está guardado).
import type { KeyValueStore } from '../core/save';
import { EN } from './en';

export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_KEY = 'bucle-tiempo:idioma';

/** Cómo se llama cada idioma en su propio idioma (así se reconoce aunque no se entienda el actual). */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  es: 'Español',
  en: 'English',
};

export type Params = Readonly<Record<string, string | number>>;

function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value);
}

/** El primer idioma del navegador que tengamos (español o inglés); si no, inglés. */
export function languageFromNavigator(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}

/** El idioma elegido, o el del navegador si aún no se eligió ninguno. */
export function loadLanguage(store: KeyValueStore | null, preferred: readonly string[]): Language {
  try {
    const saved = store?.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Almacenamiento bloqueado: se usa el idioma del navegador.
  }
  return languageFromNavigator(preferred);
}

/** Devuelve false (sin lanzar) si no se pudo guardar: el idioma dura solo esta sesión. */
export function saveLanguage(store: KeyValueStore | null, language: Language): boolean {
  if (!store) return false;
  try {
    store.setItem(LANGUAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
}

/** En el navegador, el idioma se decide al cargar este módulo (antes que las tablas de datos que ya usan `t()`). */
function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'es';
  let store: KeyValueStore | null = null;
  try {
    store = window.localStorage;
  } catch {
    // Sin almacenamiento: se usa el idioma del navegador.
  }
  return loadLanguage(store, navigator.languages);
}

let current: Language = initialLanguage();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language): void {
  current = language;
}

/** Rellena los `{huecos}` de un texto; un hueco sin valor se queda tal cual. */
export function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (hole, name: string) => {
    const value = params[name];
    return value === undefined ? hole : String(value);
  });
}

/** Traduce un texto escrito en español. */
export function t(spanish: string, params?: Params): string {
  const text = current === 'en' ? (EN[spanish] ?? spanish) : spanish;
  return fill(text, params);
}

/** Elige entre el singular y el plural según el idioma: `plural(n, 'día', 'días')`; en inglés, `plural(n, 'day', 'days')`. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? t(one) : t(many);
}
