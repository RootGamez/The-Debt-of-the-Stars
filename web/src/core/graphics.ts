// Los gráficos que el jugador elige en Configuración: un modo básico (Automático, Bajo, Medio, Alto) y, debajo, cada
// detalle por separado (sombras, eclipses, resolución, suavizado de bordes y portales). Se recuerdan entre partidas,
// aparte del progreso, y lo leído del almacenamiento se valida: lo que no se entiende vuelve al valor por defecto.
import type { KeyValueStore } from './save';

export const GRAPHICS_KEY = 'bucle-tiempo:graficos';

/** Tamaños del mapa de la sombra de la estrella (0 = sin sombra). */
export const SHADOW_SIZES = [0, 512, 1024, 2048] as const;
export type ShadowSize = (typeof SHADOW_SIZES)[number];

/** Resolución interna respecto a la de la pantalla (tope; nunca más que la real del dispositivo). */
export const PIXEL_RATIOS = [0.75, 1, 1.25, 1.5] as const;
export type PixelRatio = (typeof PIXEL_RATIOS)[number];

export interface GraphicsDetails {
  /** Mapa de la sombra de la estrella: 0 la apaga. */
  shadowSize: ShadowSize;
  /** Sombras de cuerpos lejanos (eclipses): una cascada más y el filtro más caro. */
  eclipseShadows: boolean;
  pixelRatio: PixelRatio;
  /** Suavizado de bordes (MSAA). Se decide al crear el contexto: cambiarlo recarga la página. */
  antialias: boolean;
  /** Los portales se dibujan a media resolución (el pase extra de la escena cuesta la mitad). */
  halfResPortals: boolean;
}

/** Los modos que se eligen; «custom» es el que queda al tocar un detalle suelto. */
export const GRAPHICS_PRESETS = ['auto', 'bajo', 'medio', 'alto'] as const;
export type ChosenPreset = (typeof GRAPHICS_PRESETS)[number];
export type GraphicsPreset = ChosenPreset | 'custom';

export interface GraphicsPreferences {
  preset: GraphicsPreset;
  /** Escalón en el que dejó el modo automático la última vez (null: el que toque por el dispositivo). */
  autoLevel: number | null;
  /** Los detalles del modo personalizado. */
  custom: GraphicsDetails;
}

/** Del mejor (0) al más modesto: el modo automático baja por esta escalera. */
const LEVELS: readonly Omit<GraphicsDetails, 'antialias'>[] = [
  { shadowSize: 2048, eclipseShadows: true, pixelRatio: 1.5, halfResPortals: false },
  { shadowSize: 1024, eclipseShadows: true, pixelRatio: 1.25, halfResPortals: true },
  { shadowSize: 512, eclipseShadows: false, pixelRatio: 1, halfResPortals: true },
  { shadowSize: 0, eclipseShadows: false, pixelRatio: 0.75, halfResPortals: true },
];

export const AUTO_LEVELS = LEVELS.length;

/** Escalón y suavizado de cada modo fijo. */
const PRESET_LEVELS: Readonly<
  Record<Exclude<ChosenPreset, 'auto'>, { level: number; aa: boolean }>
> = {
  alto: { level: 0, aa: true },
  medio: { level: 1, aa: true },
  bajo: { level: 2, aa: false },
};

export interface GraphicsEnv {
  touch: boolean;
}

function levelDetails(level: number, antialias: boolean): GraphicsDetails {
  const clamped = Math.min(Math.max(Math.trunc(level), 0), LEVELS.length - 1);
  return { ...(LEVELS[clamped] as (typeof LEVELS)[number]), antialias };
}

/** Por dónde empieza el modo automático: un móvil, a medio; el resto, a tope (y baja si hace falta). */
export function defaultAutoLevel(env: GraphicsEnv): number {
  return env.touch ? 1 : 0;
}

/** Los detalles de un modo fijo. */
export function presetDetails(preset: Exclude<ChosenPreset, 'auto'>): GraphicsDetails {
  const { level, aa } = PRESET_LEVELS[preset];
  return levelDetails(level, aa);
}

export function defaultPreferences(): GraphicsPreferences {
  return { preset: 'auto', autoLevel: null, custom: presetDetails('medio') };
}

/** Lo que de verdad se aplica con estas preferencias. */
export function detailsOf(prefs: Readonly<GraphicsPreferences>, env: GraphicsEnv): GraphicsDetails {
  switch (prefs.preset) {
    case 'auto':
      return levelDetails(prefs.autoLevel ?? defaultAutoLevel(env), !env.touch);
    case 'custom':
      return { ...prefs.custom };
    default:
      return presetDetails(prefs.preset);
  }
}

const pick = <T>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.find((item) => item === value) ?? fallback;

