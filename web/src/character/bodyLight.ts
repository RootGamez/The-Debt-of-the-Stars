// La luz del cuerpo del explorador (lógica pura). Los Ool tienen puntos de bioluminiscencia: el explorador puede
// encenderlos a voluntad y alumbrar a su alrededor, en todas direcciones, de azul celeste. Sirve de linterna en los
// sitios oscuros (interiores, cuevas, la cara de noche de un mundo). Se enciende y se apaga con suavidad y late un
// poco, como algo vivo.

export const BODY_LIGHT = {
  /** Azul celeste. */
  color: 0x86d4ff,
  /** Intensidad a pleno (candelas de three). */
  intensity: 3.2,
  /** Hasta dónde llega (m) y cómo cae con la distancia. */
  range: 16,
  decay: 1,
  /** Altura de la luz sobre los pies (m): el pecho. */
  height: 0.8,
  /** Lo deprisa que se enciende y se apaga (1/s). */
  fadeRate: 6,
  /** Cuánto late (fracción) y a qué ritmo (Hz). */
  breath: 0.05,
  breathHz: 0.3,
} as const;

export interface BodyLightState {
  readonly on: boolean;
  /** Cuánto luce ahora (0 apagada, 1 a pleno). */
  readonly level: number;
  /** Segundos encendida o apagada desde que empezó: da la fase del latido. */
  readonly time: number;
}

export function createBodyLight(): BodyLightState {
  return { on: false, level: 0, time: 0 };
}

export function toggleBodyLight(state: BodyLightState): BodyLightState {
  return { ...state, on: !state.on };
}

/** Avanza el fundido hacia encendida o apagada. */
export function stepBodyLight(state: BodyLightState, dt: number): BodyLightState {
  if (!(dt > 0)) return state;
  const target = state.on ? 1 : 0;
  const level = state.level + (target - state.level) * (1 - Math.exp(-BODY_LIGHT.fadeRate * dt));
  const settled = Math.abs(target - level) < 1e-3 ? target : level;
  return { ...state, level: settled, time: state.time + dt };
}

/** Intensidad de la luz (candelas de three) con su latido. */
export function bodyLightIntensity(state: BodyLightState): number {
  if (state.level <= 0) return 0;
  const breath = 1 + BODY_LIGHT.breath * Math.sin(2 * Math.PI * BODY_LIGHT.breathHz * state.time);
  return BODY_LIGHT.intensity * state.level * breath;
}
