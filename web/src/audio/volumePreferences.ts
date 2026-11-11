// Volúmenes que el jugador elige en Configuración (efectos y ambientes). Se recuerdan entre partidas, aparte del
// progreso, como la tecla M (mutePreference.ts) y los tamaños de letra (accessibility/preferences.ts). Lo leído del
// almacenamiento se valida: lo que no se entiende vuelve al valor por defecto.
import type { KeyValueStore } from '../core/save';

export const VOLUME_KEY = 'bucle-tiempo:volumen';

/** Pasos ofrecidos (0 = callado, 1 = el volumen de diseño). */
export const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;
export type VolumeStep = (typeof VOLUME_STEPS)[number];

export interface VolumePreferences {
  /** Pasos, golpes, nave, portales y demás efectos puntuales. */
  effects: VolumeStep;
  /** Los ambientes de cada mundo (los sintetizados y los bucles largos). */
  ambient: VolumeStep;
}

export const DEFAULT_VOLUMES: Readonly<VolumePreferences> = { effects: 1, ambient: 1 };

function pick(value: unknown, fallback: VolumeStep): VolumeStep {
  return VOLUME_STEPS.find((step) => step === value) ?? fallback;
}

export function loadVolumes(store: KeyValueStore | null): VolumePreferences {
  let raw: unknown;
  try {
    const text = store?.getItem(VOLUME_KEY);
    raw = text ? JSON.parse(text) : undefined;
  } catch {
    raw = undefined;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...DEFAULT_VOLUMES };
  const { effects, ambient } = raw as Record<string, unknown>;
  return {
    effects: pick(effects, DEFAULT_VOLUMES.effects),
    ambient: pick(ambient, DEFAULT_VOLUMES.ambient),
  };
}

/** Devuelve false (sin lanzar) si no se pudo guardar: la preferencia dura solo esta sesión. */
export function saveVolumes(store: KeyValueStore | null, volumes: VolumePreferences): boolean {
  if (!store) return false;
  try {
    store.setItem(VOLUME_KEY, JSON.stringify(volumes));
    return true;
  } catch {
    return false;
  }
}

/** Los volúmenes en vivo: Configuración los cambia y el motor los recibe al instante. */
export interface VolumeSettings {
  readonly current: Readonly<VolumePreferences>;
  update(change: Partial<VolumePreferences>): void;
}

export function createVolumeSettings(
  store: KeyValueStore | null,
  onChange: (volumes: Readonly<VolumePreferences>) => void,
): VolumeSettings {
  let current: Readonly<VolumePreferences> = loadVolumes(store);
  onChange(current);
  return {
    get current() {
      return current;
    },
    update(change) {
      current = { ...current, ...change };
      saveVolumes(store, current);
      onChange(current);
    },
  };
}