function readDetails(raw: unknown, fallback: GraphicsDetails): GraphicsDetails {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...fallback };
  const r = raw as Record<string, unknown>;
  return {
    shadowSize: pick(SHADOW_SIZES, r.shadowSize, fallback.shadowSize),
    eclipseShadows: pick([true, false], r.eclipseShadows, fallback.eclipseShadows),
    pixelRatio: pick(PIXEL_RATIOS, r.pixelRatio, fallback.pixelRatio),
    antialias: pick([true, false], r.antialias, fallback.antialias),
    halfResPortals: pick([true, false], r.halfResPortals, fallback.halfResPortals),
  };
}

export function loadGraphics(store: KeyValueStore | null): GraphicsPreferences {
  const defaults = defaultPreferences();
  let raw: unknown;
  try {
    const text = store?.getItem(GRAPHICS_KEY);
    raw = text ? JSON.parse(text) : undefined;
  } catch {
    raw = undefined;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return defaults;
  const r = raw as Record<string, unknown>;
  const level = r.autoLevel;
  return {
    preset: pick<GraphicsPreset>([...GRAPHICS_PRESETS, 'custom'], r.preset, defaults.preset),
    autoLevel:
      typeof level === 'number' && Number.isInteger(level) && level >= 0 && level < AUTO_LEVELS
        ? level
        : null,
    custom: readDetails(r.custom, defaults.custom),
  };
}

/** Devuelve false (sin lanzar) si no se pudo guardar: la preferencia dura solo esta sesión. */
export function saveGraphics(
  store: KeyValueStore | null,
  prefs: Readonly<GraphicsPreferences>,
): boolean {
  if (!store) return false;
  try {
    store.setItem(GRAPHICS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/** Lo que cambia entre dos juegos de detalles y no se puede aplicar sin recargar la página. */
export function requiresReload(
  started: Readonly<GraphicsDetails>,
  next: Readonly<GraphicsDetails>,
  shadowReady: boolean,
): boolean {
  // Las sombras que nacieron apagadas no tienen sus materiales preparados para recibirlas.
  return started.antialias !== next.antialias || (!shadowReady && next.shadowSize > 0);
}

/** Los gráficos en vivo: Configuración los cambia y el juego los recibe al instante. */
export interface GraphicsSettings {
  readonly preferences: Readonly<GraphicsPreferences>;
  /** Lo que se aplica ahora (resuelto el modo). */
  readonly details: Readonly<GraphicsDetails>;
  /** Hay algo elegido que solo se aplica al recargar. */
  readonly needsReload: boolean;
  choosePreset(preset: ChosenPreset): void;
  /** Cambia un detalle: el modo pasa a ser personalizado, partiendo de lo que había. */
  setDetail(change: Partial<GraphicsDetails>): void;
  /** El modo automático baja un escalón; false si no es automático o ya está en el más modesto. */
  stepDown(): boolean;
  /** El juego dice si las sombras están preparadas (sus materiales ya las reciben). */
  setShadowReady(ready: boolean): void;
  /** Se avisa ya con lo actual y después en cada cambio. */
  subscribe(listener: (details: Readonly<GraphicsDetails>) => void): void;
}

export function createGraphicsSettings(
  store: KeyValueStore | null,
  env: GraphicsEnv,
): GraphicsSettings {
  let prefs: Readonly<GraphicsPreferences> = loadGraphics(store);
  const started = detailsOf(prefs, env);
  let shadowReady = started.shadowSize > 0;
  const listeners: ((details: Readonly<GraphicsDetails>) => void)[] = [];

  const current = (): GraphicsDetails => detailsOf(prefs, env);
  const apply = (next: Readonly<GraphicsPreferences>): void => {
    prefs = next;
    saveGraphics(store, prefs);
    const details = current();
    for (const listener of listeners) listener(details);
  };

  return {
    get preferences() {
      return prefs;
    },
    get details() {
      return current();
    },
    get needsReload() {
      return requiresReload(started, current(), shadowReady);
    },
    choosePreset(preset) {
      apply({ ...prefs, preset, autoLevel: preset === 'auto' ? null : prefs.autoLevel });
    },
    setDetail(change) {
      apply({ ...prefs, preset: 'custom', custom: { ...current(), ...change } });
    },
    stepDown() {
      if (prefs.preset !== 'auto') return false;
      const level = prefs.autoLevel ?? defaultAutoLevel(env);
      if (level >= AUTO_LEVELS - 1) return false;
      apply({ ...prefs, autoLevel: level + 1 });
      return true;
    },
    setShadowReady(ready) {
      shadowReady = ready;
    },
    subscribe(listener) {
      listeners.push(listener);
      listener(current());
    },
  };
}
