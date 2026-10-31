// La velocidad del texto y el sonido de letras (plan del HUD, decisiones 6 y 7): se eligen en Configuración,
// dentro de la pausa, y se recuerdan entre partidas aparte del progreso, como el silencio (audio/mutePreference.ts).
// Lo leído del almacenamiento se valida campo a campo: lo que no se entiende vuelve a su valor por defecto.
import type { KeyValueStore } from '../core/save';

export const TEXT_PREFERENCES_KEY = 'bucle-tiempo:texto';

export const TEXT_SPEEDS = ['lenta', 'normal', 'rapida', 'instante'] as const;
export type TextSpeed = (typeof TEXT_SPEEDS)[number];

/** Lo que se lee en el botón de cada velocidad. */
export const TEXT_SPEED_LABELS: Readonly<Record<TextSpeed, string>> = {
  lenta: 'Lenta',
  normal: 'Normal',
  rapida: 'Rápida',
  instante: 'Al instante',
};

const LETTERS_PER_SECOND: Readonly<Record<TextSpeed, number>> = {
  lenta: 22,
  normal: 40,
  rapida: 75,
  instante: Infinity,
};

export interface TextPreferences {
  speed: TextSpeed;
  /** Un «bip» por cada par de letras, con el tono de quien habla. */
  letterSound: boolean;
}

export const DEFAULT_TEXT_PREFERENCES: Readonly<TextPreferences> = {
  speed: 'normal',
  letterSound: false,
};

export function lettersPerSecond(speed: TextSpeed): number {
  return LETTERS_PER_SECOND[speed];
}

function isSpeed(value: unknown): value is TextSpeed {
  return (TEXT_SPEEDS as readonly unknown[]).includes(value);
}

export function loadTextPreferences(store: KeyValueStore | null): TextPreferences {
  let raw: unknown;
  try {
    const text = store?.getItem(TEXT_PREFERENCES_KEY);
    raw = text ? JSON.parse(text) : undefined;
  } catch {
    raw = undefined;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_TEXT_PREFERENCES };
  }
  const { speed, letterSound } = raw as Record<string, unknown>;
  return {
    speed: isSpeed(speed) ? speed : DEFAULT_TEXT_PREFERENCES.speed,
    letterSound:
      typeof letterSound === 'boolean' ? letterSound : DEFAULT_TEXT_PREFERENCES.letterSound,
  };
}

/** Devuelve false (sin lanzar) si no se pudo guardar: la preferencia dura solo esta sesión. */
export function saveTextPreferences(store: KeyValueStore | null, prefs: TextPreferences): boolean {
  if (!store) return false;
  try {
    store.setItem(TEXT_PREFERENCES_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/** Las preferencias en vivo: la pausa las cambia y los paneles de texto las leen al empezar cada frase. */
export interface TextSettings {
  readonly current: Readonly<TextPreferences>;
  update(change: Partial<TextPreferences>): void;
  onChange(listener: (prefs: Readonly<TextPreferences>) => void): void;
}

export function createTextSettings(store: KeyValueStore | null): TextSettings {
  let current: Readonly<TextPreferences> = loadTextPreferences(store);
  const listeners: ((prefs: Readonly<TextPreferences>) => void)[] = [];
  return {
    get current() {
      return current;
    },
    update(change) {
      current = { ...current, ...change };
      saveTextPreferences(store, current);
      for (const listener of listeners) listener(current);
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}
